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

export interface MoveNodeParams {
  nodeId: string;
  direction: 'up' | 'down';
}

export interface MoveNodeResult {
  success: boolean;
  affectedNodes?: OutlineNode[];
  error?: any;
}

export interface ChangeLevelParams {
  nodeId: string;
  operation: 'indent' | 'outdent';
}

export interface ChangeLevelResult {
  success: boolean;
  node?: OutlineNode;
  affectedDescendants?: OutlineNode[];
  error?: any;
}
