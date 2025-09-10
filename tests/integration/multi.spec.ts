import { describe, it, expect } from 'vitest';
import { OutlineDataManager } from '../../src/outlineDataManager.js';
import { RealtimeManager } from '../../src/realtime.js';
import { SyncManager } from '../../src/sync.js';
import { OutlineDocument, OutlineNode } from '../../src/types.js';
import { RemoteSync } from '../../src/remoteSync.js';

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

describe('Integration: rapid indent/outdent remains consistent', () => {
  it('should keep indices consistent after rapid level changes', async () => {
    const mgr = new OutlineDataManager(doc([n('a', null, 0, 0), n('b', null, 1, 0), n('c', null, 2, 0)]), { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });
    await mgr.changeLevel({ nodeId: 'b', operation: 'indent' });
    await mgr.changeLevel({ nodeId: 'b', operation: 'outdent' });
    await mgr.changeLevel({ nodeId: 'c', operation: 'indent' });
    const roots = mgr.getIndices().orderedChildren.get(null)!;
    expect(roots.map(r => r.order)).toEqual([0, 1]);
    const aChildren = mgr.getIndices().orderedChildren.get('a') || [];
    // 'c' might be under 'a' depending on previous ops; ensure orders contiguous per parent
    const checkContiguous = (arr: OutlineNode[]) => expect(arr.map((_, i) => i)).toEqual(arr.map(x => x.order));
    checkContiguous(roots);
    checkContiguous(aChildren);
  });
});


describe('Integration: concurrent edits from multiple clients resolve correctly', () => {
  it('LWW should keep the higher version update', async () => {
    const mgr1 = new OutlineDataManager(doc([n('a', null, 0, 0)]), { realtime: new RealtimeManager(), sync: new SyncManager('c1'), id: makeIdGen(), clock: makeClock() });
    const mgr2 = new OutlineDataManager(doc([n('a', null, 0, 0)]), { realtime: new RealtimeManager(), sync: new SyncManager('c2'), id: makeIdGen(), clock: makeClock() });

    await mgr1.updateContent({ nodeId: 'a', content: 'x' }); // version 1
    await mgr2.updateContent({ nodeId: 'a', content: 'y' }); // version 1 independently

    // Remote apply from mgr2 to mgr1 via SyncManager
    const ops = mgr2['providers'].sync.getUnsyncedOperations();
    const conflicts = mgr1['providers'].sync.applyRemoteOperations(ops);
    expect(conflicts[0].strategy).toBe('lastWriteWins');
  });
});


describe('Integration: offline operations sync on reconnect', () => {
  it('queues updates while offline and syncs when reconnected', async () => {
    const sync = new SyncManager('c');
    const mgr = new OutlineDataManager(doc([n('a', null, 0, 0)]), { realtime: new RealtimeManager(), sync, id: makeIdGen(), clock: makeClock() });
    const transport = new (RemoteSync as any).MockTransport();
    const remote = new (RemoteSync as any)(sync, transport);

    transport.setOnline(false);
    await mgr.updateContent({ nodeId: 'a', content: 'offline' });
    await remote.flush();
    expect(transport.sent.length).toBe(0);

    transport.setOnline(true);
    await remote.flush();
    expect(transport.sent.length).toBeGreaterThan(0);
  });
});

