import { ErrorCode, OperationError } from './types.js';

export function makeError(code: ErrorCode, message: string, context: Record<string, any> = {}, recoverable = false): OperationError {
  return { code, message, context, recoverable };
}

export function isRecoverable(error: OperationError): boolean {
  return Boolean(error.recoverable);
}

export function withSuggestedAction(error: OperationError, suggestedAction: string): OperationError {
  return { ...error, suggestedAction };
}
