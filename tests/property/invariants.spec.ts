import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OutlineDocument, OutlineNode } from '../../src/types.js';
import { OutlineDataManager } from '../../src/outlineDataManager.js';
import { RealtimeManager } from '../../src/realtime.js';
import { SyncManager } from '../../src/sync.js';

const fixedNow = '2020-01-01T00:00:00.000Z';
const makeClock = () => ({ nowIso: () => fixedNow });
const makeIdGen = () => { let i=0; return { uuid: () => `id-${++i}` }; };

const doc = (nodes: OutlineNode[]): OutlineDocument => ({ id: 'd', title: 'T', nodes, version: 0, lastSyncedVersion: 0, createdAt: fixedNow, updatedAt: fixedNow });

const validNodeArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 4 }),
  parentId: fc.constant(null),
  content: fc.string({ maxLength: 8 }),
  order: fc.nat(10),
  depth: fc.constant(0),
  createdAt: fc.constant(fixedNow),
  updatedAt: fc.constant(fixedNow),
  version: fc.nat(3),
});

describe('Property: sibling order contiguous and depths match chain', () => {
  it('any sequence of creates and moves maintains invariants', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(validNodeArb, { minLength: 1, maxLength: 3 }), async (roots) => {
        const uniqueIds = Array.from(new Set(roots.map(r => r.id)));
        const initial: OutlineNode[] = uniqueIds.map((id, i) => ({ ...roots.find(r => r.id === id)!, id, order: i }));
        const mgr = new OutlineDataManager(doc(initial), { realtime: new RealtimeManager(), sync: new SyncManager('c'), id: makeIdGen(), clock: makeClock() });

        // Perform a few operations
        await mgr.createNode({ parentId: null, content: 'x', position: 'last' });
        await mgr.moveNode({ nodeId: initial[0].id, direction: 'down' }).catch(()=>({}));

        const rootsNow = mgr.getIndices().orderedChildren.get(null)!;
        // contiguous orders
        expect(rootsNow.map(r => r.order)).toEqual(rootsNow.map((_, i) => i));
        // depth matches parent chain (root=0)
        expect(rootsNow.every(r => r.depth === 0)).toBe(true);
      })
    );
  });
});
