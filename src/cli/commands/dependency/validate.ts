/**
 * lcp dependency validate command
 * Validate all dependencies in the manifest
 */

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseManifest, DependencyType } from '../../../../../lc-platform-config/src/index.js';

/**
 * Find manifest file in current directory or specified path
 */
function findManifestPath(manifestPath?: string): string {
  if (manifestPath) {
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }
    return manifestPath;
  }

  // Look for lcp-manifest.yaml in current directory
  const defaultPath = join(process.cwd(), 'lcp-manifest.yaml');
  if (!existsSync(defaultPath)) {
    throw new Error(
      `No manifest file found. Expected ${defaultPath}\n\n` +
        'To create a manifest, use: lcp app init'
    );
  }

  return defaultPath;
}

/**
 * Validate dependencies
 */
function validateDependencies(
  dependencies: Record<string, { type: string; config?: Record<string, unknown> }>
): { valid: boolean; errors: Array<{ moniker: string; message: string }> } {
  const errors: Array<{ moniker: string; message: string }> = [];
  const validTypes = new Set(Object.values(DependencyType));

  for (const [moniker, dep] of Object.entries(dependencies)) {
    // Validate moniker format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(moniker) && moniker.length > 1) {
      errors.push({
        moniker,
        message: 'Moniker must be kebab-case (lowercase letters, numbers, and hyphens only)',
      });
    } else if (moniker.length < 2 || moniker.length > 64) {
      errors.push({
        moniker,
        message: 'Moniker must be between 2 and 64 characters',
      });
    }

    // Validate dependency type
    if (!validTypes.has(dep.type as DependencyType)) {
      errors.push({
        moniker,
        message: `Invalid dependency type: ${dep.type}. Valid types: ${Array.from(validTypes).join(', ')}`,
      });
    }

    // Additional validation could be added here for type-specific configuration
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate all dependencies in the manifest')
    .option('--manifest <file>', 'Path to manifest file (default: ./lcp-manifest.yaml)')
    .addHelpText(
      'after',
      `
Examples:
  # Validate dependencies
  $ lcp dependency validate

  # Validate with JSON output
  $ lcp dependency validate --json

  # Use specific manifest file
  $ lcp dependency validate --manifest path/to/lcp-manifest.yaml
`
    )
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        manifest?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Find manifest file
        const manifestPath = findManifestPath(cmdOptions.manifest);

        if (cmdOptions.debug) {
          console.error(`Reading manifest from: ${manifestPath}`);
        }

        // Parse manifest (this validates structure)
        const manifest = await parseManifest(manifestPath);

        // Validate dependencies
        const validation = validateDependencies(manifest.dependencies || {});

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                valid: validation.valid,
                errors: validation.errors,
                dependencyCount: Object.keys(manifest.dependencies || {}).length,
              },
              null,
              2
            )
          );
        } else {
          if (validation.valid) {
            if (!cmdOptions.quiet) {
              const count = Object.keys(manifest.dependencies || {}).length;
              console.log(`✓ All ${count} ${count === 1 ? 'dependency' : 'dependencies'} validated successfully`);
            }
          } else {
            console.error('✗ Dependency validation failed:');
            console.error('');
            validation.errors.forEach((error) => {
              console.error(`  ${error.moniker}: ${error.message}`);
            });
            process.exit(1);
          }
        }

        // Exit with appropriate code
        process.exit(validation.valid ? 0 : 1);
      } catch (error) {
        if (cmdOptions.debug) {
          console.error('Debug: Full error:', error);
        }
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
