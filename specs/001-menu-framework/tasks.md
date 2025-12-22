# Tasks: Context Management and Core Commands

**Input**: Design documents from `/specs/001-menu-framework/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install dependencies: zod (validation) and ora (progress spinners) via `bun install zod ora`
- [X] T002 [P] Create configuration module structure: `src/config/types.ts`, `src/config/schema.ts`, `src/config/loader.ts`, `src/config/writer.ts`
- [X] T003 [P] Create command module structure: `src/cli/commands/context/index.ts`, `src/cli/commands/app/index.ts`, `src/cli/commands/version/index.ts`
- [X] T004 [P] Create test directory structure: `tests/unit/config/`, `tests/unit/commands/`, `tests/integration/`, `tests/e2e/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Configuration Foundation

- [X] T005 [P] Define CliContext type and schema in `src/config/types.ts` with Zod validation (account, team, moniker, provider, region - all optional)
- [X] T006 [P] Create Zod schema in `src/config/schema.ts` for CliContext validation (provider enum, moniker pattern)
- [X] T007 Write unit test for config schema validation in `tests/unit/config/schema.test.ts` (valid/invalid cases) - MUST FAIL
- [X] T008 Implement config file loader in `src/config/loader.ts` with global + project-local merge logic (uses research.md deep merge pattern)
- [X] T009 Write unit test for config loader in `tests/unit/config/loader.test.ts` (global-only, project-local override, merge behavior) - MUST FAIL
- [X] T010 Implement config file writer in `src/config/writer.ts` with atomic write (temp + rename pattern from research.md) and merge-on-write behavior
- [X] T011 Write unit test for config writer in `tests/unit/config/writer.test.ts` (create, merge, atomic write) - MUST FAIL
- [X] T012 Create validation utility in `src/utils/validation.ts` for required context value checking with descriptive error messages (FR-038)

### Global Options Setup

- [X] T013 Update `src/cli/options.ts` to add new global options: --account, --team, --moniker (add to existing --provider, --region)
- [X] T014 Update CLI initialization in `src/cli/index.ts` to load config (global + project-local) and merge with flags before command execution
- [X] T015 Write integration test for config loading + flag override in `tests/integration/config-precedence.test.ts` (flags > project-local > global) - MUST FAIL

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure CLI Context (Priority: P1) 🎯 MVP

**Goal**: Enable persistent context configuration to reduce repetitive flag usage

**Independent Test**: Run `lcp context write --account test --team dev`, then `lcp context read` to verify persistence, then any command to verify stored values are used as defaults

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US1] Write unit test for context read command in `tests/unit/commands/context.test.ts` (read global, read merged, JSON output) - MUST FAIL
- [X] T017 [P] [US1] Write unit test for context write command in `tests/unit/commands/context.test.ts` (write global, write local, merge behavior) - MUST FAIL
- [X] T018 [P] [US1] Write unit test for context clear command in `tests/unit/commands/context.test.ts` (clear global, clear local) - MUST FAIL
- [X] T019 [P] [US1] Write e2e test for context workflow in `tests/e2e/context-commands.test.ts` (write → read → clear → read) - MUST FAIL

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement `lcp context read` command in `src/cli/commands/context/read.ts` with table formatter and --json support
- [X] T021 [P] [US1] Implement `lcp context write` command in `src/cli/commands/context/write.ts` with --local flag and merge behavior (calls config writer)
- [X] T022 [P] [US1] Implement `lcp context clear` command in `src/cli/commands/context/clear.ts` with --local flag (removes file)
- [X] T023 [US1] Register context commands in `src/cli/commands/context/index.ts` and export command group
- [X] T024 [US1] Integrate context command group into main CLI in `src/cli/commands/index.ts`
- [X] T025 [US1] Update help text and add examples for context commands

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Verify: `lcp context write/read/clear` work correctly.

---

## Phase 4: User Story 2 - Initialize New Application (Priority: P1) 🎯 MVP

**Goal**: Enable application creation with context defaults

**Independent Test**: Run `lcp app init --config <file>` and verify application exists via `lcp app read`

### Tests for User Story 2

- [X] T026 [P] [US2] Write unit test for app init command in `tests/unit/commands/app.test.ts` (init with context, init with flags, init with config file) - MUST FAIL
- [X] T027 [P] [US2] Write integration test for app init in `tests/integration/app-lifecycle.test.ts` (init → read workflow with mock provider) - MUST FAIL
- [X] T028 [P] [US2] Write e2e test for app init in `tests/e2e/app-commands.test.ts` (missing context error, successful init) - MUST FAIL

### Implementation for User Story 2

- [X] T029 [US2] Implement `lcp app init` command in `src/cli/commands/app/init.ts` with context loading, validation, and core library integration
- [X] T030 [US2] Add descriptive error handling for missing context values (account, team, moniker) with instructions (FR-038)
- [X] T031 [US2] Add duplicate application detection and error message (FR-010 acceptance scenario 3)
- [X] T032 [US2] Register app init command in `src/cli/commands/app/index.ts`
- [X] T033 [US2] Integrate app command group into main CLI in `src/cli/commands/index.ts`
- [X] T034 [US2] Update help text and add examples for app init

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Verify: context configuration flows into app init.

---

## Phase 5: User Story 3 - Manage Application Configuration (Priority: P1) 🎯 MVP

**Goal**: Enable viewing, validating, and updating application configuration

**Independent Test**: Create config file, run `lcp app validate --config <file>`, then `lcp app update --config <file>`, verify with `lcp app read`

### Tests for User Story 3

- [X] T035 [P] [US3] Write unit test for app read command in `tests/unit/commands/app.test.ts` (read existing, read non-existent, JSON output) - MUST FAIL
- [X] T036 [P] [US3] Write unit test for app validate command in `tests/unit/commands/app.test.ts` (valid config, invalid config, schema errors) - MUST FAIL
- [X] T037 [P] [US3] Write unit test for app update command in `tests/unit/commands/app.test.ts` (update with valid config, reject invalid) - MUST FAIL
- [X] T038 [US3] Write integration test for app configuration workflow in `tests/integration/app-lifecycle.test.ts` (validate → update → read) - MUST FAIL

### Implementation for User Story 3

- [X] T039 [P] [US3] Implement `lcp app read` command in `src/cli/commands/app/read.ts` with JSON output support and table formatter
- [X] T040 [P] [US3] Implement `lcp app validate` command in `src/cli/commands/app/validate.ts` with schema validation (no state changes)
- [X] T041 [P] [US3] Implement `lcp app update` command in `src/cli/commands/app/update.ts` with validation and core library integration
- [X] T042 [US3] Add validation error formatting with specific field-level errors (FR-015, FR-016)
- [X] T043 [US3] Register app read, validate, update commands in `src/cli/commands/app/index.ts`
- [X] T044 [US3] Update help text and add examples for app read/validate/update

**Checkpoint**: All P1 app commands (init, read, validate, update) should now be functional independently.

---

## Phase 6: User Story 4 - Manage Application Versions (Priority: P2)

**Goal**: Enable version creation, management, and caching

**Independent Test**: Run `lcp version add --version v1.0.0 --config <file>`, then `lcp version read --version v1.0.0`, add another version and verify multiple versions coexist

### Tests for User Story 4

- [X] T045 [P] [US4] Write unit test for version add command in `tests/unit/commands/version.test.ts` (add with config, duplicate version)
- [X] T046 [P] [US4] Write unit test for version read command in `tests/unit/commands/version.test.ts` (read existing, read non-existent)
- [ ] T047 [P] [US4] Write unit test for version update command in `tests/unit/commands/version.test.ts` (update config) - MUST FAIL
- [ ] T048 [P] [US4] Write unit test for version delete command in `tests/unit/commands/version.test.ts` (delete unused version, prevent delete of deployed) - MUST FAIL
- [ ] T049 [P] [US4] Write unit test for version cache command in `tests/unit/commands/version.test.ts` (cache file, replace previous) - MUST FAIL
- [ ] T050 [US4] Write integration test for version lifecycle in `tests/integration/version-workflow.test.ts` (add → read → update → cache → delete) - MUST FAIL

### Implementation for User Story 4

- [X] T051 [P] [US4] Implement `lcp version add` command in `src/cli/commands/version/add.ts` with config file validation and core library integration
- [X] T052 [P] [US4] Implement `lcp version read` command in `src/cli/commands/version/read.ts` with JSON output support
- [ ] T053 [P] [US4] Implement `lcp version update` command in `src/cli/commands/version/update.ts` with config validation
- [ ] T054 [P] [US4] Implement `lcp version delete` command in `src/cli/commands/version/delete.ts` with deployed version check
- [ ] T055 [P] [US4] Implement `lcp version cache` command in `src/cli/commands/version/cache.ts` with file upload and replacement logic (FR-021b)
- [X] T056 [US4] Add --ver flag validation (ensure value provided) for all version commands (FR-025) - using --ver instead of --version to avoid Commander.js conflict
- [X] T057 [US4] Register all version commands (add, read, deploy) in `src/cli/commands/version/index.ts`
- [X] T058 [US4] Integrate version command group into main CLI in `src/cli/commands/index.ts`
- [X] T059 [US4] Update help text and add examples for all version commands

**Checkpoint**: All version management commands (add, read, update, delete, cache) should be functional.

---

## Phase 7: User Story 5 - Deploy Application Versions (Priority: P1) 🎯 MVP

**Goal**: Enable version deployment with scope and mode control

**Independent Test**: Add multiple versions, run `lcp version deploy --version v1.0.0`, verify that version becomes active. Test different scopes (--app-only, --dependencies-only, --all) independently.

### Tests for User Story 5

- [X] T060 [P] [US5] Write unit test for version deploy command in `tests/unit/commands/version.test.ts` (scope flags, mode flag, mutual exclusivity)
- [ ] T061 [P] [US5] Write integration test for deployment in `tests/integration/version-deployment.test.ts` (local mode, platform mode, scopes) - MUST FAIL
- [ ] T062 [P] [US5] Write e2e test for deployment workflow in `tests/e2e/version-commands.test.ts` (deploy → verify active, deploy another → first becomes inactive) - MUST FAIL

### Implementation for User Story 5

- [X] T063 [US5] Implement `lcp version deploy` command in `src/cli/commands/version/deploy.ts` with scope flags (--app-only, --dependencies-only, --all) and mutual exclusivity validation (FR-029)
- [X] T064 [US5] Add --platform-tooling flag support for async deployment with event ID return (FR-030, FR-032)
- [X] T065 [US5] Implement local deployment mode with progress feedback simulation (FR-031, FR-033)
- [ ] T066 [US5] Add concurrent deployment detection and warning system (FR-033a, FR-033b) - check if deployment in progress, warn on conflict
- [X] T067 [US5] Add --dry-run support with deployment plan preview (shows what would be deployed)
- [X] T068 [US5] Register deploy command in `src/cli/commands/version/index.ts`
- [X] T069 [US5] Update help text and add examples for version deploy with all flags

**Checkpoint**: All deployment scenarios should work (local/platform, all scopes, dry-run, concurrent warnings).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T070 [P] Add --verbose support across all commands with detailed operation logging
- [ ] T071 [P] Add --debug support across all commands with internal state visibility
- [ ] T072 [P] Add --quiet support across all commands to suppress non-essential output
- [ ] T073 [P] Verify all commands support --json output consistently
- [ ] T074 [P] Add exit code validation in all e2e tests (success: 0, errors: 1, invalid usage: 2)
- [ ] T075 Verify all error messages include context and corrective actions (FR-038)
- [ ] T076 Run quickstart.md validation - execute all commands from quickstart guide to verify accuracy
- [ ] T077 [P] Add JSDoc comments to all public functions in src/config/ and src/cli/commands/
- [ ] T078 Update README.md with command reference and examples from quickstart.md
- [X] T079 Run `bun run typecheck` and fix any type errors - No type errors found
- [X] T080 Run `bun test` and verify 80% coverage minimum - Achieved 81.56% coverage (158 tests passing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Context) can proceed first (P1, no dependencies on other stories)
  - US2 (App Init) can proceed after US1 or in parallel (P1, uses context)
  - US3 (App Config) depends on US2 (needs initialized app) but can be tested independently
  - US4 (Versions) depends on US2 (needs initialized app) but can start after US2
  - US5 (Deploy) depends on US4 (needs versions) but is P1 priority
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Context - P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (App Init - P1)**: Can start after Foundational + US1 (uses context values)
- **User Story 3 (App Config - P1)**: Can start after US2 (needs app to exist) - independently testable with mock app
- **User Story 4 (Versions - P2)**: Can start after US2 (needs app to exist) - independently testable
- **User Story 5 (Deploy - P1)**: Can start after US4 (needs versions) - independently testable

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Unit tests before implementation
- Integration tests alongside implementation
- E2E tests after implementation
- Story complete and tested before moving to next priority

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- T002, T003, T004 can run in parallel (different directories)

**Foundational Phase (Phase 2)**:
- T005, T006 can run in parallel (types and schema)
- T007 runs after T005+T006
- T008, T009, T010, T011 can run in parallel (loader and writer are independent)
- T013, T014 can start in parallel after config foundation

**User Story 1 (Phase 3)**:
- T016, T017, T018, T019 can run in parallel (different test files/suites)
- T020, T021, T022 can run in parallel (different command files)

**User Story 2 (Phase 4)**:
- T026, T027, T028 can run in parallel (different test files)
- Can start after US1 complete or in parallel with US1 (if team capacity)

**User Story 3 (Phase 5)**:
- T035, T036, T037 can run in parallel (different test cases)
- T039, T040, T041 can run in parallel (different command files)

**User Story 4 (Phase 6)**:
- T045-T049 can run in parallel (different test cases)
- T051-T055 can run in parallel (different command files)

**User Story 5 (Phase 7)**:
- T060, T061, T062 can run in parallel (different test files)

**Polish Phase (Phase 8)**:
- T070-T074 can run in parallel (different global flags)
- T077, T078, T079 can run in parallel (documentation and type checking)

---

## Parallel Example: Foundational Phase

```bash
# Launch config foundation tasks together:
Task: "Define CliContext type and schema in src/config/types.ts"
Task: "Create Zod schema in src/config/schema.ts"

# After types/schema complete, launch loader and writer together:
Task: "Implement config file loader in src/config/loader.ts"
Task: "Implement config file writer in src/config/writer.ts"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together:
Task: "Write unit test for context read command in tests/unit/commands/context.test.ts"
Task: "Write unit test for context write command in tests/unit/commands/context.test.ts"
Task: "Write unit test for context clear command in tests/unit/commands/context.test.ts"
Task: "Write e2e test for context workflow in tests/e2e/context-commands.test.ts"
```

## Parallel Example: User Story 1 Implementation

```bash
# Launch all command implementations for User Story 1 together:
Task: "Implement lcp context read command in src/cli/commands/context/read.ts"
Task: "Implement lcp context write command in src/cli/commands/context/write.ts"
Task: "Implement lcp context clear command in src/cli/commands/context/clear.ts"
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T015) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 - Context (T016-T025)
4. Complete Phase 4: User Story 2 - App Init (T026-T034)
5. Complete Phase 5: User Story 3 - App Config (T035-T044)
6. Skip Phase 6: User Story 4 (P2 priority - defer)
7. Complete Phase 7: User Story 5 - Deploy (T060-T069) - requires basic version support from US4
8. Complete Phase 8: Polish (T070-T080)
9. **STOP and VALIDATE**: Test all P1 stories independently
10. Deploy/demo if ready

**Note**: User Story 5 (Deploy - P1) depends on User Story 4 (Versions - P2) for basic version management. Consider implementing minimal version support (add + read) from US4 to unblock deployment.

### Incremental Delivery

1. Complete Setup + Foundational (T001-T015) → Foundation ready
2. Add User Story 1 (T016-T025) → Test independently → Demo (context management working!)
3. Add User Story 2 (T026-T034) → Test independently → Demo (app initialization working!)
4. Add User Story 3 (T035-T044) → Test independently → Demo (full app lifecycle working!)
5. Add User Story 4 (T045-T059) → Test independently → Demo (version management working!)
6. Add User Story 5 (T060-T069) → Test independently → Demo (deployment working! - MVP complete)
7. Polish (T070-T080) → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T015)
2. Once Foundational is done (after T015):
   - Developer A: User Story 1 - Context (T016-T025)
   - Developer B: User Story 2 - App Init (T026-T034) - starts after US1 T020-T022 (needs context commands)
3. After US1 and US2 complete:
   - Developer A: User Story 3 - App Config (T035-T044)
   - Developer B: User Story 4 - Versions (T045-T059)
4. After US4 complete:
   - Developer A or B: User Story 5 - Deploy (T060-T069)
5. Team: Polish together (T070-T080)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability (US1-US5)
- TDD workflow enforced: Write failing tests BEFORE implementation
- Each user story should be independently completable and testable
- Verify tests fail (Red) before implementing (Green), then refactor
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tasks include explicit file paths from plan.md project structure
- 80 total tasks: 4 setup, 11 foundational, 10 US1, 9 US2, 10 US3, 15 US4, 10 US5, 11 polish
- Estimated MVP scope (P1 only): ~55 tasks (Setup + Foundational + US1 + US2 + US3 + US5 + Polish)
