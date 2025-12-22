# LC Platform Dev CLI

> Command-line tool for LC Platform - local developer tooling for cloud-agnostic application management

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange.svg)](https://bun.sh)
[![Test Coverage](https://img.shields.io/badge/coverage-81.56%25-brightgreen.svg)](tests/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

**lc-platform-dev-cli** (`lcp`) is a CLI tool that wraps the `@stainedhead/lc-platform-dev-accelerators` library, providing local developer tooling for managing cloud-agnostic applications using Clean Architecture principles.

### Key Features

- **Persistent Context**: Store configuration globally or per-project to reduce flag repetition
- **Application Lifecycle**: Initialize, configure, and manage applications
- **Version Management**: Add, read, and deploy application versions with flexible scopes
- **Deployment Modes**: Local synchronous or platform-tooling asynchronous deployments
- **Cloud-Agnostic**: Mock provider for local development without cloud credentials
- **CI/CD Ready**: JSON output, exit codes, and quiet mode for automation
- **Test-Driven**: 158+ tests with 81.56% coverage, following strict TDD practices

## Installation

### From Source

```bash
git clone https://github.com/stainedhead/lc-platform-dev-cli.git
cd lc-platform-dev-cli
bun install
bun run build
```

### Development Mode

```bash
bun run dev  # Watch mode for development
```

## Quick Start

See [quickstart.md](specs/001-menu-framework/quickstart.md) for a detailed walkthrough. Here's a 5-minute getting started:

```bash
# 1. Set up global context (one-time)
lcp context write --account my-account --team my-team

# 2. Initialize application
lcp app init --moniker my-service

# 3. Read current configuration
lcp context read

# 4. Add a version
cat > version-v1.0.0.json <<EOF
{
  "name": "my-service-v1.0.0",
  "description": "First release",
  "environment": {
    "PORT": "8080",
    "LOG_LEVEL": "info"
  }
}
EOF
lcp version add --ver v1.0.0 --config version-v1.0.0.json

# 5. Deploy the version
lcp version deploy --ver v1.0.0
```

## Command Reference

### Context Commands

Manage persistent configuration to reduce repetitive flags.

```bash
# Read current context (merged global + project-local)
lcp context read
lcp context read --json

# Write to global config (~/.lcp/config.json)
lcp context write --account prod --team platform

# Write to project-local config (.lcp/config.json)
lcp context write --local --moniker my-app

# Clear configuration
lcp context clear          # Clear global
lcp context clear --local  # Clear project-local
```

### Application Commands

Manage application lifecycle.

```bash
# Initialize application (requires account, team, moniker)
lcp app init
lcp app init --account prod --team platform --moniker api-service

# Read application configuration
lcp app read
lcp app read --json

# Validate configuration file
lcp app validate --config new-config.json

# Update application configuration
lcp app update --config updated-config.json
```

### Version Commands

Manage application versions and deployments.

```bash
# Add a new version
lcp version add --ver v1.0.0 --config version-config.json

# Read version details
lcp version read --ver v1.0.0
lcp version read --ver v1.0.0 --json

# Deploy a version (multiple scopes available)
lcp version deploy --ver v1.0.0                    # Deploy all (default)
lcp version deploy --ver v1.0.0 --app-only         # App code only
lcp version deploy --ver v1.0.0 --dependencies-only # Dependencies only

# Platform-tooling mode (async deployment)
lcp version deploy --ver v2.0.0 --platform-tooling

# Dry-run deployment (preview only)
lcp version deploy --ver v1.5.0 --dry-run
```

### Global Options

Available on all commands:

```
--account <account>    Cloud provider account identifier
--team <team>          Team or organization identifier
--moniker <moniker>    Application moniker (unique identifier)
--json                 Output in JSON format
--quiet                Suppress non-essential output
--debug                Show debug information
--dry-run              Preview changes without executing
-h, --help             Display help for command
```

## Configuration

### Configuration Files

- **Global**: `~/.lcp/config.json` (applies to all projects)
- **Project-Local**: `.lcp/config.json` (overrides global for specific project)

### Configuration Format

```json
{
  "account": "my-account",
  "team": "my-team",
  "moniker": "my-app",
  "provider": "aws",
  "region": "us-east-1"
}
```

### Configuration Precedence

Values are resolved in this order (highest to lowest priority):

1. **Command-line flags** (highest)
2. **Project-local config** (`.lcp/config.json`)
3. **Global config** (`~/.lcp/config.json`)
4. **Built-in defaults** (lowest)

## Common Workflows

### Developer Onboarding

```bash
# 1. Set up global defaults (one-time)
lcp context write --account my-account --team my-team

# 2. Initialize application
lcp app init --moniker my-service

# 3. Add first version
lcp version add --ver v1.0.0 --config v1.0.0.json

# 4. Deploy
lcp version deploy --ver v1.0.0
```

### Multi-Environment Strategy

```bash
# Development (project-local)
cd ~/projects/my-app
lcp context write --local --account dev-account --moniker dev-app

# Staging (project-local)
cd ~/projects/my-app-staging
lcp context write --local --account staging-account --moniker staging-app

# Production (explicit flags for safety)
lcp app init --account prod-account --team production --moniker prod-app
```

### Version Rollback

```bash
# Rollback to previous version
lcp version deploy --ver v1.0.0

# Verify rollback
lcp version read --ver v1.0.0
# Deployed: Yes

lcp version read --ver v2.0.0
# Deployed: No
```

### CI/CD Integration

```bash
#!/bin/bash
set -e

# Deploy using JSON output for parsing
RESULT=$(lcp version deploy \
  --ver "${VERSION}" \
  --account "${DEPLOY_ACCOUNT}" \
  --team "${DEPLOY_TEAM}" \
  --moniker "${APP_NAME}" \
  --json \
  --quiet)

DEPLOYED=$(echo "$RESULT" | jq -r '.deployed')

if [ "$DEPLOYED" != "true" ]; then
  echo "Deployment failed"
  exit 1
fi
```

## Development

### Prerequisites

- **Bun 1.0+** - [Install Bun](https://bun.sh)
- TypeScript 5.7+

### Setup

```bash
# Install dependencies
bun install

# Build
bun run build

# Run in development mode
bun run dev
```

### Development Commands

```bash
bun run build          # Build the CLI
bun run dev            # Run in watch mode
bun test               # Run all tests
bun test --watch       # Run tests in watch mode
bun run lint           # Run ESLint
bun run format         # Format code with Prettier
bun run typecheck      # Type-check without building
```

### Pre-Commit Verification

**CRITICAL**: Run this before committing:

```bash
bun run format && bun run lint && bun test && bun run typecheck && bun run build
```

All steps must pass with zero errors.

### Project Structure

```
src/
├── cli/                    # CLI entry point and command registration
│   ├── index.ts           # Main CLI entry, argument parsing
│   ├── options.ts         # Global CLI options
│   └── commands/          # Command implementations
│       ├── context/       # lcp context <action>
│       ├── app/           # lcp app <action>
│       └── version/       # lcp version <action>
├── config/                # Configuration management
│   ├── loader.ts          # Load and merge configs
│   ├── writer.ts          # Write configs atomically
│   ├── types.ts           # Configuration types
│   └── schema.ts          # Zod validation schemas
└── utils/                 # Shared utilities
    ├── errors.ts          # Custom error classes
    └── validation.ts      # Validation helpers

tests/
├── unit/                  # Unit tests (118 tests)
├── integration/           # Integration tests (23 tests)
└── e2e/                   # End-to-end CLI tests (17 tests)
```

## Architecture

This CLI is a **thin presentation layer** over the `@stainedhead/lc-platform-dev-accelerators` library:

```
┌─────────────────────────────────────────────────────────────┐
│                    lcp CLI (This Project)                   │
│  - Argument parsing (Commander.js)                          │
│  - Output formatting (JSON/human-readable)                  │
│  - Configuration management                                 │
│  - Exit code management                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ imports (future integration)
┌─────────────────────────▼───────────────────────────────────┐
│        @stainedhead/lc-platform-dev-accelerators            │
│  - LCPlatform (Control Plane - infrastructure management)   │
│  - LCAppRuntime (Data Plane - runtime operations)           │
│  - Provider implementations (AWS, Mock, future: Azure)      │
└─────────────────────────────────────────────────────────────┘
```

**Critical Rule**: The CLI never makes direct cloud SDK calls. All cloud operations flow through the core library.

## Testing

### Test Strategy

This project follows strict **Test-Driven Development (TDD)**:

- **Red-Green-Refactor**: Write failing test → Make it pass → Refactor
- **Tests First**: Implementation code is written only after tests
- **Coverage**: 81.56% coverage across 158 tests (exceeds 80% minimum)

### Test Types

- **Unit Tests** (118): Fast tests (< 1ms each), no file system
- **Integration Tests** (23): Real file system operations (10-50ms)
- **End-to-End Tests** (17): Full CLI execution (50-100ms)

### Running Tests

```bash
bun test                    # Run all tests
bun test tests/unit         # Run unit tests only
bun test tests/integration  # Run integration tests
bun test tests/e2e          # Run end-to-end tests
bun test --watch            # Watch mode
```

## Documentation

### User Documentation

- **[Product Summary](documentation/product-summary.md)** - High-level overview, features, roadmap
- **[Product Details](documentation/product-details.md)** - Complete command reference and workflows
- **[Technical Details](documentation/technical-details.md)** - Architecture and implementation guide
- **[Quick Start](specs/001-menu-framework/quickstart.md)** - 5-minute getting started guide

### Developer Documentation

- **[AGENTS.md](AGENTS.md)** - Development guidelines for AI assistants
- **[Constitution](.specify/memory/constitution.md)** - Project principles and governance

## Current Status

- **Version**: 0.1.0 (MVP)
- **Test Coverage**: 81.56% (158 passing tests)
- **Production Readiness**: MVP complete, ready for core library integration

### Implemented Features

✅ Context management (read, write, clear)
✅ Application lifecycle (init, read, validate, update)
✅ Version management (add, read, deploy)
✅ Multiple deployment scopes (all, app-only, dependencies-only)
✅ Deployment modes (local, platform-tooling)
✅ Configuration precedence (flags > project-local > global > defaults)
✅ JSON output for CI/CD
✅ Dry-run support
✅ Comprehensive error handling

### Planned Features

⏳ Version update, delete, cache commands
⏳ Concurrent deployment detection
⏳ Enhanced observability (--verbose, --debug across all commands)

## Contributing

1. Fork the repository
2. Create a feature branch
3. **Write tests first** (TDD)
4. Implement the feature
5. Run pre-commit verification: `bun run format && bun run lint && bun test && bun run typecheck && bun run build`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- **[@stainedhead/lc-platform-dev-accelerators](https://github.com/stainedhead/lc-platform-dev-accelerators)** - Core platform library
