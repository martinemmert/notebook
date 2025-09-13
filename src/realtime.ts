export type DataChange = {
  type: 'nodeCreated' | 'nodeUpdated' | 'nodeDeleted' | 'nodeMoved';
  nodeId: string;
  diff?: Record<string, unknown>;
  affectedNodeIds?: string[];
  version: number;
};

export type Unsubscribe = () => void;

export class RealtimeManager {
  private subscribers: Set<(change: DataChange) => void> = new Set();

  subscribe(callback: (change: DataChange) => void): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  broadcast(change: DataChange): void {
    for (const cb of this.subscribers) {
      cb(change);
    }
  }
}
