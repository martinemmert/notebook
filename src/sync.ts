export type OperationLog = {
  id: string;
  operation: 'create' | 'update' | 'delete' | 'move' | 'changeLevel';
  nodeId: string;
  data: any;
  version: number;
  timestamp: string;
  clientId: string;
};

export type ConflictResolution = {
  type: 'autoResolved' | 'manualRequired';
  strategy: 'lastWriteWins' | 'mergeContent' | 'createFork';
  resolvedNode?: any;
  alternativeVersions?: any[];
};

export class SyncManager {
  private clientId: string;
  private log: Map<string, OperationLog> = new Map();

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  logOperation(operation: OperationLog): void {
    if (this.log.has(operation.id)) return; // idempotent
    this.log.set(operation.id, operation);
  }

  getUnsyncedOperations(): OperationLog[] {
    return [...this.log.values()].sort((a, b) => a.version - b.version);
  }

  applyRemoteOperations(operations: OperationLog[]): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    for (const op of operations.sort((a, b) => a.version - b.version)) {
      const local = this.findLatestForNode(op.nodeId);
      if (!local || op.version >= local.version) {
        // accept remote by LWW
        // prune older entries for the same node
        for (const [id, existing] of [...this.log.entries()]) {
          if (existing.nodeId === op.nodeId && existing.version < op.version) {
            this.log.delete(id);
          }
        }
        // dedupe by id for idempotency
        if (!this.log.has(op.id)) {
          this.log.set(op.id, op);
        }
        resolutions.push({ type: 'autoResolved', strategy: 'lastWriteWins' });
      } else {
        // local newer; keep local
        resolutions.push({ type: 'autoResolved', strategy: 'lastWriteWins' });
      }
    }
    return resolutions;
  }

  private findLatestForNode(nodeId: string): OperationLog | undefined {
    let latest: OperationLog | undefined;
    for (const op of this.log.values()) {
      if (op.nodeId !== nodeId) continue;
      if (!latest || op.version > latest.version) latest = op;
    }
    return latest;
  }
}
