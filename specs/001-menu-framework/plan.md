# Implementation Plan: Context Management and Core Commands

**Branch**: `001-menu-framework` | **Date**: 2025-12-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-menu-framework/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement CLI context configuration management with persistent storage in both global (`~/.lcp/config.json`) and project-local (`.lcp/config.json`) configuration files. Add four command groups: Context (read/write/clear), App (init/read/update/validate), Version (add/update/delete/read/cache/deploy), and deployment control with local and platform-tooling modes. Context values (account, team, moniker, provider, region) are stored persistently with merge-on-write behavior and can be overridden per-command via flags.

## Technical Context

**Language/Version**: TypeScript (Bun 1.0+ runtime)
**Primary Dependencies**: commander (CLI parsing), @stainedhead/lc-platform-dev-accelerators (core library)
**Storage**: JSON files (~/.lcp/config.json for global, .lcp/config.json for project-local), platform storage (via core library for cache/deployment)
**Testing**: Bun test runner (`bun test`) with unit, integration, and e2e tests
**Target Platform**: CLI tool (macOS/Linux/Windows via Bun)
**Project Type**: Single CLI project (thin wrapper over core library)
**Performance Goals**: Command response < 500ms for local operations, deployment feedback within 60s
**Constraints**: No direct cloud SDK calls (must use core library), 80% test coverage minimum, idempotent commands
**Scale/Scope**: 4 command groups (context, app, version, deploy), ~15 subcommands total, 5 new configuration fields

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: CLI-First Interface Design ✅

- All functionality accessible via `lcp` commands
- Supports `--json` flag for machine-readable output (FR-009, FR-037)
- Exit codes follow conventions (defined in AGENTS.md)
- Commands are idempotent where possible (context write merges, deploy activates specific version)
- `--help` support required for all commands
- `--verbose`, `--quiet`, `--debug`, `--dry-run` flags supported (FR-037)
- Composable with Unix tools (JSON output, stdout/stderr separation)

**Status**: PASS - All requirements met by specification

### Principle II: Clean Architecture Alignment ✅

- CLI wraps `@stainedhead/lc-platform-dev-accelerators` library
- No direct cloud SDK calls permitted
- Configuration flows through core library's factory patterns
- CLI handles only: argument parsing, output formatting, config file I/O
- Provider selection uses core library's ProviderType enum

**Status**: PASS - Architecture follows thin presentation layer pattern

### Principle III: Test-First Development (NON-NEGOTIABLE) ✅

- TDD workflow required: Red-Green-Refactor
- E2E tests for all commands with exit code validation
- Unit tests for argument parsing, config merging, error handling
- 80% coverage minimum enforced
- Acceptance scenarios in spec provide test templates

**Status**: PASS - Test strategy defined, will be enforced in tasks.md

### Principle IV: Simplicity & YAGNI ✅

- No speculative features (only requested commands implemented)
- No premature abstractions (direct commander.js usage)
- Error handling only for real scenarios (corrupt files, missing values, network failures)
- Configuration options match user requests (account, team, moniker, provider, region)
- No backwards-compatibility shims needed (greenfield commands)

**Status**: PASS - Minimal implementation approach

### Principle V: Observability & Debuggability ✅

- `--verbose`: detailed operation progress required
- `--debug`: internal state visibility required
- Error messages must include context and corrective actions (FR-038)
- No silent failures permitted (SC-006)
- `--dry-run` support for destructive operations

**Status**: PASS - Observability requirements captured

**OVERALL GATE STATUS**: ✅ PASS - All constitutional principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-menu-framework/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── config-schema.json
│   └── app-config-schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── index.ts                    # Main CLI entry (existing)
│   ├── options.ts                  # Global options setup (existing)
│   └── commands/
│       ├── index.ts                # Command registration (existing)
│       ├── context/                # NEW: Context commands
│       │   ├── index.ts
│       │   ├── read.ts
│       │   ├── write.ts
│       │   └── clear.ts
│       ├── app/                    # NEW: App commands
│       │   ├── index.ts
│       │   ├── init.ts
│       │   ├── read.ts
│       │   ├── update.ts
│       │   └── validate.ts
│       └── version/                # NEW: Version commands
│           ├── index.ts
│           ├── add.ts
│           ├── read.ts
│           ├── update.ts
│           ├── delete.ts
│           ├── cache.ts
│           └── deploy.ts
│
├── config/                         # NEW: Configuration management
│   ├── loader.ts                   # Load global + project-local config
│   ├── writer.ts                   # Write config with merge behavior
│   ├── types.ts                    # Config type definitions
│   └── schema.ts                   # Config validation schemas
│
├── formatters/                     # Existing: Output formatting
│   ├── json.ts
│   ├── table.ts
│   └── index.ts
│
└── utils/
    ├── errors.ts                   # Existing: Error handling
    ├── logger.ts                   # Existing: Logging
    └── validation.ts               # NEW: Config/schema validation

tests/
├── unit/
│   ├── config/                     # NEW: Config loader/writer tests
│   │   ├── loader.test.ts
│   │   ├── writer.test.ts
│   │   └── merge.test.ts
│   └── commands/                   # NEW: Command parsing tests
│       ├── context.test.ts
│       ├── app.test.ts
│       └── version.test.ts
│
├── integration/                    # NEW: Integration tests with mock provider
│   ├── context-workflow.test.ts
│   ├── app-lifecycle.test.ts
│   └── version-deployment.test.ts
│
└── e2e/                            # NEW: End-to-end CLI tests
    ├── context-commands.test.ts
    ├── app-commands.test.ts
    └── version-commands.test.ts
```

**Structure Decision**: Single project structure maintained. This CLI is a thin presentation layer, so all new code lives in `src/cli/commands/` (command implementations) and `src/config/` (configuration management). Existing formatter and error handling utilities are reused. Tests mirror source structure with unit/integration/e2e separation per TDD principle.

## Complexity Tracking

> **No violations requiring justification**

All complexity is justified by user requirements and constitutional principles. No abstractions beyond what's needed.

---

## Phase 0: Research (COMPLETE)

**Status**: ✅ COMPLETE

**Artifacts Generated**:
- `research.md` - Comprehensive analysis of configuration management and deployment patterns

**Key Decisions**:
1. **Config files**: `~/.lcp/config.json` (global) + `.lcp/config.json` (project-local)
2. **Validation**: Zod for TypeScript type inference
3. **Atomic writes**: Temp file + rename pattern (Bun optimized)
4. **Progress feedback**: ora library for spinners + custom logger
5. **Deployment**: Local polling (Phase 1), platform-based async (Future)
6. **Concurrency**: File-based locks with PID checking
7. **State tracking**: Local JSON file (`~/.lcp/state/deployments.json`)

---

## Phase 1: Design & Contracts (COMPLETE)

**Status**: ✅ COMPLETE

**Artifacts Generated**:
- `data-model.md` - Entity definitions, relationships, validation rules, lifecycle
- `contracts/config-schema.json` - CLI context configuration schema
- `contracts/app-config-schema.json` - Application configuration schema
- `quickstart.md` - User-facing quickstart guide with examples
- `CLAUDE.md` - Updated agent context with new technologies

**Data Model Summary**:
- **CLI Context**: Local storage (global + project-local), 5 optional fields, merge semantics
- **Application**: Platform-managed, identified by (account, team, moniker), has versions
- **Version**: Platform-managed, has optional cached file, one active per application
- **Deployment**: Ephemeral operation, supports app-only/dependencies-only/all scopes

**Contracts Summary**:
- Config schema: JSON Schema draft-07, all fields optional, provider enum validated
- App schema: Placeholder (actual schema from core library), includes environment, resources, dependencies

---

## Constitution Re-Check (Post-Design)

*Re-evaluating compliance after Phase 1 design decisions*

### Principle I: CLI-First Interface Design ✅

**Re-check**: PASS
- All functionality via `lcp` commands (confirmed in quickstart.md)
- `--json` support specified (FR-009, examples in quickstart)
- Exit codes defined (AGENTS.md reference maintained)
- Help support planned for all commands
- `--verbose`, `--quiet`, `--debug`, `--dry-run` integrated in design

**No violations introduced**

### Principle II: Clean Architecture Alignment ✅

**Re-check**: PASS
- Configuration management stays in CLI layer (config/ directory)
- Platform operations via core library only (confirmed in data-model.md)
- No direct cloud SDK calls in design
- Clear separation: CLI handles files, core handles platform

**No violations introduced**

### Principle III: Test-First Development ✅

**Re-check**: PASS
- Test structure defined in plan (unit/integration/e2e)
- Test files mapped to source structure
- Acceptance scenarios in spec provide test templates
- 80% coverage target maintained

**No violations introduced**

### Principle IV: Simplicity & YAGNI ✅

**Re-check**: PASS
- Research validated minimal dependencies (Zod, ora)
- No premature async/platform features (deferred to Phase 2)
- No speculative abstractions in design
- Direct use of Bun APIs for performance

**No violations introduced**

### Principle V: Observability & Debuggability ✅

**Re-check**: PASS
- Progress feedback designed (DeploymentProgress class)
- Error handling with user guidance (ConfigError classes)
- State files inspectable (`~/.lcp/state/`, `~/.lcp/locks/`)
- Dry-run support with plan preview

**No violations introduced**

**FINAL GATE STATUS**: ✅ PASS - All constitutional principles maintained after design

---

## Next Steps

**Command**: `/speckit.tasks`

This will generate `tasks.md` with a dependency-ordered, TDD-based task breakdown for implementation.

**Estimated Scope**:
- 15 commands across 3 command groups
- 4 new modules (config/, utils/progress, utils/locks, utils/state)
- 15+ test files (unit, integration, e2e)
- 2 new dependencies (zod, ora)

**Implementation Phases**:
1. Configuration management (loader, writer, validation)
2. Context commands (read, write, clear)
3. App commands (init, read, update, validate)
4. Version commands (add, read, update, delete, cache, deploy)
5. Integration and E2E tests

