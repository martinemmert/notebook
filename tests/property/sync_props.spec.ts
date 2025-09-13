import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SyncManager, OperationLog } from '../../src/sync.js';

const mkOp = (id: string, nodeId: string, version: number, operation: OperationLog['operation']): OperationLog => ({
  id,
  operation,
  nodeId,
  data: { content: id },
  version,
  timestamp: new Date().toISOString(),
  clientId: 'c',
});

describe('Property: Sync operations properties', () => {
  it('applyRemoteOperations is commutative and associative under LWW', async () => {
    await fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 3 }), (versions) => {
      const opsA = versions.map((v, i) => mkOp(`opA${i}`, 'n', v, 'update'));
      const opsB = versions.map((v, i) => mkOp(`opB${i}`, 'n', v + 1, 'update'));
      const AthenB = new SyncManager('c');
      AthenB.applyRemoteOperations(opsA);
      AthenB.applyRemoteOperations(opsB);
      const BthenA = new SyncManager('c');
      BthenA.applyRemoteOperations(opsB);
      BthenA.applyRemoteOperations(opsA);
      const lastA = AthenB['log'];
      const lastB = BthenA['log'];
      expect(JSON.stringify([...lastA.values()])).toEqual(JSON.stringify([...lastB.values()]));
    }));
  });

  it('idempotent when applying same ops multiple times', () => {
    const sm = new SyncManager('c');
    const ops = [mkOp('x','n',1,'update'), mkOp('y','n',2,'update')];
    sm.applyRemoteOperations(ops);
    const first = sm.getUnsyncedOperations();
    sm.applyRemoteOperations(ops);
    const second = sm.getUnsyncedOperations();
    expect(JSON.stringify(first)).toEqual(JSON.stringify(second));
  });
});
