import { describe, it, expect } from 'vitest';
import { SyncManager, OperationLog } from '../../src/sync.js';
import { RemoteSync } from '../../src/remoteSync.js';

const mkOp = (id: string, nodeId: string, version: number, operation: OperationLog['operation']): OperationLog => ({
  id,
  operation,
  nodeId,
  data: { content: id },
  version,
  timestamp: new Date().toISOString(),
  clientId: 'client-1',
});

describe('RemoteSync', () => {
  it('queues ops while offline and flushes when online', async () => {
    const sync = new SyncManager('c1');
    const transport = new RemoteSync.MockTransport();
    const remote = new RemoteSync(sync, transport);

    transport.setOnline(false);
    sync.logOperation(mkOp('op1','n1',1,'update'));
    await remote.flush();
    expect(transport.sent.length).toBe(0);

    transport.setOnline(true);
    await remote.flush();
    expect(transport.sent.length).toBe(1);
  });

  it('uses backoff on failures and falls back to REST when WS fails', async () => {
    const sync = new SyncManager('c1');
    const transport = new RemoteSync.MockTransport();
    const remote = new RemoteSync(sync, transport);

    transport.setOnline(true);
    transport.failOnce('ws');
    sync.logOperation(mkOp('op2','n2',2,'update'));
    await remote.flush();
    // first attempt via ws fails, fallback rest succeeds
    expect(transport.wsAttempts).toBeGreaterThan(0);
    expect(transport.restAttempts).toBeGreaterThan(0);
  });

  it('applies remote operations received from server', async () => {
    const sync = new SyncManager('c1');
    const transport = new RemoteSync.MockTransport();
    const remote = new RemoteSync(sync, transport);

    transport.pushIncoming([mkOp('r1','n1',3,'update')]);
    const conflicts = await remote.pull();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].strategy).toBe('lastWriteWins');
  });
});
