# LC Platform Dev CLI - Technical Details

**Last Updated**: 2025-12-22

## Table of Contents

- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Testing Strategy](#testing-strategy)
- [Build and Development](#build-and-development)
- [Code Quality](#code-quality)
- [Implementation Patterns](#implementation-patterns)
- [Performance](#performance)

## Architecture

### Clean Architecture Principles

The CLI follows Clean Architecture with strict layer separation:

```
┌─────────────────────────────────────────┐
│  Presentation Layer (CLI)               │
│  - Argument parsing (Commander.js)      │
│  - Output formatting                    │
│  - User interaction                     │
│  - Exit code management                 │
└─────────────┬───────────────────────────┘
              │ imports & delegates
              ▼
┌─────────────────────────────────────────┐
│  Core Library                           │
│  @stainedhead/lc-platform-dev-          │
│  accelerators                           │
│  - All business logic                   │
│  - All cloud operations                 │
│  - Provider-agnostic interfaces         │
└─────────────────────────────────────────┘
```

**Critical Rule**: The CLI NEVER makes direct cloud SDK calls. All cloud operations flow through the core library.

### Layer Responsibilities

**CLI Layer (This Project)**:
- Parse command-line arguments
- Load and merge configuration files
- Validate required context values
- Format output (human-readable or JSON)
- Handle user errors with helpful messages
- Manage exit codes

**Core Library** (External Dependency):
- Execute cloud operations
- Manage provider-specific implementations
- Handle retries and error recovery
- Maintain cloud resource state
- Abstract provider differences

### Configuration Architecture

```
Command Execution Flow:
1. Parse CLI flags
2. Load global config (~/.lcp/config.json)
3. Load project-local config (.lcp/config.json)
4. Merge: flags > local > global > defaults
5. Validate required values
6. Execute command with resolved context
```

**Merge Strategy**: Deep merge with higher-priority sources overwriting lower-priority values.

**Atomic Writes**: Configuration updates use temp file + atomic rename to prevent corruption:

```typescript
// Simplified implementation
const tempPath = `${targetPath}.tmp`;
writeFileSync(tempPath, JSON.stringify(config, null, 2));
renameSync(tempPath, targetPath); // Atomic operation
```

## Technology Stack

### Runtime and Language

- **Runtime**: Bun 1.0+ (required, not Node.js)
  - Native TypeScript execution
  - Fast startup time (~10ms vs ~100ms for Node.js)
  - Built-in test runner
  - Optimized for CLI workloads

- **Language**: TypeScript 5.7+
  - Strict mode enabled
  - No implicit any
  - Exact optional property types

### Core Dependencies

```json
{
  "commander": "^12.1.0",      // CLI framework
  "zod": "^3.24.1",            // Schema validation
  "@stainedhead/lc-platform-dev-accelerators": "workspace:*"
}
```

### Development Dependencies

```json
{
  "@types/bun": "^1.2.2",      // Bun type definitions
  "typescript": "^5.7.3",       // Type checker
  "eslint": "^9.18.0",          // Linter
  "prettier": "^3.4.2"          // Code formatter
}
```

## Project Structure

```
lc-platform-dev-cli/
├── src/
│   ├── cli/                  # CLI entry point and commands
│   │   ├── index.ts         # Main entry point
│   │   ├── options.ts       # Global CLI options
│   │   └── commands/        # Command implementations
│   │       ├── index.ts     # Command registration
│   │       ├── context/     # Context management commands
│   │       │   ├── index.ts
│   │       │   ├── read.ts
│   │       │   ├── write.ts
│   │       │   └── clear.ts
│   │       ├── app/         # Application commands
│   │       │   ├── index.ts
│   │       │   ├── init.ts
│   │       │   ├── read.ts
│   │       │   ├── validate.ts
│   │       │   └── update.ts
│   │       └── version/     # Version management commands
│   │           ├── index.ts
│   │           ├── add.ts
│   │           ├── read.ts
│   │           └── deploy.ts
│   ├── config/              # Configuration system
│   │   ├── types.ts        # Type definitions
│   │   ├── schema.ts       # Zod schemas
│   │   ├── loader.ts       # Config file loading
│   │   └── writer.ts       # Atomic config writes
│   └── utils/              # Shared utilities
│       └── validation.ts   # Context validation
├── tests/
│   ├── unit/               # Unit tests (single module)
│   │   ├── config/        # Config system tests
│   │   ├── commands/      # Command logic tests
│   │   └── utils/         # Utility tests
│   ├── integration/        # Integration tests (multiple modules)
│   │   ├── app-lifecycle.test.ts
│   │   └── config-precedence.test.ts
│   └── e2e/                # End-to-end CLI tests
│       ├── context-commands.test.ts
│       ├── app-commands.test.ts
│       └── version-commands.test.ts
├── documentation/          # Product documentation
│   ├── product-summary.md
│   ├── product-details.md
│   └── technical-details.md
├── specs/                  # Feature specifications
│   └── 001-menu-framework/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       └── quickstart.md
└── dist/                   # Build output (gitignored)
    └── cli/
        └── index.js
```

### File Naming Conventions

- **Commands**: Verb-based names (`read.ts`, `write.ts`, `deploy.ts`)
- **Tests**: `*.test.ts` suffix
- **Types**: PascalCase interfaces (`CliContext`, `MissingContextError`)
- **Functions**: camelCase (`loadConfig`, `validateRequiredContext`)

## Testing Strategy

### Test-Driven Development (TDD)

**Required Practice**: All features must be developed using TDD:

1. **Write failing test** (Red)
2. **Implement minimum code to pass** (Green)
3. **Refactor for quality** (Refactor)

**Coverage Requirement**: 80% minimum across the entire codebase.

**Current Metrics**:
- Tests: 158 passing, 0 failing
- Coverage: 81.56%
- Test execution time: ~3 seconds

### Test Pyramid

```
        ╱╲
       ╱  ╲     E2E Tests (17 tests)
      ╱────╲    - Full CLI workflows
     ╱      ╲   - Real command execution
    ╱────────╲  - File system interaction
   ╱          ╲
  ╱────────────╲ Integration Tests (23 tests)
 ╱              ╲ - Multi-module interaction
╱────────────────╲ - Config precedence
──────────────────
      Unit Tests (118 tests)
      - Single module testing
      - Pure function testing
      - Mock-based isolation
```

### Test Categories

#### Unit Tests
- **Purpose**: Test individual modules in isolation
- **Location**: `tests/unit/`
- **Characteristics**:
  - Fast execution (< 1ms per test)
  - No file system dependencies (use mocks)
  - No external service calls
  - Pure input/output testing

**Example**:
```typescript
test('should validate required context fields', () => {
  const context: CliContext = {
    account: 'test-account',
    team: 'test-team',
  };

  expect(() => {
    validateRequiredContext(context, ['account', 'team', 'moniker'], 'test op');
  }).toThrow(MissingContextError);
});
```

#### Integration Tests
- **Purpose**: Test multiple modules working together
- **Location**: `tests/integration/`
- **Characteristics**:
  - Moderate execution time (10-50ms per test)
  - May use real file system
  - Tests configuration merging and workflows

**Example**:
```typescript
test('should merge global and project-local config', () => {
  // Write global config
  writeConfig({ account: 'global-account', team: 'global-team' });

  // Write project-local config
  writeConfig({ team: 'local-team', moniker: 'local-app' }, { local: true });

  // Load and verify merge
  const config = loadConfig();
  expect(config.account).toBe('global-account'); // From global
  expect(config.team).toBe('local-team');        // From local (override)
  expect(config.moniker).toBe('local-app');      // From local
});
```

#### End-to-End Tests
- **Purpose**: Test complete CLI workflows as a user would
- **Location**: `tests/e2e/`
- **Characteristics**:
  - Slower execution (50-100ms per test)
  - Execute actual CLI commands via `execSync`
  - Test user-facing behavior
  - Verify exit codes and output format

**Example**:
```typescript
test('should deploy version with all scope', () => {
  // Add version
  execSync(`${CLI_CMD} version add --ver v1.0.0 --config ${CONFIG_FILE}`);

  // Deploy
  const result = execSync(`${CLI_CMD} version deploy --ver v1.0.0 --json`);
  const output = JSON.parse(result);

  expect(output.deployed).toBe(true);
  expect(output.scope).toBe('all');
});
```

### Test Isolation

**Critical Practice**: Each test must be independent and idempotent.

**Cleanup Strategy**:
```typescript
beforeEach(() => {
  // Clean state before each test
  if (existsSync(globalConfigPath)) {
    unlinkSync(globalConfigPath);
  }
  if (existsSync(localConfigPath)) {
    unlinkSync(localConfigPath);
  }
});

afterEach(() => {
  // Clean state after each test
  // (same cleanup as beforeEach for safety)
});
```

### Mock Strategy

**Current Implementation**: File-based mocks for development without core library integration.

**Mock Locations**:
- `~/.lcp/mock-app-configs/` - Application configurations
- `~/.lcp/mock-versions/` - Version storage

**Future**: Replace mocks with real core library calls.

## Build and Development

### Development Workflow

```bash
# Install dependencies
bun install

# Run in development mode (watch)
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Run tests in watch mode
bun test --watch
```

### Build Process

```bash
# Build command
bun run build

# What it does:
1. Type-check TypeScript (tsc --noEmit)
2. Bundle with Bun's bundler (bun build)
3. Emit TypeScript declarations (tsc --emitDeclarationOnly)
4. Output to dist/ directory
```

**Build Output**:
- `dist/cli/index.js` - Bundled JavaScript
- `dist/cli/index.d.ts` - Type declarations

### Pre-Commit Checklist

**Required checks before committing**:

```bash
# 1. Format code
bun run format

# 2. Run linter
bun run lint

# 3. Run tests
bun test

# 4. Type-check
bun run typecheck

# 5. Build
bun run build

# All-in-one command:
bun run format && bun run lint && bun test && bun run typecheck && bun run build
```

**Exit on failure**: Any step failing should prevent commit.

## Code Quality

### Linting Configuration

**ESLint 9.x** with TypeScript support:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': 'off', // CLI tool needs console
      'prefer-const': 'error',
    }
  }
];
```

**Run linter**:
```bash
bun run lint         # Check for issues
bun run lint:fix     # Auto-fix issues
```

### Formatting Configuration

**Prettier 3.x** with project settings:

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Run formatter**:
```bash
bun run format       # Format all files
```

### TypeScript Configuration

**Strict mode enabled** (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Type-check**:
```bash
bun run typecheck    # Check types without building
```

### Code Review Requirements

1. **All tests passing** (158/158)
2. **Coverage maintained** (≥ 80%)
3. **No linting errors**
4. **Formatted with Prettier**
5. **No TypeScript errors**
6. **Build successful**

## Implementation Patterns

### Error Handling Pattern

**Custom Error Classes** with helpful messages:

```typescript
export class MissingContextError extends Error {
  constructor(
    public readonly missing: string[],
    public readonly operation: string
  ) {
    super(
      `Missing required context values: ${missing.join(', ')}.\n\n` +
      `To fix this, either:\n` +
      `1. Set context values: lcp context write ${missing.map(f => `--${f} <value>`).join(' ')}\n` +
      `2. Or provide them as command flags: ${missing.map(f => `--${f} <value>`).join(' ')}`
    );
    this.name = 'MissingContextError';
  }
}
```

**Usage in commands**:
```typescript
try {
  validateRequiredContext(context, ['account', 'team', 'moniker'], 'app init');
  // ... command logic
} catch (error) {
  if (cmdOptions.debug) {
    console.error('Debug:', error);
  }
  console.error(`Error: ${(error as Error).message}`);
  process.exit(1);
}
```

### Configuration Loading Pattern

```typescript
export function loadConfig(): CliContext {
  const globalConfig = loadGlobalConfig();
  const localConfig = loadLocalConfig();

  // Deep merge: local overrides global
  return {
    ...globalConfig,
    ...localConfig,
  };
}
```

### Validation Pattern

**Zod schemas for runtime validation**:

```typescript
import { z } from 'zod';

const CliContextSchema = z.object({
  account: z.string().optional(),
  team: z.string().optional(),
  moniker: z.string().regex(/^[a-z0-9-]+$/).optional(),
  provider: z.enum(['aws', 'azure', 'mock']).optional(),
  region: z.string().optional(),
});

export type CliContext = z.infer<typeof CliContextSchema>;
```

### Command Pattern

**Commander.js command structure**:

```typescript
export function createCommandName(): Command {
  return new Command('name')
    .description('Command description')
    .requiredOption('--required <value>', 'Required option description')
    .option('--optional <value>', 'Optional option description')
    .addHelpText('after', `
Examples:
  $ lcp command --required value
  $ lcp command --required value --optional other
    `)
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        required: string;
        optional?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load context
        const context = getResolvedContext(this);

        // Validate
        validateRequiredContext(context, REQUIRED_FIELDS, 'command name');

        // Execute
        const result = await executeCommand(context, cmdOptions);

        // Output
        if (cmdOptions.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (!cmdOptions.quiet) {
          console.log('✓ Command successful');
          // ... formatted output
        }
      } catch (error) {
        if (cmdOptions.debug) {
          console.error('Debug:', error);
        }
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
```

## Performance

### Startup Time

- **Target**: < 100ms from command invocation to first output
- **Current**: ~50ms average (measured with `time lcp --version`)
- **Optimization**: Bun's fast startup + minimal dependency loading

### Command Execution Time

| Command Type | Target | Current |
|--------------|--------|---------|
| Context read | < 10ms | ~5ms |
| Context write | < 50ms | ~20ms |
| App init (mock) | < 100ms | ~70ms |
| Version add | < 100ms | ~50ms |
| Version deploy | < 2s | ~1.2s |

### Memory Usage

- **Base CLI**: ~15MB resident memory
- **Peak during execution**: ~30MB
- **After execution**: Releases to OS

### Optimization Strategies

1. **Lazy loading**: Load modules only when needed
2. **Minimal dependencies**: Only essential packages
3. **Bun runtime**: Native performance optimizations
4. **Synchronous I/O**: Faster than async for CLI workloads
5. **No heavy computations**: Delegate to core library

## Security Considerations

### Configuration File Security

- **Permissions**: Config files should be user-readable only (600)
- **Sensitive data**: Never commit credentials to git
- **Validation**: All input sanitized via Zod schemas

### Input Validation

```typescript
// All user input validated
const MonikerSchema = z.string().regex(/^[a-z0-9-]+$/);
const ProviderSchema = z.enum(['aws', 'azure', 'mock']);
```

### Command Injection Prevention

- **No shell execution of user input**
- **All file paths validated**
- **No eval() or similar dynamic execution**

## Deployment and Distribution

### Package Distribution

```bash
# Publish to npm
npm publish --access public

# Install globally
bun add -g @stainedhead/lc-platform-dev-cli

# Verify installation
lcp --version
```

### Version Management

- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Current**: 0.1.0 (MVP)
- **Next**: 1.0.0 (production-ready with core library integration)

## Metrics and Monitoring

### Quality Metrics

- **Test Coverage**: 81.56% (target: ≥80%)
- **Test Count**: 158 tests
- **Build Time**: ~2 seconds
- **Type Safety**: 0 errors, strict mode
- **Linting**: 0 errors, 0 warnings

### Development Velocity

- **MVP Completion**: 61/80 tasks (76%)
- **Test-to-Code Ratio**: 1.8:1 (healthy)
- **Average Task Time**: ~15 minutes per task
