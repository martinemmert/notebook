import { describe, it, expect } from 'vitest';
import { SyncManager, OperationLog, ConflictResolution } from '../../src/sync.js';

const mkOp = (id: string, nodeId: string, version: number, operation: OperationLog['operation']): OperationLog => ({
  id,
  operation,
  nodeId,
  data: { content: id },
  version,
  timestamp: new Date().toISOString(),
  clientId: 'client-1',
});

describe('SyncManager', () => {
  it('logs operations with monotonic versioning and idempotency', () => {
    const sync = new SyncManager('client-1');
    const op1 = mkOp('op1', 'n1', 1, 'update');
    const op2 = mkOp('op2', 'n2', 2, 'update');
    sync.logOperation(op1);
    sync.logOperation(op2);
    // idempotency
    sync.logOperation(op2);

    const unsynced = sync.getUnsyncedOperations();
    expect(unsynced.map(o => o.id)).toEqual(['op1', 'op2']);
  });

  it('applies remote operations using LWW without conflicts when remote version is newer', () => {
    const sync = new SyncManager('client-1');
    const local = mkOp('local1', 'n1', 1, 'update');
    sync.logOperation(local);

    const remote = [mkOp('remote1', 'n1', 2, 'update')];
    const results: ConflictResolution[] = sync.applyRemoteOperations(remote);
    expect(results[0].type).toBe('autoResolved');
    expect(results[0].strategy).toBe('lastWriteWins');
  });
});
