# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**For detailed rules and guidelines, see [AGENTS.md](AGENTS.md)** - that file is the authoritative source for development practices, architecture details, and implementation patterns.

## Quick Reference

**Project**: `lc-platform-dev-cli` - CLI wrapper for `@stainedhead/lc-platform-dev-accelerators`
**Executable**: `lcp`
**Runtime**: Bun 1.0+ (not Node.js)

## Essential Commands

```bash
# Development
bun install              # Install dependencies
bun run dev              # Run CLI in watch mode
bun run build            # Build the CLI

# Testing
bun test                 # Run all tests
bun test tests/unit      # Run unit tests only
bun test tests/e2e       # Run end-to-end tests
bun test --watch         # Watch mode

# Quality
bun run format           # Format code (run first)
bun run lint             # Run ESLint
bun run typecheck        # Type-check without building

# Pre-commit sequence
bun run format && bun run lint && bun test && bun run typecheck && bun run build
```

## Architecture Summary

This CLI is a **thin presentation layer** that wraps the core library:

```
lcp CLI (argument parsing, output formatting, exit codes)
    ↓ imports
@stainedhead/lc-platform-dev-accelerators (all cloud operations)
```

**Critical**: Never make direct cloud SDK calls. All cloud operations flow through the core library.

## Constitution Principles

The project follows 5 core principles defined in `.specify/memory/constitution.md`:

1. **CLI-First Interface Design** - All functionality via `lcp` command with `--json`, `--verbose`, `--quiet` support
2. **Clean Architecture Alignment** - Wrap core library only; no direct cloud SDK calls
3. **Test-First Development (NON-NEGOTIABLE)** - TDD with 80% coverage minimum
4. **Simplicity & YAGNI** - No speculative features or premature abstractions
5. **Observability & Debuggability** - `--debug`, `--dry-run`, actionable error messages

## SpecKit Workflow

Use these commands for feature development:

- `/speckit.specify` - Create feature specification
- `/speckit.plan` - Design implementation
- `/speckit.tasks` - Generate task breakdown
- `/speckit.implement` - Execute implementation

## Active Technologies
- TypeScript (Bun 1.0+ runtime) + commander (CLI parsing), @stainedhead/lc-platform-dev-accelerators (core library) (001-menu-framework)
- JSON files (~/.lcp/config.json for global, .lcp/config.json for project-local), platform storage (via core library for cache/deployment) (001-menu-framework)

## Recent Changes
- 001-menu-framework: Added TypeScript (Bun 1.0+ runtime) + commander (CLI parsing), @stainedhead/lc-platform-dev-accelerators (core library)
