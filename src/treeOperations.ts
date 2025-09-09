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
  let depth: number;
  if (effectiveParentId === null) {
    depth = 0;
  } else {
    const parent = doc.nodes.find(n => n.id === effectiveParentId);
    if (!parent) throw new Error('invalid parent');
    depth = parent.depth + 1;
  }
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

export function moveNodeImmutable(doc: OutlineDocument, nodeId: string, direction: 'up' | 'down', nowIso: string): { doc: OutlineDocument; affected: OutlineNode[] } {
  const node = doc.nodes.find(n => n.id === nodeId);
  if (!node) throw new Error('node not found');
  const siblings = doc.nodes.filter(n => n.parentId === node.parentId).sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex(n => n.id === nodeId);
  if (direction === 'up') {
    if (idx <= 0) throw new Error('at boundary');
    const prev = siblings[idx - 1];
    const tmp = node.order;
    node.order = prev.order;
    prev.order = tmp;
  } else {
    if (idx < 0 || idx >= siblings.length - 1) throw new Error('at boundary');
    const next = siblings[idx + 1];
    const tmp = node.order;
    node.order = next.order;
    next.order = tmp;
  }
  // renumber contiguous
  siblings.sort((a, b) => a.order - b.order).forEach((s, i) => (s.order = i));
  const nodes = doc.nodes.map(n => {
    const s = siblings.find(x => x.id === n.id);
    return s ? { ...s } : n;
  });
  return { doc: { ...doc, nodes, updatedAt: nowIso, version: doc.version + 1 }, affected: siblings };
}

export function changeLevelImmutable(doc: OutlineDocument, nodeId: string, operation: 'indent' | 'outdent', nowIso: string): { doc: OutlineDocument; node: OutlineNode; affectedDescendants: OutlineNode[] } {
  const node = doc.nodes.find(n => n.id === nodeId);
  if (!node) throw new Error('node not found');
  if (operation === 'indent') {
    const siblings = doc.nodes.filter(n => n.parentId === node.parentId).sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex(n => n.id === nodeId);
    if (idx <= 0) throw new Error('cannot indent first sibling');
    const newParent = siblings[idx - 1];
    const children = doc.nodes.filter(n => n.parentId === newParent.id);
    const updatedNode: OutlineNode = { ...node, parentId: newParent.id, depth: newParent.depth + 1, order: children.length };
    // update doc with new node and renumber old siblings
    const nodes = doc.nodes.map(n => (n.id === node.id ? updatedNode : n));
    const oldSiblings = nodes.filter(n => n.parentId === node.parentId).sort((a, b) => a.order - b.order);
    oldSiblings.forEach((s, i) => (s.order = i));
    const nodes2 = nodes.map(n => {
      const s = oldSiblings.find(x => x.id === n.id);
      return s ? { ...s } : n;
    });
    const affectedDescendants: OutlineNode[] = [];
    return { doc: { ...doc, nodes: nodes2, updatedAt: nowIso, version: doc.version + 1 }, node: updatedNode, affectedDescendants };
  } else {
    // outdent
    if (node.parentId === null) throw new Error('cannot outdent root');
    const parent = doc.nodes.find(n => n.id === node.parentId)!;
    const grandParentId = parent.parentId;
    const siblingsAtGrand = doc.nodes.filter(n => n.parentId === grandParentId).sort((a, b) => a.order - b.order);
    const updatedNode: OutlineNode = { ...node, parentId: grandParentId, depth: parent.depth, order: siblingsAtGrand.length };
    const nodes = doc.nodes.map(n => (n.id === node.id ? updatedNode : n));
    const parentChildren = nodes.filter(n => n.parentId === parent.id).sort((a, b) => a.order - b.order);
    parentChildren.forEach((c, i) => (c.order = i));
    const nodes2 = nodes.map(n => {
      const s = parentChildren.find(x => x.id === n.id);
      return s ? { ...s } : n;
    });
    // adjust depths for node descendants
    const affectedDescendants: OutlineNode[] = [];
    const adjustDesc = (id: string, baseDepth: number) => {
      for (const c of nodes2) {
        if (c.parentId === id) {
          c.depth = baseDepth + 1;
          affectedDescendants.push({ ...c });
          adjustDesc(c.id, c.depth);
        }
      }
    };
    adjustDesc(updatedNode.id, updatedNode.depth);
    return { doc: { ...doc, nodes: nodes2, updatedAt: nowIso, version: doc.version + 1 }, node: updatedNode, affectedDescendants };
  }
}
