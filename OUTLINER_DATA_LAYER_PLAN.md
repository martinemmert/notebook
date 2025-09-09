## Outliner Data Layer — Tests-First Implementation Plan

This plan follows a strict tests-first approach. Every task is listed as a single line with a checkbox. Tasks are grouped by phase for clarity, but can be executed iteratively as needed.

### Phase 0 — Project Setup
- [ ] Initialize TypeScript project (tsconfig, strict mode, ES2020+, module resolution)
- [ ] Add linting/formatting (ESLint + Prettier) with CI-enforced rules
- [ ] Configure test runner (Vitest) with coverage thresholds (>95%)
- [ ] Add property-based testing library (`fast-check`) and helpers
- [ ] Add UUID generation (`uuid`) and date utilities (pure wrappers for testability)
- [ ] Add IndexedDB test shim (`fake-indexeddb`) for Node test environment
- [ ] Define NPM scripts (build, test, test:watch, lint, typecheck, coverage)
- [ ] Set up GitHub Actions (Node LTS matrix, cache, artifacts, coverage gate)

### Phase 1 — Domain Types and Invariants (Tests First)
- [ ] Write unit tests for type guard utilities and invariants on `OutlineNode` and `OutlineDocument`
- [ ] Implement minimal types/interfaces in `src/types.ts` to satisfy tests (no logic)
- [ ] Write tests for `ErrorCode`, `OperationError`, constructors/factory helpers
- [ ] Implement error utilities and safe constructors (minimal to pass tests)

### Phase 2 — Indexing Layer (Tests First)
- [ ] Write unit tests for `DataIndices` builder from a flat node array
- [ ] Write tests for efficient lookup: `nodeById`, `childrenByParent`, `orderedChildren`, `maxOrderByParent`
- [ ] Write tests for immutability guarantees (no in-place mutation of inputs)
- [ ] Implement `buildIndices(nodes)`, `updateIndices(change)` minimal variants to pass tests

### Phase 3 — Event System (Tests First)
- [ ] Write unit tests for `RealtimeManager` subscribe/unsubscribe semantics
- [ ] Write tests for `broadcast` ordering and delivery guarantees (sync + microtask flush)
- [ ] Implement in-memory `RealtimeManager` (UI-agnostic) to pass tests

### Phase 4 — Operation Log & Sync Contracts (Tests First)
- [ ] Write unit tests for `SyncManager.logOperation` (idempotent, monotonic versioning)
- [ ] Write tests for `getUnsyncedOperations` ordering and filtering
- [ ] Write tests for `applyRemoteOperations` happy-path merges (no conflicts)
- [ ] Write tests for conflict surfaces (version mismatches) and resolution hooks
- [ ] Implement minimal in-memory `SyncManager` to satisfy tests

### Phase 5 — Core Operations: Node Management (Tests First)
- [ ] Write unit tests: `createNode` (valid id, depth, order, timestamps, indices)
- [ ] Write unit tests: `updateContent` (versioning, timestamps, structure preservation)
- [ ] Write unit tests: `deleteNode` with `deleteSubtree`
- [ ] Write unit tests: `deleteNode` with `promoteChildren` (order renumbering)
- [ ] Implement `OutlineDataManager` skeleton exposing required APIs (no logic)
- [ ] Implement `TreeOperations` pure functions for create/update/delete to pass tests
- [ ] Wire `OutlineDataManager` to call `TreeOperations`, update indices, emit events

### Phase 6 — Core Operations: Traversal (Tests First)
- [ ] Write unit tests: `getHierarchy` (ancestors ordered root→leaf)
- [ ] Write unit tests: `getHierarchy` (descendants depth-first, depth limit)
- [ ] Write unit tests: `getHierarchy` (siblings in order)
- [ ] Write unit tests: `getFlattenedView` (depth-first ordering, partial loading)
- [ ] Implement traversal utilities to pass traversal tests

### Phase 7 — Core Operations: Reordering & Structure (Tests First)
- [ ] Write unit tests: `moveNode` up/down (swap adjacent siblings, edges)
- [ ] Write unit tests: `changeLevel` indent (become child of previous sibling)
- [ ] Write unit tests: `changeLevel` outdent (become sibling of parent)
- [ ] Write unit tests: depth recalculation for node and all descendants
- [ ] Implement reordering/level-change logic and efficient index updates

### Phase 8 — Error Handling (Tests First)
- [ ] Write unit tests: invalid parent, circular reference prevention, max depth exceeded
- [ ] Write unit tests: delete non-existent node, boundary move failures
- [ ] Write unit tests: content validation errors (constraints), version conflict handling
- [ ] Implement comprehensive error mapping to `OperationError` with suggested actions

### Phase 9 — Validation & Recovery (Tests First)
- [ ] Write unit tests: `ValidationEngine.validateDataIntegrity` detects orphaned/invalid-depth/duplicate-order/missing-parent/cycles
- [ ] Write unit tests: `RecoveryManager.repairCorruption` auto-fixes (attach to root, recalc depth, renumber, break cycles)
- [ ] Write unit tests: `rollbackOperation` and backup/restore flow
- [ ] Implement `ValidationEngine` rules and `RecoveryManager` actions

### Phase 10 — Storage Layer (Tests First)
- [ ] Write unit tests: `StorageProvider` contract (save/load/delete/backup/listBackups)
- [ ] Write unit tests: IndexedDB implementation including quota exceeded behavior
- [ ] Write unit tests: compression on large documents and decompression on load
- [ ] Write unit tests: backup-before-major-ops and retention policy
- [ ] Implement IndexedDB storage with localStorage fallback; compression and backoff

### Phase 11 — Remote Sync Semantics (Tests First)
- [ ] Write unit tests: WebSocket-style real-time sync (batching, retries, offline queue)
- [ ] Write unit tests: REST fallback for reliability with exponential backoff
- [ ] Write unit tests: reconciliation when connection restores (batch apply, order by version)
- [ ] Implement in-memory/mock transport layer and strategy policy to satisfy tests

### Phase 12 — Integration Scenarios (Tests First)
- [ ] Write integration test: create → move → delete sequence maintains integrity
- [ ] Write integration test: rapid indent/outdent remains consistent under stress
- [ ] Write integration test: concurrent edits from multiple clients resolve correctly
- [ ] Write integration test: offline ops sync correctly on reconnect
- [ ] Write integration test: large tree operations meet performance bounds

### Phase 13 — Property-Based Tests (Tests First)
- [ ] Write property test: any valid op sequence preserves tree integrity invariants
- [ ] Write property test: sibling `order` uniqueness per parent always holds
- [ ] Write property test: depth equals parent chain length for all nodes
- [ ] Write property test: all nodes remain reachable from root set
- [ ] Write property test: sync operations are commutative/associative/idempotent

### Phase 14 — Performance & Observability
- [ ] Add micro-benchmarks for create/move/indent/outdent/flattened view
- [ ] Add indices rebuild and incremental update benchmarks
- [ ] Add doc size scenarios (1k/5k/10k/50k nodes) with time/memory budgets
- [ ] Add optional instrumentation hooks and lightweight profiler toggles

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
- [ ] Implement max-depth guard and configurable policy
- [ ] Implement auto-backup cadence and manual restore path

---

Notes
- Tests precede all implementation tasks. Each implementation item should be the minimal code to satisfy its specific test set.
- Where remote services are referenced, provide in-memory/mocked transports that simulate latency/failures for tests.
