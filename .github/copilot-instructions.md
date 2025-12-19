# GitHub Copilot Instructions

This file provides guidance to GitHub Copilot when working with code in this repository.

## Single Source of Truth

**All development rules, patterns, and guidelines are defined in [AGENTS.md](../AGENTS.md).**

When suggesting code or making edits:
- Follow the patterns and conventions documented in AGENTS.md
- If you identify a rule that should be added or modified, update AGENTS.md directly
- Do not create duplicate or conflicting rules in other files
- AGENTS.md is the authoritative source for all AI assistants working in this repository

## Quick Reference

**Project**: `lc-platform-dev-cli` - CLI wrapper for `@stainedhead/lc-platform-dev-accelerators`
**Executable**: `lcp`
**Runtime**: Bun 1.0+ (not Node.js)
**Language**: TypeScript with strict mode

## Key Constraints

1. **No direct cloud SDK calls** - All cloud operations must go through the core library
2. **TDD required** - Write failing tests before implementation
3. **80% coverage minimum** - For all public interfaces
4. **Bun runtime** - Use Bun APIs, not Node.js compatibility layers

## Command Structure

```
lcp <service> <action> [options]

Global options: --provider, --region, --json, --verbose, --quiet, --debug, --dry-run
```

## Code Patterns

When generating CLI command code, follow this pattern from AGENTS.md:

```typescript
import { Command } from 'commander';
import { LCPlatform, ProviderType } from '@stainedhead/lc-platform-dev-accelerators';
import { formatOutput } from '../../formatters';
import { getConfig } from '../../config/loader';
import { handleError } from '../../utils/errors';

export function registerCommand(program: Command): void {
  program
    .command('action')
    .description('Description')
    .argument('<arg>', 'Argument description')
    .action(async (arg: string, options) => {
      try {
        const config = getConfig();
        const platform = new LCPlatform({
          provider: config.provider as ProviderType,
          region: config.region,
        });
        // Use core library methods
        const result = await platform.getService().method(arg);
        formatOutput(result, program.opts());
        process.exit(0);
      } catch (error) {
        handleError(error);
      }
    });
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | Auth error |
| 5 | Not found |
| 6 | Already exists |
| 7 | Network error |
| 8 | Timeout |

## Testing Pattern

```typescript
import { describe, it, expect } from 'bun:test';
import { $ } from 'bun';

describe('lcp command', () => {
  it('should succeed with valid input', async () => {
    const result = await $`./dist/lcp service action arg --provider mock --json`.quiet();
    expect(result.exitCode).toBe(0);
  });
});
```

## Essential Commands

```bash
bun run format    # Format first
bun run lint      # Then lint
bun test          # Run tests
bun run typecheck # Type-check
bun run build     # Build
```

## Related Documentation

- [AGENTS.md](../AGENTS.md) - **Primary source** for all rules and guidelines
- [Constitution](../.specify/memory/constitution.md) - Project principles and governance
- [README.md](../README.md) - User documentation
