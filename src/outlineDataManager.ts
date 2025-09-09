import { OutlineDocument, OutlineNode } from './types.js';
import { buildIndices } from './indices.js';
import { RealtimeManager } from './realtime.js';
import { SyncManager } from './sync.js';
import { CreateNodeParams, CreateNodeResult, DeleteNodeParams, DeleteNodeResult, UpdateContentParams, UpdateContentResult } from './api.js';
import { createNodeImmutable, updateContentImmutable, deleteNodeImmutable } from './treeOperations.js';

interface Providers {
  realtime: RealtimeManager;
  sync: SyncManager;
  id: { uuid: () => string };
  clock: { nowIso: () => string };
}

export class OutlineDataManager {
  private doc: OutlineDocument;
  private indices = buildIndices([]);
  private providers: Providers;

  constructor(initial: OutlineDocument, providers: Providers) {
    this.doc = initial;
    this.providers = providers;
    this.indices = buildIndices(this.doc.nodes);
  }

  getIndices() {
    return this.indices;
  }

  async createNode(params: CreateNodeParams): Promise<CreateNodeResult> {
    try {
      const id = this.providers.id.uuid();
      const now = this.providers.clock.nowIso();
      const pos = params.position ?? 'last';
      const { doc, node } = createNodeImmutable(this.doc, params.parentId, params.content, pos, now, id);
      this.doc = doc;
      this.indices = buildIndices(this.doc.nodes);
      this.providers.sync.logOperation({
        id: `op-${id}`,
        operation: 'create',
        nodeId: node.id,
        data: { content: node.content },
        version: node.version,
        timestamp: now,
        clientId: 'local',
      });
      this.providers.realtime.broadcast({ type: 'nodeCreated', nodeId: node.id, diff: { content: node.content }, version: doc.version, affectedNodeIds: [] });
      return { success: true, node };
    } catch (e: any) {
      return { success: false, error: e };
    }
  }

  async updateContent(params: UpdateContentParams): Promise<UpdateContentResult> {
    try {
      const now = this.providers.clock.nowIso();
      const { doc, node } = updateContentImmutable(this.doc, params.nodeId, params.content, now);
      this.doc = doc;
      this.indices = buildIndices(this.doc.nodes);
      this.providers.sync.logOperation({
        id: `op-${node.id}-${node.version}`,
        operation: 'update',
        nodeId: node.id,
        data: { content: node.content },
        version: node.version,
        timestamp: now,
        clientId: 'local',
      });
      this.providers.realtime.broadcast({ type: 'nodeUpdated', nodeId: node.id, diff: { content: node.content }, version: doc.version, affectedNodeIds: [] });
      return { success: true, node };
    } catch (e: any) {
      return { success: false, error: e };
    }
  }

  async deleteNode(params: DeleteNodeParams): Promise<DeleteNodeResult> {
    try {
      const now = this.providers.clock.nowIso();
      const { doc, deletedNodes, promotedNodes } = deleteNodeImmutable(this.doc, params.nodeId, params.strategy, now);
      this.doc = doc;
      this.indices = buildIndices(this.doc.nodes);
      this.providers.realtime.broadcast({ type: 'nodeDeleted', nodeId: params.nodeId, diff: {}, version: doc.version, affectedNodeIds: deletedNodes.map(n => n.id) });
      return { success: true, deletedNodes, promotedNodes };
    } catch (e: any) {
      return { success: false, error: e };
    }
  }
}
