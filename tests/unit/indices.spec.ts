import { describe, it, expect } from 'vitest';
import { OutlineNode } from '../../src/types.js';
import { buildIndices } from '../../src/indices.js';

const iso = (d: Date) => d.toISOString();

const n = (id: string, parentId: string | null, order: number, depth: number): OutlineNode => ({
  id,
  parentId,
  content: id,
  order,
  depth,
  createdAt: iso(new Date()),
  updatedAt: iso(new Date()),
  version: 0,
});

describe('DataIndices builder', () => {
  it('maps nodeById and groups children by parent with sorted order', () => {
    const nodes = [
      n('r2', null, 1, 0),
      n('c1', 'r1', 1, 1),
      n('r1', null, 0, 0),
      n('c0', 'r1', 0, 1),
    ];

    const originalJson = JSON.stringify(nodes);

    const idx = buildIndices(nodes);

    expect(idx.nodeById.get('r1')?.id).toBe('r1');
    expect(idx.nodeById.get('c0')?.parentId).toBe('r1');

    const rootKids = idx.childrenByParent.get(null)!;
    expect(rootKids.map(k => k.id)).toEqual(['r1', 'r2']);

    const orderedRootKids = idx.orderedChildren.get(null)!;
    expect(orderedRootKids.map(k => k.id)).toEqual(['r1', 'r2']);

    const r1Kids = idx.childrenByParent.get('r1')!;
    expect(r1Kids.map(k => k.id)).toEqual(['c0', 'c1']);

    const orderedR1Kids = idx.orderedChildren.get('r1')!;
    expect(orderedR1Kids.map(k => k.id)).toEqual(['c0', 'c1']);

    expect(idx.maxOrderByParent.get(null)).toBe(1);
    expect(idx.maxOrderByParent.get('r1')).toBe(1);
    expect(idx.maxOrderByParent.get('r2')).toBeUndefined();

    // immutability: inputs are not mutated
    expect(JSON.stringify(nodes)).toBe(originalJson);
  });
});
