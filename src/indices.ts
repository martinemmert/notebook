import { DataIndices, OutlineNode } from './types.js';

export function buildIndices(nodes: OutlineNode[]): DataIndices {
  const nodeById = new Map<string, OutlineNode>();
  const childrenByParent = new Map<string | null, OutlineNode[]>();
  const orderedChildren = new Map<string | null, OutlineNode[]>();
  const maxOrderByParent = new Map<string | null, number>();

  for (const node of nodes) {
    nodeById.set(node.id, node);
    const key = node.parentId;
    const arr = childrenByParent.get(key) ?? [];
    arr.push(node);
    // maintain insertion by order for childrenByParent as well
    arr.sort((a, b) => a.order - b.order);
    childrenByParent.set(key, arr);
  }

  for (const [parentId, list] of childrenByParent) {
    const sorted = [...list].sort((a, b) => a.order - b.order);
    orderedChildren.set(parentId, sorted);
    if (sorted.length > 0) {
      maxOrderByParent.set(parentId, sorted[sorted.length - 1].order);
    }
  }

  return { nodeById, childrenByParent, orderedChildren, maxOrderByParent };
}
