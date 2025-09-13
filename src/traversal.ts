import { OutlineDocument, OutlineNode } from './types.js';
import { DataIndices } from './types.js';

export function getHierarchy(
  doc: OutlineDocument,
  indices: DataIndices,
  params: { nodeId: string; direction: 'ancestors' | 'descendants' | 'siblings'; maxDepth?: number },
): { success: boolean; nodes?: OutlineNode[]; error?: any } {
  const node = indices.nodeById.get(params.nodeId) || doc.nodes.find(n => n.id === params.nodeId);
  if (!node) return { success: false, error: new Error('node not found') };
  if (params.direction === 'ancestors') {
    const result: OutlineNode[] = [];
    let current = node.parentId ? indices.nodeById.get(node.parentId) : undefined;
    while (current) {
      result.unshift(current);
      current = current.parentId ? indices.nodeById.get(current.parentId) : undefined;
    }
    return { success: true, nodes: result };
  }
  if (params.direction === 'siblings') {
    const siblings = indices.orderedChildren.get(node.parentId) || [];
    return { success: true, nodes: siblings };
  }
  // descendants depth-first, respecting order
  const out: OutlineNode[] = [];
  const walk = (id: string, depth: number) => {
    if (params.maxDepth !== undefined && depth > params.maxDepth) return;
    const children = indices.orderedChildren.get(id) || [];
    for (const child of children) {
      out.push(child);
      walk(child.id, depth + 1);
    }
  };
  walk(node.id, 1);
  return { success: true, nodes: out };
}

export function getFlattenedView(
  doc: OutlineDocument,
  indices: DataIndices,
  params: { rootNodeId?: string | null; includeCollapsed?: boolean; maxNodes?: number },
): { success: boolean; nodes?: OutlineNode[]; totalCount?: number; error?: any } {
  const result: OutlineNode[] = [];
  const limit = params.maxNodes ?? Number.POSITIVE_INFINITY;
  const pushWithLimit = (n: OutlineNode) => {
    if (result.length < limit) result.push(n);
  };
  const walkFrom = (id: string) => {
    const children = indices.orderedChildren.get(id) || [];
    for (const child of children) {
      if (result.length >= limit) return;
      pushWithLimit(child);
      walkFrom(child.id);
    }
  };

  if (params.rootNodeId === null || params.rootNodeId === undefined) {
    const roots = indices.orderedChildren.get(null) || [];
    for (const r of roots) {
      if (result.length >= limit) break;
      pushWithLimit(r);
      walkFrom(r.id);
    }
    return { success: true, nodes: result, totalCount: result.length };
  }
  const start = indices.nodeById.get(params.rootNodeId);
  if (!start) return { success: false, error: new Error('root not found') };
  pushWithLimit(start);
  walkFrom(start.id);
  return { success: true, nodes: result, totalCount: result.length };
}

