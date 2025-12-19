# LC Platform Dev CLI

> Command-line tool for LC Platform - local developer tooling for cloud-agnostic application management

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

**lc-platform-dev-cli** (`lcp`) is a CLI tool that wraps the `@stainedhead/lc-platform-dev-accelerators` library, providing local developer tooling for managing cloud-agnostic applications using Clean Architecture principles.

### Features

- **Cloud-Agnostic**: Switch between AWS, Azure, or mock providers via configuration
- **Clean Architecture**: Thin CLI layer over the core platform library
- **Local Development**: Use mock provider for testing without cloud credentials
- **JSON Output**: Machine-readable output for CI/CD integration
- **Consistent Interface**: Unified commands across all cloud services

## Installation

### From GitHub Packages

```bash
bun add -g @stainedhead/lc-platform-dev-cli
```

### From Source

```bash
git clone https://github.com/stainedhead/lc-platform-dev-cli.git
cd lc-platform-dev-cli
bun install
bun run build
```

## Quick Start

```bash
# Check version
lcp --version

# Use mock provider for local development
lcp storage list my-bucket --provider mock

# Use AWS provider
lcp storage list my-bucket --provider aws --region us-east-1

# Output as JSON for scripting
lcp secrets get api-key --json
```

## Command Structure

```
lcp <service> <action> [options]

Services:
  storage    Object storage operations (S3, Blob Storage)
  secrets    Secrets management (Secrets Manager, Key Vault)
  config     Configuration management (AppConfig, App Configuration)
  app        Application deployment (App Runner, Container Apps)
  queue      Message queue operations (SQS, Storage Queues)
  events     Event bus operations (EventBridge, Event Grid)
  db         Database operations (RDS, Database for PostgreSQL)
  auth       Authentication operations (Cognito, Azure AD B2C)

Global Options:
  -p, --provider <provider>  Cloud provider: aws, azure, mock (default: from config)
  -r, --region <region>      Cloud region (default: from config)
  --profile <name>           Named configuration profile
  --json                     Output in JSON format
  -v, --verbose              Verbose output
  -q, --quiet                Suppress non-essential output
  --debug                    Show debug information
  --dry-run                  Preview changes without executing
  -h, --help                 Show help
  -V, --version              Show version
```

## Configuration

### Configuration File

Create `~/.lcp/config.json`:

```json
{
  "defaultProvider": "aws",
  "defaultRegion": "us-east-1",
  "profiles": {
    "dev": {
      "provider": "mock"
    },
    "staging": {
      "provider": "aws",
      "region": "us-west-2"
    },
    "prod": {
      "provider": "aws",
      "region": "us-east-1"
    }
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `LCP_PROVIDER` | Default cloud provider |
| `LCP_REGION` | Default region |
| `LCP_PROFILE` | Default configuration profile |
| `LCP_CONFIG_PATH` | Custom config file path |
| `LCP_DEBUG` | Enable debug output |
| `NO_COLOR` | Disable colored output |

### Configuration Precedence

1. Command-line flags (highest)
2. Environment variables
3. Profile settings from config file
4. Default settings from config file
5. Built-in defaults (lowest)

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

### Commands

```bash
bun run build          # Build the CLI
bun test               # Run all tests
bun run lint           # Run ESLint
bun run lint:fix       # Fix linting issues
bun run format         # Format code with Prettier
bun run typecheck      # Type-check without building
```

### Project Structure

```
src/
├── cli/               # CLI entry point and commands
│   ├── index.ts      # Main entry point
│   ├── options.ts    # Global CLI options
│   └── commands/     # Service command implementations
├── config/           # Configuration loading
├── formatters/       # Output formatters (JSON, human-readable)
└── utils/            # Shared utilities (errors, logging)

tests/
├── unit/             # Unit tests
├── integration/      # Integration tests (mock provider)
└── e2e/              # End-to-end CLI tests
```

## Architecture

This CLI is a **thin presentation layer** over the `@stainedhead/lc-platform-dev-accelerators` library:

- **CLI Layer**: Argument parsing, output formatting, user interaction
- **Core Library**: All cloud operations via provider-independent interfaces

The CLI never makes direct cloud SDK calls. All cloud operations flow through the core library.

## Documentation

- **[AGENTS.md](AGENTS.md)** - Development guidelines for AI assistants
- **[Constitution](.specify/memory/constitution.md)** - Project principles and governance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests first (TDD)
4. Implement the feature
5. Run `bun run lint:fix && bun run format && bun test`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- **[@stainedhead/lc-platform-dev-accelerators](https://github.com/stainedhead/lc-platform-dev-accelerators)** - Core platform library
