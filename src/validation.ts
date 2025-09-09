import { OutlineDocument, OutlineNode } from './types.js';

export function isIsoString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

export function isOutlineNode(value: unknown): value is OutlineNode {
  const v: any = value;
  return (
    v &&
    typeof v.id === 'string' &&
    (v.parentId === null || typeof v.parentId === 'string') &&
    typeof v.content === 'string' &&
    typeof v.order === 'number' &&
    typeof v.depth === 'number' &&
    typeof v.version === 'number' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

export function isOutlineDocument(value: unknown): value is OutlineDocument {
  const v: any = value;
  return (
    v &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    Array.isArray(v.nodes) &&
    typeof v.version === 'number' &&
    typeof v.lastSyncedVersion === 'number' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

export function assertNodeInvariants(node: OutlineNode): void {
  if (!isOutlineNode(node)) throw new Error('Invalid node shape');
  if (node.order < 0) throw new Error('order must be >= 0');
  if (node.depth < 0) throw new Error('depth must be >= 0');
  if (!isIsoString(node.createdAt)) throw new Error('createdAt must be ISO date string');
  if (!isIsoString(node.updatedAt)) throw new Error('updatedAt must be ISO date string');
  if (node.version < 0) throw new Error('version must be >= 0');
}

export function assertDocumentInvariants(doc: OutlineDocument): void {
  if (!isOutlineDocument(doc)) throw new Error('Invalid document shape');
  const idToNode = new Map<string, OutlineNode>();
  for (const n of doc.nodes) {
    assertNodeInvariants(n);
    idToNode.set(n.id, n);
  }
  // parent existence and cycle detection
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycleFrom = (node: OutlineNode): boolean => {
    if (visited.has(node.id)) return false;
    if (visiting.has(node.id)) return true;
    visiting.add(node.id);
    if (node.parentId !== null) {
      const parent = idToNode.get(node.parentId);
      if (!parent) throw new Error(`Missing parent for node ${node.id}`);
      if (hasCycleFrom(parent)) return true;
    }
    visiting.delete(node.id);
    visited.add(node.id);
    return false;
  };
  for (const n of doc.nodes) {
    if (hasCycleFrom(n)) throw new Error('Cycle detected');
  }
  // sibling order contiguous and unique per parent
  const siblingsByParent = new Map<string | null, OutlineNode[]>();
  for (const n of doc.nodes) {
    const key = n.parentId;
    const arr = siblingsByParent.get(key) ?? [];
    arr.push(n);
    siblingsByParent.set(key, arr);
  }
  for (const [parentId, list] of siblingsByParent) {
    const byOrder = [...list].sort((a, b) => a.order - b.order);
    for (let i = 0; i < byOrder.length; i += 1) {
      if (byOrder[i].order !== i) {
        throw new Error(`Non-contiguous or duplicate order under parent ${parentId}`);
      }
    }
  }
}

