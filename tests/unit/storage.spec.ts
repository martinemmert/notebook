import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { StorageManager } from '../../src/storage.js';
import { OutlineDocument, OutlineNode } from '../../src/types.js';

const fixedNow = '2020-01-01T00:00:00.000Z';
const n = (id: string, parentId: string | null, order: number, depth: number): OutlineNode => ({
  id, parentId, content: id, order, depth, createdAt: fixedNow, updatedAt: fixedNow, version: 0,
});
const doc = (nodes: OutlineNode[]): OutlineDocument => ({ id: 'd1', title: 'Doc', nodes, version: 1, lastSyncedVersion: 0, createdAt: fixedNow, updatedAt: fixedNow });

let originalIndexedDB: any;

beforeEach(() => {
  originalIndexedDB = (globalThis as any).indexedDB;
});

afterEach(() => {
  (globalThis as any).indexedDB = originalIndexedDB;
});

describe('StorageManager with IndexedDB', () => {
  it('saves, loads, deletes a document', async () => {
    const sm = new StorageManager();
    const d = doc([n('a', null, 0, 0)]);
    const save = await sm.save(d);
    expect(save.success).toBe(true);

    const loaded = await sm.load(d.id);
    expect(loaded.success).toBe(true);
    expect(loaded.document!.id).toBe(d.id);

    const del = await sm.delete(d.id);
    expect(del.success).toBe(true);

    const missing = await sm.load(d.id);
    expect(missing.success).toBe(false);
  });

  it('backs up and lists backups', async () => {
    const sm = new StorageManager();
    const d = doc([n('a', null, 0, 0)]);
    await sm.save(d);
    await sm.backup(d);
    await sm.backup(d);
    const infos = await sm.listBackups(d.id);
    expect(infos.length).toBe(2);
    expect(infos[0].documentId).toBe(d.id);
  });
});

describe('StorageManager fallback when IndexedDB is unavailable', () => {
  it('falls back to in-memory/local and can save/load', async () => {
    // simulate no indexedDB
    (globalThis as any).indexedDB = undefined;
    const sm = new StorageManager();
    const d = doc([n('x', null, 0, 0)]);
    const save = await sm.save(d);
    expect(save.success).toBe(true);
    const loaded = await sm.load(d.id);
    expect(loaded.success).toBe(true);
    expect(loaded.document!.id).toBe(d.id);
  });
});
