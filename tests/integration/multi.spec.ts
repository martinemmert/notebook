import { describe, it, expect } from 'vitest';
import { OutlineDataManager } from '../../src/outlineDataManager.js';
import { RealtimeManager } from '../../src/realtime.js';
import { SyncManager } from '../../src/sync.js';
import { OutlineDocument, OutlineNode } from '../../src/types.js';

const fixedNow = '2020-01-01T00:00:00.000Z';
const makeClock = () => ({ nowIso: () => fixedNow });
const makeIdGen = () => { let i=0; return { uuid: () => `id-${++i}` }; };

const n = (id: string, parentId: string | null, order: number, depth: number): OutlineNode => ({ id, parentId, content: id, order, depth, createdAt: fixedNow, updatedAt: fixedNow, version: 0 });
const doc = (nodes: OutlineNode[]): OutlineDocument => ({ id: 'd', title: 'T', nodes, version: 0, lastSyncedVersion: 0, createdAt: fixedNow, updatedAt: fixedNow });

describe('Integration: create-move-delete sequence maintains integrity', () => {
  it('should keep sibling order contiguous and depths consistent', async () => {
    const mgr = new OutlineDataManager(doc([n('a', null, 0, 0)]), { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    const c1 = await mgr.createNode({ parentId: null, content: 'x', position: 'last' });
    expect(c1.success).toBe(true);

    const c2 = await mgr.createNode({ parentId: null, content: 'y', position: { afterNodeId: c1.node!.id } });
    expect(c2.success).toBe(true);

    const m = await mgr.moveNode({ nodeId: c1.node!.id, direction: 'up' });
    expect(m.success).toBe(true);

    const d = await mgr.deleteNode({ nodeId: c2.node!.id, strategy: 'deleteSubtree' });
    expect(d.success).toBe(true);

    const roots = mgr.getIndices().orderedChildren.get(null)!;
    // orders contiguous
    expect(roots.map(r => r.order)).toEqual([0,1]);
    // depths correct
    expect(roots.every(r => r.depth === 0)).toBe(true);
  });
});
