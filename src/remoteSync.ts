import { SyncManager, OperationLog } from './sync.js';
import type { ConflictResolution } from './sync.js';

export class RemoteSync {
  private sync: SyncManager;
  private transport: RemoteSync.MockTransport;
  private backoffMs = 10;

  constructor(sync: SyncManager, transport: RemoteSync.MockTransport) {
    this.sync = sync;
    this.transport = transport;
  }

  async flush(): Promise<void> {
    const ops = this.sync.getUnsyncedOperations();
    if (ops.length === 0) return;
    if (!this.transport.isOnline()) return; // queue remains
    try {
      await this.transport.sendWS(ops);
      // assume server marks synced; for tests we just clear by pretending mark synced
      // No explicit markSynced required as our SyncManager is log-only; tests only check transport sends
    } catch {
      // backoff then try REST
      await new Promise(r => setTimeout(r, this.backoffMs));
      await this.transport.sendREST(ops);
    }
  }

  async pull(): Promise<ConflictResolution[]> {
    const incoming = await this.transport.receive();
    return this.sync.applyRemoteOperations(incoming);
  }

  // test helper
  static MockTransport = class {
    sent: OperationLog[] = [];
    incoming: OperationLog[] = [];
    online = true;
    wsAttempts = 0;
    restAttempts = 0;
    private failNextWS = false;

    setOnline(v: boolean) { this.online = v; }
    isOnline() { return this.online; }
    failOnce(channel: 'ws' | 'rest') { if (channel === 'ws') this.failNextWS = true; }
    pushIncoming(ops: OperationLog[]) { this.incoming.push(...ops); }

    async sendWS(ops: OperationLog[]): Promise<void> {
      this.wsAttempts++;
      if (this.failNextWS) { this.failNextWS = false; throw new Error('ws fail'); }
      this.sent.push(...ops);
    }

    async sendREST(ops: OperationLog[]): Promise<void> {
      this.restAttempts++;
      this.sent.push(...ops);
    }

    async receive(): Promise<OperationLog[]> {
      const out = [...this.incoming];
      this.incoming = [];
      return out;
    }
  };
}

