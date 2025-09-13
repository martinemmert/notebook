import { OutlineDocument } from './types.js';

export interface CorruptionIssue {
  type: 'orphanedNode' | 'invalidDepth' | 'duplicateOrder' | 'missingParent';
  nodeId: string;
  description: string;
  autoFixable: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  issues: CorruptionIssue[];
  criticalErrors: CorruptionIssue[];
  warnings: CorruptionIssue[];
}

export class ValidationEngine {
  validateDataIntegrity(document: OutlineDocument): ValidationResult {
    const issues: CorruptionIssue[] = [];
    const idToDepth = new Map(document.nodes.map(n => [n.id, n.depth] as const));
    const idSet = new Set(document.nodes.map(n => n.id));

    // missing parents and invalid depths
    for (const n of document.nodes) {
      if (n.parentId !== null && !idSet.has(n.parentId)) {
        issues.push({ type: 'missingParent', nodeId: n.id, description: 'Parent not found', autoFixable: true });
      } else if (n.parentId === null && n.depth !== 0) {
        issues.push({ type: 'invalidDepth', nodeId: n.id, description: 'Root node must have depth 0', autoFixable: true });
      } else if (n.parentId !== null) {
        const pDepth = idToDepth.get(n.parentId);
        if (pDepth !== undefined && n.depth !== pDepth + 1) {
          issues.push({ type: 'invalidDepth', nodeId: n.id, description: 'Depth does not match parent chain', autoFixable: true });
        }
      }
    }

    // duplicate or non-contiguous order within siblings
    const byParent = new Map<string | null, number[]>();
    for (const n of document.nodes) {
      const arr = byParent.get(n.parentId) ?? [];
      arr.push(n.order);
      byParent.set(n.parentId, arr);
    }
    for (const [parentId, orders] of byParent) {
      const sorted = [...orders].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i) {
          issues.push({ type: 'duplicateOrder', nodeId: String(parentId), description: 'Duplicate or gap in order values', autoFixable: true });
          break;
        }
      }
    }

    return { isValid: issues.length === 0, issues, criticalErrors: [], warnings: [] };
  }
}

