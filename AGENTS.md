# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lc-platform-dev-cli** is a TypeScript CLI tool that provides local developer tooling for the LC Platform. It wraps the `@stainedhead/lc-platform-dev-accelerators` library, enabling enterprise developers to manage cloud-agnostic applications through a unified command-line interface.

**Executable Name**: `lcp`
**Runtime**: Bun 1.0+ (not Node.js)
**Core Library**: `@stainedhead/lc-platform-dev-accelerators` (sibling directory)

**Purpose**: Provide a low-friction entry point to cloud development using Clean Architecture principles, with commands for:
- Application deployment and lifecycle management
- Configuration and secrets management
- Database and storage operations
- Queue and event management
- Local development with mock providers

## Architecture

### CLI as Thin Presentation Layer

This CLI follows the **Clean Architecture Alignment** principle from the constitution:

```
┌─────────────────────────────────────────────────────────────┐
│                    lcp CLI (This Project)                   │
│  - Argument parsing (commander/yargs)                       │
│  - Output formatting (JSON/human-readable)                  │
│  - User interaction (prompts, progress indicators)          │
│  - Exit code management                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ imports
┌─────────────────────────▼───────────────────────────────────┐
│        @stainedhead/lc-platform-dev-accelerators            │
│  - LCPlatform (Control Plane - infrastructure management)   │
│  - LCAppRuntime (Data Plane - runtime operations)           │
│  - Provider implementations (AWS, Mock, future: Azure)      │
└─────────────────────────────────────────────────────────────┘
```

**Critical Rule**: The CLI MUST NOT make direct cloud SDK calls. All cloud operations flow through the core library's interfaces.

### Project Structure

```
src/
├── cli/                    # CLI entry point and command registration
│   ├── index.ts           # Main CLI entry, argument parsing setup
│   └── commands/          # Command implementations
│       ├── storage/       # lcp storage <action>
│       ├── secrets/       # lcp secrets <action>
│       ├── config/        # lcp config <action>
│       ├── app/           # lcp app <action>
│       ├── queue/         # lcp queue <action>
│       ├── events/        # lcp events <action>
│       └── db/            # lcp db <action>
│
├── formatters/            # Output formatting utilities
│   ├── json.ts           # JSON output formatter
│   ├── table.ts          # Human-readable table formatter
│   └── index.ts          # Format selection based on flags
│
├── config/               # CLI configuration management
│   ├── loader.ts         # Load from ~/.lcp/config.json or env vars
│   └── types.ts          # Configuration type definitions
│
└── utils/                # Shared utilities
    ├── errors.ts         # Error handling and exit codes
    ├── logger.ts         # Logging with --verbose/--quiet support
    └── prompts.ts        # Interactive prompts (if needed)

tests/
├── unit/                 # Unit tests for formatters, config, utils
├── integration/          # Tests against mock provider
└── e2e/                  # End-to-end CLI invocation tests
```

### Command Structure

```
lcp <service> <action> [options]

Global Options:
  --provider <aws|azure|mock>  Cloud provider (default: from config or AWS)
  --region <region>            Cloud region (default: from config)
  --profile <name>             Named configuration profile
  --json                       Output in JSON format
  --verbose, -v                Verbose output
  --quiet, -q                  Suppress non-essential output
  --debug                      Show debug information
  --dry-run                    Preview changes without executing
  --help, -h                   Show help

Service Commands:
  lcp storage <action>         Object storage operations
  lcp secrets <action>         Secrets management
  lcp config <action>          Configuration management
  lcp app <action>             Application deployment
  lcp queue <action>           Message queue operations
  lcp events <action>          Event bus operations
  lcp db <action>              Database operations
  lcp auth <action>            Authentication operations
```

## Development Workflow

This project uses **SpecKit** for feature development. Commands are in `.claude/commands/`:

### SpecKit Workflow Commands

- `/speckit.specify` - Create/update feature specification from natural language
- `/speckit.plan` - Generate implementation plan with design artifacts
- `/speckit.tasks` - Generate dependency-ordered tasks for implementation
- `/speckit.implement` - Execute implementation from tasks.md
- `/speckit.clarify` - Ask targeted questions to refine underspecified areas
- `/speckit.analyze` - Run consistency checks across spec/plan/tasks

### Typical Development Flow

1. `/speckit.specify` to create feature spec (e.g., "add lcp storage list command")
2. `/speckit.clarify` if needed for ambiguities
3. `/speckit.plan` to design implementation
4. `/speckit.tasks` to break down into actionable items
5. `/speckit.implement` to execute

### When to Use Each Command

- Use `/speckit.specify` when adding a new CLI command or feature
- Use `/speckit.clarify` when the spec lacks details (output format, error handling, flags)
- Use `/speckit.plan` before implementing to design command structure
- Use `/speckit.tasks` to create an ordered checklist for implementation
- Use `/speckit.analyze` after task generation to verify consistency

## Implementation Guidelines

### Adding a New Command

1. **Check core library support** - Verify the operation exists in `@stainedhead/lc-platform-dev-accelerators`
2. **Define command structure** in `src/cli/commands/<service>/`
3. **Implement argument parsing** using the CLI library (commander/yargs)
4. **Call core library** - Use `LCPlatform` or `LCAppRuntime` methods
5. **Format output** - Support both `--json` and human-readable formats
6. **Handle errors** - Map library errors to appropriate exit codes
7. **Write tests** - Unit tests for parsing, e2e tests for full invocation

### Example Command Implementation

```typescript
// src/cli/commands/storage/list.ts
import { Command } from 'commander';
import { LCPlatform, ProviderType } from '@stainedhead/lc-platform-dev-accelerators';
import { formatOutput } from '../../formatters';
import { getConfig } from '../../config/loader';
import { handleError } from '../../utils/errors';

export function registerStorageListCommand(program: Command): void {
  program
    .command('list')
    .description('List objects in a storage bucket')
    .argument('<bucket>', 'Bucket name')
    .option('--prefix <prefix>', 'Filter by key prefix')
    .option('--max-keys <n>', 'Maximum number of keys to return', '1000')
    .action(async (bucket: string, options) => {
      try {
        const config = getConfig();
        const platform = new LCPlatform({
          provider: config.provider as ProviderType,
          region: config.region,
        });

        const storage = platform.getObjectStore();
        const result = await storage.listObjects(bucket, {
          prefix: options.prefix,
          maxKeys: parseInt(options.maxKeys, 10),
        });

        formatOutput(result, program.opts());
        process.exit(0);
      } catch (error) {
        handleError(error);
      }
    });
}
```

### Exit Code Conventions

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments or usage |
| 3 | Configuration error |
| 4 | Authentication/authorization error |
| 5 | Resource not found |
| 6 | Resource already exists |
| 7 | Network/connectivity error |
| 8 | Timeout |
| 10+ | Service-specific errors |

### Output Formatting Rules

- **Default**: Human-readable, colorized (when TTY)
- **--json**: Machine-readable JSON, one object per response
- **--quiet**: Minimal output (success/fail only)
- **--verbose**: Include additional context and timing
- **Errors**: Always to stderr, include error code and message

## Testing Strategy

### Test-First Development (TDD) - NON-NEGOTIABLE

Per the constitution, tests MUST be written and failing before implementation. This project follows strict TDD practices with the Red-Green-Refactor cycle.

#### Red-Green-Refactor Cycle

**CRITICAL**: Every feature implementation MUST follow this cycle:

1. **RED** - Write a failing test
   - Write a test that describes the desired behavior
   - Run the test and verify it fails (red)
   - Confirm the test fails for the right reason (not syntax errors)
   - Do NOT write any implementation code yet

2. **GREEN** - Make the test pass
   - Write the minimal code needed to make the test pass
   - Focus on making it work, not making it perfect
   - Run the test and verify it passes (green)
   - Do NOT add extra features or "improvements"

3. **REFACTOR** - Improve the code
   - Clean up the implementation while keeping tests green
   - Remove duplication, improve naming, simplify logic
   - Run tests after each refactoring step to ensure nothing broke
   - Update documentation to match the implementation

#### TDD Implementation Rules

- **Tests first, always**: Implementation code MUST NOT be written before tests
- **One test at a time**: Write one failing test, make it pass, then write the next test
- **Minimum code**: Write only enough code to make the current test pass
- **Run tests frequently**: After every small change, run tests to get immediate feedback
- **Never skip refactoring**: Technical debt accumulates quickly without the refactor step

#### TDD in Practice

**Example workflow for adding a new command**:

```bash
# 1. RED - Write failing test
# Create tests/e2e/version-deploy.test.ts with test case
bun test tests/e2e/version-deploy.test.ts  # Verify it fails

# 2. GREEN - Implement minimal solution
# Write src/cli/commands/version/deploy.ts
bun test tests/e2e/version-deploy.test.ts  # Verify it passes

# 3. REFACTOR - Clean up
# Extract helpers, improve naming, add types
bun test tests/e2e/version-deploy.test.ts  # Verify still passes

# 4. Repeat for next test case
```

#### Coverage Requirements

- **Minimum 80%** statement coverage across all files
- **100%** coverage for critical paths (error handling, validation, state management)
- Coverage measured with `bun test --coverage`
- Coverage reports reviewed before merging changes

### Test Types

1. **Unit Tests** (`tests/unit/`)
   - Argument parsing edge cases
   - Output formatters
   - Configuration loading
   - Error handling utilities

2. **Integration Tests** (`tests/integration/`)
   - Commands against mock provider
   - Full command execution without actual cloud calls

3. **End-to-End Tests** (`tests/e2e/`)
   - Invoke `lcp` binary directly
   - Verify exit codes
   - Verify stdout/stderr output
   - Test `--json` vs human-readable output

### Example Test Pattern

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { $ } from 'bun';

describe('lcp storage list', () => {
  beforeEach(async () => {
    // Setup mock provider state if needed
  });

  it('should list objects in a bucket', async () => {
    const result = await $`./dist/lcp storage list my-bucket --provider mock --json`.quiet();

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout.toString());
    expect(output).toHaveProperty('objects');
    expect(Array.isArray(output.objects)).toBe(true);
  });

  it('should return exit code 5 for non-existent bucket', async () => {
    const result = await $`./dist/lcp storage list nonexistent --provider mock`.quiet().nothrow();

    expect(result.exitCode).toBe(5);
    expect(result.stderr.toString()).toContain('not found');
  });

  it('should return exit code 2 for missing bucket argument', async () => {
    const result = await $`./dist/lcp storage list --provider mock`.quiet().nothrow();

    expect(result.exitCode).toBe(2);
  });
});
```

### Test Commands

```bash
bun test                    # Run all tests
bun test tests/unit         # Run unit tests only
bun test tests/integration  # Run integration tests
bun test tests/e2e          # Run end-to-end tests
bun test --watch            # Watch mode
```

## Quality Standards

### Code Coverage

- **Minimum 80%** code coverage for all public interfaces
- Coverage measured on unit tests
- Coverage reports generated on every test run

### Code Quality & Linting

- **Auto-format first** (`bun run format`) before linting
- **Zero critical/high severity** linting errors allowed
- ESLint with TypeScript rules
- Prettier for formatting

### Pre-Checkin Verification

**CRITICAL**: The following verification sequence MUST pass before committing or merging any code changes. This is NON-NEGOTIABLE.

#### Complete Verification Sequence

Run these commands in order. If any step fails, fix the issues before proceeding to the next step:

```bash
# 1. Format code (ALWAYS run first)
bun run format

# 2. Lint the code
bun run lint

# 3. Run all tests with coverage
bun test

# 4. Type-check (no build artifacts, just validation)
bun run typecheck

# 5. Build the CLI
bun run build

# All steps must pass with zero errors
```

#### One-Line Pre-Commit Command

For convenience, run all checks in sequence:

```bash
bun run format && bun run lint && bun test && bun run typecheck && bun run build
```

**Note**: The `&&` operator ensures the sequence stops at the first failure, making it easy to identify which step needs fixing.

#### What Each Step Validates

1. **`bun run format`** - Auto-formats all TypeScript files with Prettier
   - Ensures consistent code style across the codebase
   - Fixes spacing, indentation, line length automatically
   - MUST be run before linting to avoid style conflicts

2. **`bun run lint`** - Runs ESLint with TypeScript rules
   - Catches common bugs and anti-patterns
   - Enforces code quality standards
   - Identifies unused variables, missing types, incorrect patterns
   - Zero errors and zero warnings required

3. **`bun test`** - Runs complete test suite (unit + integration + e2e)
   - Verifies all 158+ tests pass
   - Validates test coverage meets 80% minimum
   - Ensures no regressions in existing functionality
   - Tests run in parallel for speed (< 5 seconds typical)

4. **`bun run typecheck`** - TypeScript compiler validation (no emit)
   - Validates all TypeScript types are correct
   - Catches type errors that might not show in tests
   - Faster than full build (no output files generated)
   - Required to pass before building

5. **`bun run build`** - Compiles TypeScript to JavaScript
   - Generates executable CLI in `dist/`
   - Final validation that code actually compiles and bundles
   - Creates production-ready artifacts
   - Must complete without errors or warnings

#### Verification Checklist

Before committing code, confirm:

- [ ] All files formatted with Prettier (`bun run format`)
- [ ] ESLint shows zero errors and warnings (`bun run lint`)
- [ ] All tests pass with 80%+ coverage (`bun test`)
- [ ] TypeScript validation passes (`bun run typecheck`)
- [ ] Build completes successfully (`bun run build`)
- [ ] Documentation updated if commands/architecture changed
- [ ] Commit message describes what changed and why

#### Build Failure Recovery

If any step fails:

1. **Format failure**: Usually impossible, but re-run `bun run format`
2. **Lint failure**: Read the error message, fix the code, re-run from step 1
3. **Test failure**: Fix the test or implementation, re-run from step 1
4. **Typecheck failure**: Fix TypeScript errors, re-run from step 1
5. **Build failure**: Usually a TypeScript issue missed by typecheck, fix and re-run from step 1

**Never skip steps** - Each builds on the previous step's success.

## Documentation Maintenance

### Required Documentation Files

The following documentation files in `documentation/` MUST be kept up to date with all code changes:

1. **`documentation/product-summary.md`** - High-level product overview
   - Update when: Adding new features, changing architecture, updating capabilities
   - Contains: Overview, target users, value propositions, current status, roadmap

2. **`documentation/product-details.md`** - Comprehensive command reference
   - Update when: Adding/modifying commands, changing flags, updating workflows
   - Contains: Full command reference, configuration system, workflow patterns, error handling, integration examples

3. **`documentation/technical-details.md`** - Technical implementation guide
   - Update when: Changing architecture, adding dependencies, modifying test strategy, updating build process
   - Contains: Architecture diagrams, technology stack, project structure, TDD strategy, build workflows, code quality standards

### Documentation Update Rules

**CRITICAL**: Every feature implementation, command change, or architectural update MUST include corresponding documentation updates.

#### When to Update Documentation

- **Before merging**: All documentation updates must be included in the same PR/commit as code changes
- **New commands**: Update all three documentation files
- **Modified commands**: Update product-details.md with new flags, examples, and behavior
- **Architecture changes**: Update product-summary.md and technical-details.md
- **Dependency changes**: Update technical-details.md technology stack section
- **Test strategy changes**: Update technical-details.md TDD strategy section
- **Build process changes**: Update technical-details.md build workflows section

#### Documentation Review Checklist

Before completing any feature work, verify:

- [ ] product-summary.md reflects current feature set and capabilities
- [ ] product-details.md includes all implemented commands with accurate examples
- [ ] technical-details.md matches current architecture and tech stack
- [ ] All code examples in documentation are tested and working
- [ ] All command examples use correct flag names (e.g., `--ver` not `--version`)
- [ ] Error messages in documentation match actual implementation
- [ ] Workflow patterns are up to date with current command structure

## Configuration

### User Configuration File

Location: `~/.lcp/config.json`

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
4. Default profile settings
5. Built-in defaults (lowest)

## Key Files

### Project Configuration
- `package.json` - Package manifest and scripts
- `tsconfig.json` - TypeScript configuration
- `bunfig.toml` - Bun configuration
- `.eslintrc.js` - ESLint rules
- `.prettierrc` - Prettier configuration

### Documentation
- `README.md` - User documentation
- `AGENTS.md` - This file (AI assistant guidance)
- `.specify/memory/constitution.md` - Project principles and governance

### SpecKit Commands
- `.claude/commands/speckit.*.md` - SpecKit workflow commands

## Package Information

- **Package name**: `@stainedhead/lc-platform-dev-cli`
- **Executable**: `lcp`
- **TypeScript version**: 5.9+
- **Runtime**: Bun 1.0+ (not Node.js)
- **Package manager**: bun
- **Core dependency**: `@stainedhead/lc-platform-dev-accelerators`

## Relationship to Core Library

This CLI is a **consumer** of the `@stainedhead/lc-platform-dev-accelerators` library:

| Aspect | CLI (this project) | Core Library |
|--------|-------------------|--------------|
| Purpose | User interface | Cloud abstraction |
| Responsibilities | Arg parsing, output formatting | Cloud operations |
| Cloud SDK usage | NEVER | Yes (providers) |
| Testing | Mock provider only | All providers |
| Changes | Can change independently | May require CLI updates |

When the core library adds new services or capabilities, this CLI should be updated to expose them through appropriate commands.

## Common Tasks

### Adding Support for a New Core Library Service

1. Check the core library's interface in `@stainedhead/lc-platform-dev-accelerators`
2. Create command directory: `src/cli/commands/<service>/`
3. Implement CRUD commands as needed (create, list, get, update, delete)
4. Add e2e tests for each command
5. Update `--help` documentation
6. Update README with usage examples

### Updating for Core Library Breaking Changes

1. Check core library changelog for breaking changes
2. Update import paths if interfaces moved
3. Update method calls if signatures changed
4. Run all tests to identify failures
5. Fix failing tests and implementations
6. Update version constraint in package.json
