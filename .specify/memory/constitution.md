<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0 (MAJOR - initial constitution ratification)

Modified principles: N/A (initial version)

Added sections:
- Core Principles (5 principles):
  I. CLI-First Interface Design
  II. Clean Architecture Alignment
  III. Test-First Development (NON-NEGOTIABLE)
  IV. Simplicity & YAGNI
  V. Observability & Debuggability
- Technology Constraints
- Development Workflow
- Governance

Removed sections: N/A (initial version)

Templates requiring updates:
- .specify/templates/plan-template.md: ✅ No changes required (Constitution Check section exists)
- .specify/templates/spec-template.md: ✅ No changes required (aligns with principles)
- .specify/templates/tasks-template.md: ✅ No changes required (TDD pattern present)

Follow-up TODOs: None
-->

# LC Platform Dev CLI Constitution

## Core Principles

### I. CLI-First Interface Design

All functionality MUST be accessible through the `lcp` command-line interface.

- Text I/O protocol: arguments and stdin for input, stdout for output, stderr for errors
- MUST support both JSON (machine-readable) and human-readable output formats via `--json` flag
- Exit codes MUST follow conventions: 0 for success, non-zero for errors with meaningful codes
- Commands MUST be idempotent where possible
- MUST provide `--help` for all commands and subcommands
- MUST support `--verbose` and `--quiet` flags for output control
- Commands MUST be composable with standard Unix tools (pipes, redirects)

**Rationale**: CLI-first design ensures automation compatibility, enables composition
with CI/CD pipelines and shell scripts, and guarantees all features are accessible
programmatically without requiring GUI tooling.

### II. Clean Architecture Alignment

This CLI MUST wrap the `@stainedhead/lc-platform-dev-accelerators` library without
introducing architectural divergence.

- MUST use the core library's interfaces; no direct cloud SDK calls from CLI code
- MUST NOT duplicate functionality already provided by the core library
- CLI layer MUST only handle: argument parsing, output formatting, user interaction
- Configuration MUST flow through the core library's factory patterns
- Provider selection (`aws`, `azure`, `mock`) MUST use core library's ProviderType enum

**Rationale**: The CLI is a thin presentation layer over the core library. Direct cloud
SDK usage would create parallel maintenance paths and violate hexagonal architecture.

### III. Test-First Development (NON-NEGOTIABLE)

Tests MUST be written and failing before implementation begins.

- Red-Green-Refactor cycle is strictly enforced:
  1. Write test that defines expected behavior
  2. Verify test fails (Red)
  3. Implement minimum code to pass (Green)
  4. Refactor while keeping tests green
- CLI commands MUST have end-to-end tests validating exit codes and output
- Argument parsing MUST have unit tests for edge cases
- Test coverage MUST not decrease on any PR
- Minimum 80% code coverage for all public interfaces

**Rationale**: TDD prevents scope creep, ensures testable design, and provides
living documentation of expected behavior. CLI tools are particularly prone to
edge cases that TDD catches early.

### IV. Simplicity & YAGNI

Build only what is needed, in the simplest form that works.

- MUST NOT add flags, subcommands, or options for hypothetical future needs
- Three similar lines of code are preferred over a premature abstraction
- MUST NOT add error handling for impossible scenarios
- Configuration options MUST only exist when users have actually requested them
- Delete unused code completely—no backwards-compatibility shims for internal changes
- Prefer existing core library functionality over CLI-specific implementations

**Rationale**: Complexity is a cost. Every flag, option, and abstraction increases
maintenance burden. The right amount of code is the minimum required.

### V. Observability & Debuggability

All operations MUST be traceable and debuggable via text output.

- `--verbose` MUST show detailed operation progress
- `--debug` MUST show internal state and library calls
- Error messages MUST include context sufficient to diagnose the problem
- Error messages MUST suggest corrective actions when possible
- MUST NOT swallow errors or fail silently
- MUST support `--dry-run` for destructive operations

**Rationale**: CLI tools run in diverse environments. When something fails, users
need enough context to diagnose without attaching debuggers or examining source.

## Technology Constraints

**Runtime**: Bun (TypeScript) - matching the core library
**Package Execution**: Native executable named `lcp`
**Language**: TypeScript with strict mode enabled
**Testing**: Bun test runner (`bun test`)
**Linting**: ESLint with TypeScript rules, Prettier for formatting
**Core Dependency**: `@stainedhead/lc-platform-dev-accelerators`

### Stack Rules

- Dependencies MUST be evaluated for necessity—prefer standard library
- Dependencies MUST be pinned to exact versions
- Native Bun APIs MUST be preferred over Node.js compatibility layers
- Type definitions MUST be explicit—no implicit `any`
- CLI argument parsing SHOULD use a well-tested library (e.g., `commander`, `yargs`)
- Core library version MUST be compatible; breaking changes require CLI updates

### Command Structure

```
lcp <service> <action> [options]

Examples:
  lcp storage create-bucket my-bucket
  lcp secrets get api-key --json
  lcp config list --provider aws --region us-east-1
  lcp app deploy --image myapp:v1 --name my-service
```

## Development Workflow

### Code Review Requirements

- All changes MUST go through pull request review
- PRs MUST include passing tests before review
- PRs MUST not introduce new linting errors or warnings
- Reviewers MUST verify Constitution compliance
- Changes affecting core library integration MUST be reviewed for alignment

### Quality Gates

- All tests MUST pass before merge
- Linting MUST pass with zero errors
- Type checking MUST pass with zero errors
- Build MUST succeed before merge
- Coverage MUST remain at or above 80%

### Pre-Checkin Verification

```bash
# 1. Format code first
bun run format

# 2. Run linting
bun run lint

# 3. Run all tests
bun test

# 4. Type-check
bun run typecheck

# 5. Build
bun run build
```

### Commit Standards

- Commit messages MUST follow conventional commits format
- Each commit SHOULD represent a single logical change
- Work-in-progress commits MUST be squashed before merge

## Governance

This Constitution supersedes all other project practices and conventions.

### Amendment Procedure

1. Propose amendment via pull request to this document
2. Document rationale for the change
3. All active contributors MUST be notified
4. Changes require explicit approval before merge
5. Migration plan MUST accompany breaking changes to principles
6. Core library constitution changes MAY trigger CLI constitution review

### Versioning Policy

- **MAJOR**: Backward-incompatible governance changes (principle removal/redefinition)
- **MINOR**: New principles or sections added, material expansions
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Review

- All PRs MUST verify compliance with Constitution principles
- Complexity MUST be justified against Principle IV (Simplicity)
- Violations MUST be documented in PR if accepted as exceptions
- Core library alignment MUST be verified against Principle II

**Version**: 1.0.0 | **Ratified**: 2025-12-19 | **Last Amended**: 2025-12-19
