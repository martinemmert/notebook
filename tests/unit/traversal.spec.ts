import { describe, it, expect } from 'vitest';
import { OutlineNode, OutlineDocument } from '../../src/types.js';
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

describe('Traversal', () => {
  it('getHierarchy returns ancestors in correct order', () => {
    const a = n('a', null, 0, 0);
    const b = n('b', 'a', 0, 1);
    const c = n('c', 'b', 0, 2);
    const mgr = new OutlineDataManager(makeDoc([a, b, c]), { realtime: new RealtimeManager(), sync: new SyncManager('c1'), id: makeIdGen(), clock: makeClock() });
    const res = mgr.getHierarchy({ nodeId: 'c', direction: 'ancestors' });
    expect(res.success).toBe(true);
    expect(res.nodes!.map(n => n.id)).toEqual(['a', 'b']);
  });

  it('getHierarchy returns descendants depth-first', () => {
    const a = n('a', null, 0, 0);
    const b = n('b', 'a', 0, 1);
    const c = n('c', 'a', 1, 1);
    const d = n('d', 'b', 0, 2);
    const mgr = new OutlineDataManager(makeDoc([a, b, c, d]), { realtime: new RealtimeManager(), sync: new SyncManager('c1'), id: makeIdGen(), clock: makeClock() });
    const res = mgr.getHierarchy({ nodeId: 'a', direction: 'descendants' });
    expect(res.success).toBe(true);
    expect(res.nodes!.map(n => n.id)).toEqual(['b', 'd', 'c']);
  });

  it('getHierarchy returns siblings in order', () => {
    const a = n('a', null, 0, 0);
    const b = n('b', null, 1, 0);
    const c = n('c', null, 2, 0);
    const mgr = new OutlineDataManager(makeDoc([a, b, c]), { realtime: new RealtimeManager(), sync: new SyncManager('c1'), id: makeIdGen(), clock: makeClock() });
    const res = mgr.getHierarchy({ nodeId: 'b', direction: 'siblings' });
    expect(res.success).toBe(true);
    expect(res.nodes!.map(n => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('getFlattenedView returns correct depth-first ordering from root', () => {
    const a = n('a', null, 0, 0);
    const b = n('b', 'a', 0, 1);
    const c = n('c', 'a', 1, 1);
    const d = n('d', 'b', 0, 2);
    const mgr = new OutlineDataManager(makeDoc([a, b, c, d]), { realtime: new RealtimeManager(), sync: new SyncManager('c1'), id: makeIdGen(), clock: makeClock() });
    const res = mgr.getFlattenedView({ rootNodeId: null });
    expect(res.success).toBe(true);
    expect(res.nodes!.map(n => n.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});
