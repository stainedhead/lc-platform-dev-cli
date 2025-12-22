# LC Platform Dev CLI - Product Summary

**Last Updated**: 2025-12-22

## Overview

The LC Platform Dev CLI (`lcp`) is a command-line tool that provides local developer tooling for managing cloud-agnostic applications. It serves as a thin presentation layer over the `@stainedhead/lc-platform-dev-accelerators` core library, following Clean Architecture principles.

## Purpose

Enable developers to manage application lifecycle, configuration, and deployments through a consistent CLI interface that abstracts cloud provider differences.

## Target Users

- **Application Developers**: Deploy and manage applications across environments
- **DevOps Engineers**: Automate deployment workflows and infrastructure management
- **Platform Teams**: Provide standardized tooling for multi-cloud deployments

## Key Value Propositions

1. **Cloud-Agnostic**: Single interface for AWS, Azure, and local development (mock provider)
2. **Developer-Friendly**: Persistent context management reduces repetitive flag usage
3. **CI/CD Ready**: JSON output and exit codes for automation
4. **Clean Architecture**: Thin CLI wrapper ensures all logic stays in testable core library
5. **Local-First Development**: Mock provider enables full workflow testing without cloud credentials

## Core Capabilities

### Context Management
- Store default values globally (`~/.lcp/config.json`) or per-project (`.lcp/config.json`)
- Merge behavior: project-local overrides global overrides defaults
- Reduces command verbosity by 80%+ in typical workflows

### Application Lifecycle
- **Initialize**: Create new applications with context defaults
- **Configure**: Validate and update application configuration
- **Read**: Inspect current application state

### Version Management
- **Add**: Register new application versions with configuration
- **Read**: View version details and deployment status
- **Deploy**: Deploy versions with flexible scopes (all, app-only, dependencies-only)

### Deployment Flexibility
- **Local Mode**: Synchronous deployment with progress feedback
- **Platform Mode**: Asynchronous deployment via platform tooling with event tracking
- **Dry-Run**: Preview deployment changes without execution
- **Quiet Mode**: Minimal output for scripting

## Current Status

- **Version**: 0.1.0 (MVP)
- **Test Coverage**: 81.56% (158 passing tests)
- **Production Readiness**: MVP complete, ready for core library integration

## Architecture Principles

1. **No Direct Cloud SDK Calls**: All cloud operations delegated to core library
2. **Test-First Development**: TDD with 80% minimum coverage
3. **YAGNI Compliance**: Only requested features, no speculative additions
4. **CLI-First Interface**: All functionality accessible via command line
5. **Observability**: Debug output, dry-run support, actionable error messages

## Supported Workflows

- **Developer Onboarding**: 5-minute setup from zero to deployed application
- **Multi-Environment Management**: Different contexts for dev/staging/prod
- **Version Rollback**: Deploy any previous version instantly
- **Configuration Validation**: Test config changes before applying
- **Scripted Deployments**: JSON output for CI/CD integration

## Technology Stack

- **Runtime**: Bun 1.0+ (not Node.js)
- **Language**: TypeScript 5.7+
- **CLI Framework**: Commander.js
- **Validation**: Zod schemas
- **Testing**: Bun's built-in test runner

## Future Roadmap

### Phase 1 (Current - MVP)
- ✓ Context management
- ✓ Basic application lifecycle
- ✓ Version add, read, deploy

### Phase 2 (Planned)
- Version update, delete, cache commands
- Concurrent deployment detection
- Enhanced observability (--verbose, --debug across all commands)

### Phase 3 (Future)
- Integration with platform monitoring
- Advanced deployment strategies
- Multi-region orchestration

## Success Metrics

- **Command Execution Time**: < 2 seconds for local operations
- **Test Coverage**: Maintained at 80%+ minimum
- **Developer Satisfaction**: 5-minute quickstart completion time
- **Error Recovery**: All errors include corrective actions

## Related Resources

- **Source Code**: [GitHub Repository](https://github.com/stainedhead/lc-platform-dev-cli)
- **Core Library**: [@stainedhead/lc-platform-dev-accelerators](https://github.com/stainedhead/lc-platform-dev-accelerators)
- **Documentation**: See `/documentation` directory for detailed guides
