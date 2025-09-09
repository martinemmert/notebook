import { describe, it, expect } from 'vitest';
import { OutlineDocument, OutlineNode } from '../../src/types.js';
import { isOutlineNode, isOutlineDocument, assertNodeInvariants, assertDocumentInvariants } from '../../src/validation.js';

const iso = (d: Date) => d.toISOString();

const makeNode = (overrides: Partial<OutlineNode> = {}): OutlineNode => ({
  id: overrides.id ?? 'n1',
  parentId: overrides.parentId ?? null,
  content: overrides.content ?? 'hello',
  order: overrides.order ?? 0,
  depth: overrides.depth ?? 0,
  createdAt: overrides.createdAt ?? iso(new Date()),
  updatedAt: overrides.updatedAt ?? iso(new Date()),
  version: overrides.version ?? 0,
});

const makeDoc = (nodes: OutlineNode[] = [], overrides: Partial<OutlineDocument> = {}): OutlineDocument => ({
  id: overrides.id ?? 'doc1',
  title: overrides.title ?? 'Test',
  nodes,
  version: overrides.version ?? 0,
  lastSyncedVersion: overrides.lastSyncedVersion ?? 0,
  createdAt: overrides.createdAt ?? iso(new Date()),
  updatedAt: overrides.updatedAt ?? iso(new Date()),
});

describe('Type guards', () => {
  it('isOutlineNode returns true for valid node shape', () => {
    const node = makeNode();
    expect(isOutlineNode(node)).toBe(true);
  });

  it('isOutlineNode returns false for missing properties', () => {
    // @ts-expect-error intentional bad shape
    expect(isOutlineNode({ id: 'x' })).toBe(false);
  });

  it('isOutlineDocument returns true for valid document', () => {
    const doc = makeDoc([makeNode()]);
    expect(isOutlineDocument(doc)).toBe(true);
  });

  it('isOutlineDocument returns false for invalid document', () => {
    // @ts-expect-error intentional bad shape
    expect(isOutlineDocument({ id: 'd', nodes: 'not-array' })).toBe(false);
  });
});

describe('Node invariants', () => {
  it('assertNodeInvariants passes for a valid node', () => {
    expect(() => assertNodeInvariants(makeNode())).not.toThrow();
  });

  it('throws for negative order or depth', () => {
    expect(() => assertNodeInvariants(makeNode({ order: -1 }))).toThrow();
    expect(() => assertNodeInvariants(makeNode({ depth: -1 }))).toThrow();
  });

  it('throws for invalid timestamps or version', () => {
    expect(() => assertNodeInvariants(makeNode({ createdAt: 'bad' as any }))).toThrow();
    expect(() => assertNodeInvariants(makeNode({ updatedAt: 'bad' as any }))).toThrow();
    expect(() => assertNodeInvariants(makeNode({ version: -1 }))).toThrow();
  });
});

describe('Document invariants', () => {
  it('passes for simple root nodes with contiguous orders', () => {
    const n1 = makeNode({ id: 'a', order: 0, parentId: null, depth: 0 });
    const n2 = makeNode({ id: 'b', order: 1, parentId: null, depth: 0 });
    const doc = makeDoc([n1, n2]);
    expect(() => assertDocumentInvariants(doc)).not.toThrow();
  });

  it('throws when parentId references missing node', () => {
    const n1 = makeNode({ id: 'a', parentId: 'missing', depth: 1 });
    const doc = makeDoc([n1]);
    expect(() => assertDocumentInvariants(doc)).toThrow();
  });

  it('throws when sibling orders are duplicated or non-contiguous', () => {
    const n1 = makeNode({ id: 'a', parentId: null, order: 0, depth: 0 });
    const n2 = makeNode({ id: 'b', parentId: null, order: 0, depth: 0 });
    const docDup = makeDoc([n1, n2]);
    expect(() => assertDocumentInvariants(docDup)).toThrow();

    const n3 = makeNode({ id: 'c', parentId: null, order: 0, depth: 0 });
    const n4 = makeNode({ id: 'd', parentId: null, order: 2, depth: 0 });
    const docGap = makeDoc([n3, n4]);
    expect(() => assertDocumentInvariants(docGap)).toThrow();
  });

  it('throws when circular references exist', () => {
    const a = makeNode({ id: 'a', parentId: 'b', depth: 1 });
    const b = makeNode({ id: 'b', parentId: 'a', depth: 1 });
    const doc = makeDoc([a, b]);
    expect(() => assertDocumentInvariants(doc)).toThrow();
  });
});
