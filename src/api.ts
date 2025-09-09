import type { OutlineNode } from './types.js';

export interface CreateNodeParams {
  parentId: string | null;
  content: string;
  position?: 'first' | 'last' | { afterNodeId: string };
}

export interface CreateNodeResult {
  success: boolean;
  node?: OutlineNode;
  error?: any;
}

export interface UpdateContentParams {
  nodeId: string;
  content: string;
  version?: number;
}

export interface UpdateContentResult {
  success: boolean;
  node?: OutlineNode;
  conflictResolution?: any;
  error?: any;
}

export interface DeleteNodeParams {
  nodeId: string;
  strategy: 'deleteSubtree' | 'promoteChildren';
}

export interface DeleteNodeResult {
  success: boolean;
  deletedNodes?: OutlineNode[];
  promotedNodes?: OutlineNode[];
  error?: any;
}
