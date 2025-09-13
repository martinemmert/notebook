import { describe, it, expect } from 'vitest';
import { OutlineDocument, OutlineNode } from '../../src/types.js';
import { OutlineDataManager } from '../../src/outlineDataManager.js';
import { RealtimeManager } from '../../src/realtime.js';
import { SyncManager } from '../../src/sync.js';

const fixedNow = '2020-01-01T00:00:00.000Z';
const makeClock = () => ({ nowIso: () => fixedNow });
const makeIdGen = () => ({ uuid: () => 'id-x' });

const n = (id: string, parentId: string | null, order: number, depth: number): OutlineNode => ({
  id,
  parentId,
  content: id,
  order,
  depth,
  createdAt: fixedNow,
  updatedAt: fixedNow,
  version: 0,
});

const makeDoc = (nodes: OutlineNode[] = []): OutlineDocument => ({
  id: 'doc1',
  title: 'Test',
  nodes,
  version: 0,
  lastSyncedVersion: 0,
  createdAt: fixedNow,
  updatedAt: fixedNow,
});

describe('Error handling', () => {
  it('createNode rejects invalid parentId', async () => {
    const mgr = new OutlineDataManager(makeDoc([]), { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.createNode({ parentId: 'missing', content: 'x', position: 'last' });
    expect(res.success).toBe(false);
  });

  it('deleteNode handles non-existent node gracefully', async () => {
    const mgr = new OutlineDataManager(makeDoc([]), { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.deleteNode({ nodeId: 'missing', strategy: 'deleteSubtree' });
    expect(res.success).toBe(false);
  });

  it('updateContent handles version conflicts with LWW default (accept local increment)', async () => {
    const doc = makeDoc([n('a', null, 0, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    // simulate local version 0, update with stale remote version param 0
    const res = await mgr.updateContent({ nodeId: 'a', content: 'x', version: 0 });
    expect(res.success).toBe(true);
    expect(res.node!.version).toBe(1);
  });
});
