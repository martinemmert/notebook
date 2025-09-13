import { describe, it, expect, vi } from 'vitest';
import { RealtimeManager, DataChange } from '../../src/realtime.js';

const change = (id: string, type: DataChange['type']): DataChange => ({
  type,
  nodeId: id,
  diff: { content: 'x' },
  version: 1,
  affectedNodeIds: [],
});

describe('RealtimeManager', () => {
  it('subscribes and unsubscribes correctly', () => {
    const rt = new RealtimeManager();
    const cb = vi.fn();
    const unsub = rt.subscribe(cb);
    rt.broadcast(change('a', 'nodeUpdated'));
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    rt.broadcast(change('b', 'nodeUpdated'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('delivers changes in broadcast order and payload contains ids+diff', async () => {
    const rt = new RealtimeManager();
    const received: DataChange[] = [];
    rt.subscribe((ch) => received.push(ch));
    rt.broadcast(change('a', 'nodeCreated'));
    rt.broadcast(change('b', 'nodeUpdated'));
    rt.broadcast(change('c', 'nodeDeleted'));

    expect(received.map(c => c.nodeId)).toEqual(['a', 'b', 'c']);
    for (const ch of received) {
      expect(ch.diff).toBeDefined();
      expect(typeof ch.nodeId).toBe('string');
    }
  });
});
