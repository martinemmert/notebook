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

describe('Reordering and Structure Changes', () => {
  it('move up swaps with previous sibling and renumbers', async () => {
    const doc = makeDoc([n('a', null, 0, 0), n('b', null, 1, 0), n('c', null, 2, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.moveNode({ nodeId: 'b', direction: 'up' });
    expect(res.success).toBe(true);
    const roots = mgr.getIndices().orderedChildren.get(null)!;
    expect(roots.map(r => r.id)).toEqual(['b', 'a', 'c']);
    expect(roots.map(r => r.order)).toEqual([0, 1, 2]);
  });

  it('move down swaps with next sibling and renumbers', async () => {
    const doc = makeDoc([n('a', null, 0, 0), n('b', null, 1, 0), n('c', null, 2, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.moveNode({ nodeId: 'b', direction: 'down' });
    expect(res.success).toBe(true);
    const roots = mgr.getIndices().orderedChildren.get(null)!;
    expect(roots.map(r => r.id)).toEqual(['a', 'c', 'b']);
    expect(roots.map(r => r.order)).toEqual([0, 1, 2]);
  });

  it('move up at boundary fails gracefully', async () => {
    const doc = makeDoc([n('a', null, 0, 0), n('b', null, 1, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.moveNode({ nodeId: 'a', direction: 'up' });
    expect(res.success).toBe(false);
  });

  it('indent makes node child of previous sibling as last child and updates depths', async () => {
    const doc = makeDoc([n('a', null, 0, 0), n('b', null, 1, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.changeLevel({ nodeId: 'b', operation: 'indent' });
    expect(res.success).toBe(true);
    const roots = mgr.getIndices().orderedChildren.get(null)!;
    expect(roots.map(r => r.id)).toEqual(['a']);
    const aChildren = mgr.getIndices().orderedChildren.get('a')!;
    expect(aChildren.map(c => c.id)).toEqual(['b']);
    expect(aChildren[0].depth).toBe(1);
  });

  it('indent on first sibling fails gracefully', async () => {
    const doc = makeDoc([n('a', null, 0, 0), n('b', null, 1, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.changeLevel({ nodeId: 'a', operation: 'indent' });
    expect(res.success).toBe(false);
  });

  it('outdent makes node sibling of parent and updates depths', async () => {
    const doc = makeDoc([n('a', null, 0, 0), n('b', 'a', 0, 1)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.changeLevel({ nodeId: 'b', operation: 'outdent' });
    expect(res.success).toBe(true);
    const roots = mgr.getIndices().orderedChildren.get(null)!;
    expect(roots.map(r => r.id)).toEqual(['a', 'b']);
    expect(roots.map(r => r.depth)).toEqual([0, 0]);
  });

  it('outdent on root fails gracefully', async () => {
    const doc = makeDoc([n('a', null, 0, 0)]);
    const mgr = new OutlineDataManager(doc, { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const res = await mgr.changeLevel({ nodeId: 'a', operation: 'outdent' });
    expect(res.success).toBe(false);
  });
});
