import { describe, it, expect } from 'vitest';
import { ErrorCode, OperationError } from '../../src/types.js';
import { makeError, isRecoverable, withSuggestedAction } from '../../src/errors.js';


describe('Error utilities', () => {
  it('makeError creates a structured OperationError', () => {
    const err: OperationError = makeError(ErrorCode.NODE_NOT_FOUND, 'Node missing', { nodeId: 'x' }, false);
    expect(err.code).toBe(ErrorCode.NODE_NOT_FOUND);
    expect(err.message).toBe('Node missing');
    expect(err.context).toEqual({ nodeId: 'x' });
    expect(err.recoverable).toBe(false);
  });

  it('isRecoverable detects recoverable errors', () => {
    const rec = makeError(ErrorCode.SYNC_FAILURE, 'Temporary', {}, true);
    const non = makeError(ErrorCode.DATA_CORRUPTION, 'Corrupt', {}, false);
    expect(isRecoverable(rec)).toBe(true);
    expect(isRecoverable(non)).toBe(false);
  });

  it('withSuggestedAction adds a friendly action hint immutably', () => {
    const base = makeError(ErrorCode.INVALID_PARENT, 'Invalid parent', { parentId: 'p' }, true);
    const enriched = withSuggestedAction(base, 'Attach to root');
    expect(enriched).not.toBe(base);
    expect(enriched.suggestedAction).toBe('Attach to root');
    expect(base.suggestedAction).toBeUndefined();
  });
});
