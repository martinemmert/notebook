import { describe, it, expect } from 'vitest';
import { OutlineNode, OutlineDocument } from '../../src/types.js';
import { ValidationEngine } from '../../src/validationEngine.js';
import { RecoveryManager } from '../../src/recoveryManager.js';

const fixedNow = '2020-01-01T00:00:00.000Z';
const n = (id: string, parentId: string | null, order: number, depth: number): OutlineNode => ({
  id,
  parentId,
  content: id,
  order,
  depth,
  createdAt: fixedNow,
  updatedAt: fixedNow,
  version: 0,
});
const doc = (nodes: OutlineNode[]): OutlineDocument => ({ id: 'd', title: 'T', nodes, version: 0, lastSyncedVersion: 0, createdAt: fixedNow, updatedAt: fixedNow });

describe('ValidationEngine', () => {
  it('detects orphaned nodes and missing parents', () => {
    const d = doc([n('a', null, 0, 0), n('b', 'missing', 0, 1)]);
    const res = new ValidationEngine().validateDataIntegrity(d);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.type === 'missingParent' && i.nodeId === 'b')).toBe(true);
  });

  it('detects duplicate order within siblings and invalid depths', () => {
    const d = doc([n('a', null, 0, 0), n('b', null, 0, 0)]);
    const res = new ValidationEngine().validateDataIntegrity(d);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.type === 'duplicateOrder')).toBe(true);
  });
});

describe('RecoveryManager', () => {
  it('repairs orphaned nodes by attaching to root and renumbering', () => {
    const d = doc([n('a', null, 0, 0), n('b', 'missing', 0, 1)]);
    const rec = new RecoveryManager();
    const validated = new ValidationEngine().validateDataIntegrity(d);
    const repaired = rec.repairCorruption(d, validated.issues);
    expect(repaired.document.nodes.find(x => x.id === 'b')!.parentId).toBe(null);
    const roots = repaired.document.nodes.filter(n => n.parentId === null).sort((a,b)=>a.order-b.order);
    expect(roots.map(r => r.order)).toEqual([0, 1]);
  });
});
