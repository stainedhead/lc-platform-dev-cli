# Research: Context Management and Core Commands

**Feature**: 001-menu-framework
**Date**: 2025-12-22

## Overview

This document consolidates research findings for implementing CLI context configuration management and deployment commands in the `lcp` CLI. Research focused on TypeScript/Node.js/Bun best practices for configuration file management and deployment command patterns.

---

## 1. Configuration File Management

### Decision: Hybrid Global + Project-Local with XDG Compliance

**Chosen Approach**:
- Global: `~/.lcp/config.json` (simplified from XDG for ease of use)
- Project-local: `.lcp/config.json` (hidden directory in project root)
- Precedence: CLI flags > Project-local > Global > Defaults

**Rationale**:
- Follows patterns from Git, AWS CLI, Docker (users expect this)
- `~/.lcp/` is simpler than `~/.config/lcp/` while maintaining discoverability
- Hidden `.lcp/` directory keeps project roots clean
- Precedence order minimizes surprise

**Alternatives Considered**:
- **Full XDG compliance** (`~/.config/lcp/config.json`): Rejected as overly complex for user-facing path
- **Dotfile only** (`~/.lcprc`): Rejected - harder to find, JSON-only, no directory for other files
- **Project-local only**: Rejected - users need global defaults across projects

---

## 2. Configuration Merge Behavior

### Decision: Deep Merge with Replace Semantics for Arrays

**Chosen Approach**:
- Objects: Deep merge recursively
- Arrays: Replace entirely (not append)
- Primitives: Replace
- Explicit `null`: Delete/unset semantic

**Implementation**:
```typescript
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target };

  for (const source of sources) {
    for (const key in source) {
      const targetValue = result[key];
      const sourceValue = source[key];

      if (sourceValue === undefined) continue;
      if (sourceValue === null) {
        result[key] = null as any; // Deletion semantic
        continue;
      }

      // Deep merge plain objects
      if (
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue) &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as any;
      } else {
        result[key] = sourceValue as any; // Replace arrays/primitives
      }
    }
  }

  return result;
}
```

**Rationale**:
- Deep merge prevents accidental loss of nested properties
- Array replacement is predictable (merging arrays is ambiguous)
- Matches behavior of Babel, Webpack, TypeScript config tools
- Explicit null allows unsetting inherited values

**Alternatives Considered**:
- **Shallow merge**: Rejected - would lose nested properties
- **Array append**: Rejected - ambiguous semantics (concat vs dedupe?)
- **Replace-only**: Rejected - requires full config every time

---

## 3. Project Root Detection

### Decision: Walk Up Directory Tree with Markers

**Chosen Approach**:
```typescript
function findProjectRoot(options: {
  markers?: string[];
  maxDepth?: number;
  startPath?: string;
} = {}): string | null {
  const {
    markers = ['.lcp', 'package.json', '.git'],
    maxDepth = 20,
    startPath = process.cwd(),
  } = options;

  let currentDir = resolve(startPath);
  let depth = 0;

  while (depth < maxDepth) {
    for (const marker of markers) {
      const markerPath = join(currentDir, marker);
      if (existsSync(markerPath)) {
        return currentDir;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null; // Reached root
    }

    currentDir = parentDir;
    depth++;
  }

  return null;
}
```

**Rationale**:
- Matches Git, npm, Docker behavior (users expect this)
- Handles nested projects gracefully
- Depth limit prevents infinite loops
- Multiple markers allow flexibility (`.lcp`, `package.json`, `.git`)

**Alternatives Considered**:
- **Fixed depth search**: Rejected - too restrictive for deep directory structures
- **Filesystem boundary detection**: Deferred - adds complexity for rare edge case
- **Cache results**: Deferred - premature optimization

---

## 4. JSON Schema Validation

### Decision: Zod for TypeScript Integration

**Chosen Library**: **Zod**

**Key Features**:
- Best TypeScript inference (types derived from schemas)
- Zero dependencies (lightweight)
- Excellent error messages (human-readable)
- Composable schemas
- Runtime type safety

**Example**:
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  account: z.string().optional(),
  team: z.string().optional(),
  moniker: z.string().regex(/^[a-z0-9-]+$/).optional(),
  provider: z.enum(['aws', 'azure', 'mock']).optional(),
  region: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>; // TypeScript type inferred!

function loadConfig(path: string): Config {
  const json = JSON.parse(readFileSync(path, 'utf-8'));
  const result = ConfigSchema.safeParse(json);

  if (!result.success) {
    throw new ConfigValidationError(
      `Invalid configuration in ${path}`,
      result.error.format()
    );
  }

  return result.data;
}
```

**Rationale**:
- Type inference eliminates duplicate type definitions
- Composable schemas enable reuse
- Excellent error messages improve UX
- Zero dependencies aligns with Principle IV (Simplicity)

**Alternatives Considered**:
- **Ajv**: Rejected - requires JSON Schema spec, less TypeScript integration
- **Joi**: Rejected - heavier dependencies, less TypeScript-friendly
- **TypeBox**: Considered - good, but Zod has better ecosystem

---

## 5. Atomic File Writes

### Decision: Temp File + Rename Pattern

**Chosen Pattern**:
```typescript
function writeFileAtomic(
  filepath: string,
  data: string,
  options: { encoding?: BufferEncoding; mode?: number; fsync?: boolean } = {}
): void {
  const { encoding = 'utf-8', mode = 0o644, fsync = true } = options;

  const dir = dirname(filepath);
  const tmpName = `.${Date.now()}.${randomBytes(6).toString('hex')}.tmp`;
  const tmpPath = join(dir, tmpName);

  try {
    mkdirSync(dir, { recursive: true, mode: 0o755 });
    writeFileSync(tmpPath, data, { encoding, mode });

    if (fsync) {
      const fd = openSync(tmpPath, 'r');
      fsyncSync(fd);
      closeSync(fd);
    }

    renameSync(tmpPath, filepath); // Atomic!
  } catch (error) {
    try {
      unlinkSync(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
```

**Rationale**:
- `rename()` is atomic on POSIX systems (single syscall)
- Prevents partial writes during crashes
- No race conditions between readers/writers
- Standard pattern (used by Git, editors, databases)

**Bun Optimization**:
```typescript
import { write, file } from 'bun';

async function writeFileAtomicBun(filepath: string, data: string): Promise<void> {
  const tmpPath = join(dirname(filepath), `.${Date.now()}.tmp`);

  try {
    await write(tmpPath, data);
    await file(tmpPath).move(filepath); // Atomic rename
  } catch (error) {
    try {
      await unlink(tmpPath);
    } catch {}
    throw error;
  }
}
```

**Alternatives Considered**:
- **Direct write**: Rejected - risk of corruption
- **Lock files**: Rejected - added complexity, not needed for single-user CLI
- **Write-ahead log**: Rejected - overkill for config files

---

## 6. Error Handling Patterns

### Decision: Layered Error Handling with User Guidance

**Error Categories**:
1. Parse errors (malformed JSON)
2. Validation errors (invalid schema)
3. Permission errors (EACCES, EPERM)
4. Not found (ENOENT)
5. Filesystem errors (ENOSPC, EROFS)

**Implementation**:
```typescript
class ConfigError extends Error {
  constructor(
    public readonly type: 'parse' | 'validation' | 'permission' | 'not_found' | 'filesystem',
    message: string,
    public readonly path: string
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

function loadConfigSafe(projectRoot?: string): {
  config: Config;
  source: 'global' | 'local' | 'default';
  warnings: string[];
} {
  const warnings: string[] = [];
  const paths = getConfigPaths(projectRoot);

  // Try project-local first
  if (paths.local && existsSync(paths.local)) {
    try {
      const config = loadAndValidateConfig(paths.local);
      return { config, source: 'local', warnings };
    } catch (error) {
      warnings.push(formatConfigError(error, paths.local));
      // Fall through to global
    }
  }

  // Try global
  if (existsSync(paths.global)) {
    try {
      const config = loadAndValidateConfig(paths.global);
      return { config, source: 'global', warnings };
    } catch (error) {
      warnings.push(formatConfigError(error, paths.global));
      // Fall through to defaults
    }
  }

  // Return defaults
  return {
    config: ConfigSchema.parse({}),
    source: 'default',
    warnings,
  };
}
```

**Rationale**:
- Graceful degradation (corrupt config → warning + defaults)
- Clear error messages with actionable suggestions
- No silent failures (Principle V: Observability)
- Categorized errors enable specific guidance

**Alternatives Considered**:
- **Fail fast**: Rejected - breaks workflows if config corrupted
- **Silent fallback**: Rejected - violates observability principle
- **Interactive prompts**: Rejected - breaks automation

---

## 7. Deployment Progress Feedback

### Decision: Multi-Level Progress with ora (Spinners)

**Chosen Library**: **ora** for spinners + custom logger

**Implementation**:
```typescript
import ora, { Ora } from 'ora';

class DeploymentProgress {
  private spinner?: Ora;
  private verbose: boolean;
  private quiet: boolean;

  constructor(options: { verbose?: boolean; quiet?: boolean }) {
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
  }

  start(message: string): void {
    if (this.quiet) return;

    if (this.verbose) {
      logger.info(message);
    } else {
      this.spinner = ora(message).start();
    }
  }

  update(message: string): void {
    if (this.quiet) return;

    if (this.verbose) {
      logger.info(message);
    } else {
      this.spinner?.text = message;
    }
  }

  succeed(message: string): void {
    if (this.quiet) return;

    if (this.verbose) {
      logger.success(message);
    } else {
      this.spinner?.succeed(message);
    }
  }

  fail(message: string): void {
    if (this.quiet) return;

    if (this.verbose) {
      logger.error(message);
    } else {
      this.spinner?.fail(message);
    }
  }
}
```

**Rationale**:
- Aligns with `--verbose`, `--quiet` flags (Principle V)
- Spinners don't work in `--verbose` mode (logs interfere)
- TTY detection automatic in ora
- Simple implementation (Principle IV)

**Alternatives Considered**:
- **cli-progress** (progress bars): Deferred - not needed for initial deployment
- **listr2** (task lists): Rejected - too complex for simple deployments
- **Custom spinner**: Rejected - ora is well-tested, zero-complexity

---

## 8. Async Deployment Operations

### Decision: Local Polling (Phase 1), Platform-Based (Future)

**Phase 1 Implementation**:
```typescript
async function pollDeploymentStatus(
  appRuntime: AppRuntime,
  deploymentId: string,
  options: {
    maxAttempts: number;
    intervalMs: number;
    onProgress?: (status: DeploymentStatus) => void;
  }
): Promise<DeploymentResult> {
  let attempts = 0;

  while (attempts < options.maxAttempts) {
    const status = await appRuntime.getDeploymentStatus(deploymentId);
    options.onProgress?.(status);

    if (status.phase === 'succeeded' || status.phase === 'failed') {
      return status;
    }

    await sleep(options.intervalMs);
    attempts++;
  }

  throw new Error('Deployment timeout exceeded');
}
```

**Rationale**:
- Simple, testable, works with mock provider
- No complex async orchestration needed initially
- Aligns with Principle IV (YAGNI): Build when needed

**Future Phase 2** (when core library supports it):
- `--async` flag for fire-and-forget deployments
- Platform handles orchestration internally
- CLI returns deployment ID for tracking

**Alternatives Considered**:
- **Immediate async support**: Rejected - premature, core library doesn't support yet
- **WebSocket streaming**: Deferred - adds complexity, not in requirements
- **Server-Sent Events**: Deferred - requires platform support

---

## 9. Concurrent Deployment Detection

### Decision: File-Based Locks with PID Checking

**Implementation**:
```typescript
interface DeploymentLock {
  deploymentId: string;
  appName: string;
  provider: string;
  startedAt: string;
  pid: number;
}

class DeploymentLockManager {
  private lockDir = join(homedir(), '.lcp', 'locks');

  async acquire(appName: string, provider: string, deploymentId: string): Promise<void> {
    const lockPath = join(this.lockDir, `${provider}-${appName}.lock`);

    if (existsSync(lockPath)) {
      const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));

      // Check if process still alive
      if (this.isProcessAlive(lock.pid)) {
        throw new Error(
          `Deployment already in progress for ${appName} on ${provider}\n` +
          `Started at: ${lock.startedAt}\n` +
          `Deployment ID: ${lock.deploymentId}`
        );
      } else {
        // Stale lock - remove it
        unlinkSync(lockPath);
      }
    }

    // Create lock
    const lock: DeploymentLock = {
      deploymentId,
      appName,
      provider,
      startedAt: new Date().toISOString(),
      pid: process.pid,
    };

    writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  }

  release(appName: string, provider: string): void {
    const lockPath = join(this.lockDir, `${provider}-${appName}.lock`);
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0); // Signal 0 checks existence
      return true;
    } catch {
      return false;
    }
  }
}
```

**Rationale**:
- Simple, no API dependency, works with mock provider
- PID checking detects stale locks from crashed processes
- Per-machine safety (doesn't prevent cross-machine deployments)
- Aligns with Principle IV (Simplicity)

**Alternatives Considered**:
- **API-based locks**: Deferred - requires platform support
- **Distributed locks (Redis)**: Rejected - massive overkill
- **No locks**: Rejected - violates requirement FR-033b

---

## 10. Deployment State Tracking

### Decision: Local JSON File + Optional API Sync

**State File**: `~/.lcp/state/deployments.json`

**Structure**:
```typescript
interface DeploymentStateRecord {
  appName: string;
  provider: string;
  region: string;
  deploymentId: string;
  version: string;
  imageUri: string;
  deployedAt: string;
  status: 'active' | 'superseded' | 'failed';
  url?: string;
}

interface DeploymentState {
  deployments: Record<string, DeploymentStateRecord>; // Key: `${provider}-${region}-${appName}`
  lastUpdated: string;
}
```

**Rationale**:
- Fast, works offline, no API dependency
- Single source of truth per machine
- Inspectable by users (Principle V: Observability)
- Optional API sync for detecting out-of-band changes

**Alternatives Considered**:
- **API-only state**: Rejected - requires constant connectivity
- **SQLite database**: Rejected - overkill for simple key-value data
- **No state tracking**: Rejected - violates requirement FR-024

---

## 11. Dry-Run Implementation

### Decision: Validation + Plan Preview Without Execution

**Pattern**:
```typescript
async function deployCommand(name: string, opts: DeployOptions): Promise<void> {
  const platform = await createPlatform(opts);
  const appRuntime = platform.getAppRuntime();

  // Step 1: Validate
  const validation = await appRuntime.validateDeployment({
    name,
    image: opts.image,
    config: opts.config,
  });

  if (!validation.valid) {
    logger.error('Validation failed:');
    validation.errors.forEach((err) => logger.error(`  - ${err}`));
    process.exit(2);
  }

  // Step 2: Dry-run preview
  if (opts.dryRun) {
    const plan = await appRuntime.planDeployment({
      name,
      image: opts.image,
      config: opts.config,
    });

    console.log('Deployment Preview (--dry-run):\n');
    console.log(`App: ${name}`);
    console.log(`Image: ${opts.image}\n`);
    console.log('Steps:');
    plan.steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step.description}`);
    });
    console.log('\nNo changes applied (dry-run mode).');
    process.exit(0);
  }

  // Step 3: Execute
  // ... actual deployment ...
}
```

**Rationale**:
- Separates validation, planning, execution
- Users see exactly what will happen (Principle V)
- Core library provides plan generation (Principle II)

**Alternatives Considered**:
- **No dry-run**: Rejected - violates requirement FR-037
- **Simulation mode**: Rejected - too complex to maintain parallel logic

---

## 12. Error Recovery

### Decision: Automatic Rollback with User Control

**Pattern**:
```typescript
async function handleDeploymentFailure(
  appRuntime: AppRuntime,
  deployment: { id: string },
  opts: DeployOptions
): Promise<never> {
  logger.error('Deployment failed');

  if (opts.noRollback) {
    logger.warn('Rollback disabled (--no-rollback).');
    logger.info(`Deployment ID: ${deployment.id}`);
    logger.info('Manually clean up with: lcp app delete');
    process.exit(7);
  }

  try {
    logger.info('Attempting automatic rollback...');
    await appRuntime.rollbackDeployment(deployment.id);
    logger.success('Rollback complete.');
    process.exit(7); // Still error - deployment failed
  } catch (rollbackError) {
    logger.error('CRITICAL: Rollback failed!');
    logger.error(rollbackError.message);
    logger.info(`Deployment ID: ${deployment.id}`);
    logger.info('Manually clean up with: lcp app delete');
    process.exit(8); // Critical error
  }
}
```

**Rationale**:
- Default to safe behavior (automatic rollback)
- User control via `--no-rollback` flag
- Clear guidance for manual cleanup
- Aligns with Principle V (actionable errors)

**Alternatives Considered**:
- **No rollback**: Rejected - leaves system in bad state
- **Always rollback**: Rejected - users may want to inspect failed state
- **Prompt for rollback**: Rejected - breaks automation

---

## Summary of Technology Decisions

| Area | Decision | Library/Pattern | Key Benefit |
|------|----------|-----------------|-------------|
| **Config Location** | Global + Project-local | `~/.lcp/config.json` + `.lcp/config.json` | User familiarity (Git-like) |
| **Config Merge** | Deep merge with replace | Custom utility | Predictable, no surprises |
| **Project Root** | Walk up with markers | Custom utility | Git/npm-compatible |
| **Validation** | Zod | Zod library | TypeScript inference |
| **Atomic Writes** | Temp + rename | Bun optimized | Corruption prevention |
| **Progress** | Spinner + logs | ora library | `--verbose`/`--quiet` support |
| **Async Deploy** | Local polling | Custom utility | Simple, testable |
| **Concurrency** | File locks + PID | Native fs/process | No dependencies |
| **State** | Local JSON file | Native fs | Fast, offline-capable |
| **Dry-Run** | Validate + plan | Core library | Separation of concerns |
| **Rollback** | Automatic (opt-out) | Core library | Safe defaults |

---

## Implementation Notes

### Dependencies to Add

```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "ora": "^8.0.1"
  }
}
```

### File Structure

```
src/
├── config/
│   ├── loader.ts          # Load global + project-local
│   ├── writer.ts          # Atomic write with merge
│   ├── schema.ts          # Zod schemas
│   └── types.ts           # TypeScript types
├── utils/
│   ├── progress.ts        # DeploymentProgress class
│   ├── locks.ts           # DeploymentLockManager
│   ├── state.ts           # DeploymentStateManager
│   ├── polling.ts         # pollDeploymentStatus
│   └── retry.ts           # retryWithBackoff (future)
```

### Testing Strategy

- **Unit tests**: Config merge logic, schema validation, error handling
- **Integration tests**: Config loading with fixtures, state management
- **E2E tests**: Full command invocations with mock provider

---

## References

- Zod documentation: https://zod.dev
- ora documentation: https://github.com/sindresorhus/ora
- XDG Base Directory specification: https://specifications.freedesktop.org/basedir-spec/latest/
- Commander.js documentation: https://github.com/tj/commander.js
- Bun file I/O: https://bun.sh/docs/api/file-io
