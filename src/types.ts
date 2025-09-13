// Types-only scaffold (will be fleshed out by tests)
export interface OutlineNode {
  id: string;
  parentId: string | null;
  content: string;
  order: number;
  depth: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OutlineDocument {
  id: string;
  title: string;
  nodes: OutlineNode[];
  version: number;
  lastSyncedVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataIndices {
  nodeById: Map<string, OutlineNode>;
  childrenByParent: Map<string | null, OutlineNode[]>;
  orderedChildren: Map<string | null, OutlineNode[]>;
  maxOrderByParent: Map<string | null, number>;
}

export enum ErrorCode {
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  INVALID_PARENT = 'INVALID_PARENT',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  OPERATION_CONFLICT = 'OPERATION_CONFLICT',
  SYNC_FAILURE = 'SYNC_FAILURE',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

export interface OperationError {
  code: ErrorCode;
  message: string;
  context: Record<string, any>;
  recoverable: boolean;
  suggestedAction?: string;
}

