import { OutlineDocument, OutlineNode } from './types.js';

export function createNodeImmutable(doc: OutlineDocument, parentId: string | null, content: string, position: 'first' | 'last' | { afterNodeId: string }, nowIso: string, newId: string): { doc: OutlineDocument; node: OutlineNode } {
  const siblings = doc.nodes.filter(n => n.parentId === (position && typeof position === 'object' ? undefined : parentId));
  let effectiveParentId = parentId;
  if (typeof position === 'object' && position.afterNodeId) {
    const after = doc.nodes.find(n => n.id === position.afterNodeId);
    if (!after) throw new Error('afterNodeId not found');
    effectiveParentId = after.parentId; // inherit parent
  }
  const siblingList = doc.nodes.filter(n => n.parentId === effectiveParentId);
  const nextOrder = (() => {
    if (position === 'first') return 0;
    if (position === 'last') return siblingList.length;
    if (typeof position === 'object') {
      const idx = siblingList.findIndex(n => n.id === position.afterNodeId);
      if (idx < 0) throw new Error('afterNodeId not sibling');
      return idx + 1;
    }
    return siblingList.length;
  })();
  const depth = effectiveParentId === null ? 0 : (doc.nodes.find(n => n.id === effectiveParentId)?.depth ?? -1) + 1;
  if (depth < 0) throw new Error('invalid parent');
  const newNode: OutlineNode = {
    id: newId,
    parentId: effectiveParentId,
    content,
    order: nextOrder,
    depth,
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 0,
  };
  // insert and renumber orders contiguously
  const nodes = [...doc.nodes, newNode]
    .map(n => ({ ...n }))
    .sort((a, b) => a.order - b.order);
  const out = nodes.map(n => {
    if (n.parentId !== effectiveParentId) return n;
    return n;
  });
  // reorder only within siblings after insertion
  let orderCounter = 0;
  for (const n of out) {
    if (n.parentId === effectiveParentId) {
      n.order = orderCounter++;
    }
  }
  return { doc: { ...doc, nodes: out, updatedAt: nowIso, version: doc.version + 1 }, node: newNode };
}

export function updateContentImmutable(doc: OutlineDocument, nodeId: string, content: string, nowIso: string): { doc: OutlineDocument; node: OutlineNode } {
  const node = doc.nodes.find(n => n.id === nodeId);
  if (!node) throw new Error('node not found');
  const updated: OutlineNode = { ...node, content, updatedAt: nowIso, version: node.version + 1 };
  const nodes = doc.nodes.map(n => (n.id === nodeId ? updated : n));
  return { doc: { ...doc, nodes, updatedAt: nowIso, version: doc.version + 1 }, node: updated };
}

export function deleteNodeImmutable(doc: OutlineDocument, nodeId: string, strategy: 'deleteSubtree' | 'promoteChildren', nowIso: string): { doc: OutlineDocument; deletedNodes: OutlineNode[]; promotedNodes: OutlineNode[] } {
  const target = doc.nodes.find(n => n.id === nodeId);
  if (!target) throw new Error('node not found');
  const descendants = new Set<string>();
  const collect = (id: string) => {
    for (const n of doc.nodes) {
      if (n.parentId === id) {
        descendants.add(n.id);
        collect(n.id);
      }
    }
  };
  collect(nodeId);
  const toDelete = new Set<string>([nodeId, ...descendants]);
  let nodes = doc.nodes.filter(n => !toDelete.has(n.id));
  const deletedNodes = doc.nodes.filter(n => toDelete.has(n.id));
  const promotedNodes: OutlineNode[] = [];
  if (strategy === 'promoteChildren') {
    const children = doc.nodes.filter(n => n.parentId === nodeId);
    for (const child of children) {
      const promoted: OutlineNode = { ...child, parentId: target.parentId, depth: target.depth };
      promotedNodes.push(promoted);
      nodes.push(promoted);
    }
  }
  // renumber orders for affected parent
  const parentId = strategy === 'promoteChildren' ? target.parentId : target.parentId;
  const siblings = nodes.filter(n => n.parentId === parentId).sort((a, b) => a.order - b.order);
  siblings.forEach((s, i) => (s.order = i));
  // update depth for promoted children and their descendants when promoting
  if (strategy === 'promoteChildren') {
    for (const promoted of promotedNodes) {
      const adjustDesc = (id: string, baseDepth: number) => {
        for (const c of nodes) {
          if (c.parentId === id) {
            c.depth = baseDepth + 1;
            adjustDesc(c.id, c.depth);
          }
        }
      };
      adjustDesc(promoted.id, promoted.depth);
    }
  }
  return { doc: { ...doc, nodes, updatedAt: nowIso, version: doc.version + 1 }, deletedNodes, promotedNodes };
}
