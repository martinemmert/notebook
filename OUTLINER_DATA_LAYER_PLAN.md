## Outliner Data Layer — Tests-First Implementation Plan

This plan follows a strict tests-first approach. Every task is listed as a single line with a checkbox. Tasks are grouped by phase for clarity, but can be executed iteratively as needed.

### Phase 0 — Project Setup
- [x] Initialize TypeScript project (tsconfig, strict mode, ES2020+, module resolution)
- [x] Add linting/formatting (ESLint + Prettier) with CI-enforced rules
- [x] Configure test runner (Vitest) with coverage thresholds (>95%)
- [x] Add property-based testing library (`fast-check`) and helpers
- [ ] Add UUID generation (`uuid`) and date utilities (pure wrappers for testability)
- [x] Add IndexedDB test shim (`fake-indexeddb`) for Node test environment
- [x] Define NPM scripts (build, test, test:watch, lint, typecheck, coverage)
- [ ] Set up GitHub Actions (Node LTS matrix, cache, artifacts, coverage gate)

### Phase 1 — Domain Types and Invariants (Tests First)
- [x] Write unit tests for type guard utilities and invariants on `OutlineNode` and `OutlineDocument`
- [x] Implement minimal types/interfaces in `src/types.ts` to satisfy tests (no logic)
- [x] Write tests for `ErrorCode`, `OperationError`, constructors/factory helpers
- [x] Implement error utilities and safe constructors (minimal to pass tests)

### Phase 2 — Indexing Layer (Tests First)
- [x] Write unit tests for `DataIndices` builder from a flat node array
- [x] Write tests for efficient lookup: `nodeById`, `childrenByParent`, `orderedChildren`, `maxOrderByParent`
- [x] Write tests for immutability guarantees (no in-place mutation of inputs)
- [x] Implement `buildIndices(nodes)`, `updateIndices(change)` minimal variants to pass tests

### Phase 3 — Event System (Tests First)
- [x] Write unit tests for `RealtimeManager` subscribe/unsubscribe semantics
- [x] Write tests for `broadcast` ordering and delivery guarantees; payload includes node ids and diffs
- [x] Implement in-memory `RealtimeManager` (UI-agnostic) to pass tests

### Phase 4 — Operation Log & Sync Contracts (Tests First)
- [x] Write unit tests for `SyncManager.logOperation` (idempotent, monotonic versioning)
- [x] Write tests for `getUnsyncedOperations` ordering and filtering
- [x] Write tests for `applyRemoteOperations` happy-path merges (no conflicts)
- [x] Write tests for conflict surfaces (version mismatches) with default LWW and resolution hooks
- [x] Implement minimal in-memory `SyncManager` to satisfy tests

### Phase 5 — Core Operations: Node Management (Tests First)
- [x] Write unit tests: `createNode` (valid id, depth, order, timestamps, indices; `afterNodeId` adopts target node's parent)
- [x] Write unit tests: `updateContent` (versioning, timestamps, structure preservation)
- [x] Write unit tests: `deleteNode` with `deleteSubtree`
- [x] Write unit tests: `deleteNode` with `promoteChildren` (order renumbering)
- [x] Implement `OutlineDataManager` skeleton exposing async public APIs (no logic)
- [x] Implement `TreeOperations` pure functions for create/update/delete to pass tests
- [x] Wire `OutlineDataManager` to call `TreeOperations`, update indices, emit events

### Phase 6 — Core Operations: Traversal (Tests First)
- [x] Write unit tests: `getHierarchy` (ancestors ordered root→leaf)
- [x] Write unit tests: `getHierarchy` (descendants depth-first, depth limit)
- [x] Write unit tests: `getHierarchy` (siblings in order)
- [x] Write unit tests: `getFlattenedView` (depth-first ordering, partial loading)
- [x] Implement traversal utilities to pass traversal tests

### Phase 7 — Core Operations: Reordering & Structure (Tests First)
- [x] Write unit tests: `moveNode` up/down (swap adjacent siblings, edges)
- [x] Write unit tests: `changeLevel` indent (become child of previous sibling)
- [x] Write unit tests: `changeLevel` outdent (become sibling of parent)
- [x] Write unit tests: depth recalculation for node and all descendants
- [x] Implement reordering/level-change logic and efficient index updates

### Phase 8 — Error Handling (Tests First)
- [x] Write unit tests: invalid parent, circular reference prevention
- [x] Write unit tests: delete non-existent node, boundary move failures
- [x] Write unit tests: version conflict handling
- [ ] Implement comprehensive error mapping to `OperationError` with suggested actions

### Phase 9 — Validation & Recovery (Tests First)
- [x] Write unit tests: `ValidationEngine.validateDataIntegrity` detects orphaned/invalid-depth/duplicate-order/missing-parent/cycles
- [x] Write unit tests: `RecoveryManager.repairCorruption` auto-fixes (attach to root, recalc depth, renumber, break cycles)
- [ ] Write unit tests: `rollbackOperation` and backup/restore flow
- [x] Implement `ValidationEngine` rules and `RecoveryManager` actions

### Phase 10 — Storage Layer (Tests First)
- [x] Write unit tests: `StorageProvider` contract (save/load/delete/backup/listBackups)
- [x] Write unit tests: IndexedDB implementation including quota exceeded behavior
- [ ] Write unit tests: backup-before-major-ops and retention policy
- [x] Implement IndexedDB storage with localStorage fallback; robust error handling and backoff (no compression)

### Phase 11 — Remote Sync Semantics (Tests First)
- [x] Write unit tests: WebSocket-style real-time sync (batching, retries, offline queue)
- [x] Write unit tests: REST fallback for reliability with exponential backoff
- [x] Write unit tests: reconciliation when connection restores (batch apply, order by version)
- [x] Implement in-memory/mock transport layer and strategy policy to satisfy tests

### Phase 12 — Integration Scenarios (Tests First)
 - [x] Write integration test: create → move → delete sequence maintains integrity
 - [x] Write integration test: rapid indent/outdent remains consistent under stress
 - [x] Write integration test: concurrent edits from multiple clients resolve correctly
 - [x] Write integration test: offline ops sync correctly on reconnect
 

### Phase 13 — Property-Based Tests (Tests First)
- [x] Write property test: any valid op sequence preserves tree integrity invariants
- [ ] Write property test: sibling `order` uniqueness per parent always holds
- [ ] Write property test: depth equals parent chain length for all nodes
- [ ] Write property test: all nodes remain reachable from root set
- [ ] Write property test: sync operations are commutative/associative/idempotent



### Phase 15 — Developer Experience & Documentation
- [ ] Generate API docs (TSDoc + typed examples)
- [ ] Document error handling and suggested actions
- [ ] Document recovery procedures and integrity rules
- [ ] Document sync behavior and transport fallbacks
- [ ] Provide integration guide for UI consumers with sample event wiring

### Phase 16 — Release Readiness
- [ ] Final type and lint pass; no `any`, no dead code
- [ ] Ensure deterministic tests and isolated global state
- [ ] Verify coverage >95% across units/integration/property tests
- [ ] Produce CHANGELOG and versioned release notes
- [ ] Tag release and publish package (if applicable)

### Cross-Cutting Invariants (Enforced by Tests)
- [ ] No in-place mutations of public inputs or returned structures (immutability)
- [ ] Sibling `order` values are contiguous integers starting at 0 after any operation
- [ ] No circular references; all nodes reachable from root set (`parentId` null)
- [ ] `depth` strictly equals parent chain length
- [ ] Versions are monotonic; operation logs are idempotent and ordered
- [ ] Event delivery is at-least-once locally, deduplicated by operation id for subscribers

### Test Utilities & Fixtures
- [ ] Create fixture builders for documents/trees with shape presets (wide/deep/mixed)
- [ ] Create deterministic clock and UUID providers (injectable for tests)
- [ ] Create in-memory `StorageProvider` and `RealtimeManager` test doubles
- [ ] Create operation generators for property-based tests with validity filters

### Risk & Recovery Tasks
- [ ] Implement safe renumber strategy for massive sibling lists (O(n) cap)
- [ ] Implement fractional ordering fallback (optional) for mid-insert stress (behind flag)
- [ ] Implement auto-backup cadence and manual restore path

---

Notes
- Tests precede all implementation tasks. Each implementation item should be the minimal code to satisfy its specific test set.
- Where remote services are referenced, provide in-memory/mocked transports that simulate latency/failures for tests.
