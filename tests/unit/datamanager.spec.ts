import { describe, it, expect } from 'vitest';
import { OutlineDocument, OutlineNode } from '../../src/types.js';
import { buildIndices } from '../../src/indices.js';
import { RealtimeManager, DataChange } from '../../src/realtime.js';
import { SyncManager } from '../../src/sync.js';
import { OutlineDataManager } from '../../src/outlineDataManager.js';
import type { CreateNodeParams, DeleteNodeParams, UpdateContentParams } from '../../src/api.js';

const fixedNow = '2020-01-01T00:00:00.000Z';
const makeClock = () => ({ nowIso: () => fixedNow });
const makeIdGen = () => {
  let i = 0;
  return { uuid: () => `id-${++i}` };
};

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

describe('OutlineDataManager basic ops (async)', () => {
  it('createNode creates node with correct depth/order and emits/broadcasts', async () => {
    const doc = makeDoc([n('r1', null, 0, 0)]);
    const rt = new RealtimeManager();
    const sync = new SyncManager('c1');
    const ids = makeIdGen();
    const clock = makeClock();
    const mgr = new OutlineDataManager(doc, { realtime: rt, sync, id: ids, clock });

    const events: DataChange[] = [];
    rt.subscribe((e) => events.push(e));

    const params: CreateNodeParams = { parentId: null, content: 'hello', position: 'last' };
    const res = await mgr.createNode(params);
    expect(res.success).toBe(true);
    const created = res.node!;
    expect(created.parentId).toBe(null);
    expect(created.depth).toBe(0);
    expect(created.order).toBe(1);
    expect(created.content).toBe('hello');
    expect(created.createdAt).toBe(fixedNow);
    expect(created.updatedAt).toBe(fixedNow);

    const idx = mgr.getIndices();
    expect(idx.childrenByParent.get(null)!.map(n => n.id)).toEqual(['r1', created.id]);

    // event emitted with ids+diff
    expect(events[0].type).toBe('nodeCreated');
    expect(events[0].nodeId).toBe(created.id);
    expect(events[0].diff).toBeDefined();
  });

  it('updateContent updates content/version/timestamp immutably and emits', async () => {
    const doc = makeDoc([n('r1', null, 0, 0)]);
    const rt = new RealtimeManager();
    const sync = new SyncManager('c1');
    const ids = makeIdGen();
    const clock = makeClock();
    const mgr = new OutlineDataManager(doc, { realtime: rt, sync, id: ids, clock });

    const params: UpdateContentParams = { nodeId: 'r1', content: 'updated' };
    const res = await mgr.updateContent(params);
    expect(res.success).toBe(true);
    expect(res.node!.content).toBe('updated');
    expect(res.node!.version).toBe(1);
    expect(res.node!.updatedAt).toBe(fixedNow);
  });

  it('deleteNode deleteSubtree removes node and its descendants and renumbers siblings', async () => {
    const doc = makeDoc([
      n('a', null, 0, 0),
      n('b', null, 1, 0),
      n('b1', 'b', 0, 1),
      n('b2', 'b', 1, 1),
    ]);
    const rt = new RealtimeManager();
    const sync = new SyncManager('c1');
    const ids = makeIdGen();
    const clock = makeClock();
    const mgr = new OutlineDataManager(doc, { realtime: rt, sync, id: ids, clock });

    const params: DeleteNodeParams = { nodeId: 'b', strategy: 'deleteSubtree' };
    const res = await mgr.deleteNode(params);
    expect(res.success).toBe(true);
    expect(res.deletedNodes!.map(n => n.id).sort()).toEqual(['b', 'b1', 'b2']);
    const idx = mgr.getIndices();
    const roots = idx.childrenByParent.get(null)!;
    expect(roots.map(r => r.id)).toEqual(['a']);
    expect(roots[0].order).toBe(0);
  });

  it('deleteNode promoteChildren removes node and promotes descendants to parent with contiguous order', async () => {
    const doc = makeDoc([
      n('a', null, 0, 0),
      n('b', null, 1, 0),
      n('b1', 'b', 0, 1),
      n('b2', 'b', 1, 1),
    ]);
    const rt = new RealtimeManager();
    const sync = new SyncManager('c1');
    const ids = makeIdGen();
    const clock = makeClock();
    const mgr = new OutlineDataManager(doc, { realtime: rt, sync, id: ids, clock });

    const params: DeleteNodeParams = { nodeId: 'b', strategy: 'promoteChildren' };
    const res = await mgr.deleteNode(params);
    expect(res.success).toBe(true);
    const idx = mgr.getIndices();
    const roots = idx.childrenByParent.get(null)!;
    expect(roots.map(r => r.id)).toEqual(['a', 'b1', 'b2']);
    expect(roots.map(r => r.order)).toEqual([0, 1, 2]);
    expect(roots.map(r => r.depth)).toEqual([0, 0, 0]);
  });
});
