import { OutlineDocument, OutlineNode } from './types.js';
import { CorruptionIssue } from './validationEngine.js';

export interface RepairResult {
  document: OutlineDocument;
}

export class RecoveryManager {
  repairCorruption(document: OutlineDocument, issues: CorruptionIssue[]): RepairResult {
    let nodes = document.nodes.map(n => ({ ...n }));
    // Fix missing parents: attach to root
    for (const issue of issues) {
      if (issue.type === 'missingParent') {
        const node = nodes.find(n => n.id === issue.nodeId);
        if (node) {
          node.parentId = null;
          node.depth = 0;
        }
      }
    }
    // Renumber orders per parent
    const byParent = new Map<string | null, OutlineNode[]>();
    for (const n of nodes) {
      const arr = byParent.get(n.parentId) ?? [];
      arr.push(n);
      byParent.set(n.parentId, arr);
    }
    for (const [parentId, list] of byParent) {
      list.sort((a, b) => a.order - b.order).forEach((s, i) => (s.order = i));
    }
    return { document: { ...document, nodes } };
  }
}

