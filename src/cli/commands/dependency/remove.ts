/**
 * lcp dependency remove command
 * Remove a dependency from the manifest
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

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

export function createRemoveCommand(): Command {
  return new Command('remove')
    .description('Remove a dependency from the manifest')
    .argument('<moniker>', 'Dependency moniker to remove')
    .option('--manifest <file>', 'Path to manifest file (default: ./lcp-manifest.yaml)')
    .option('--dry-run', 'Show what would be removed without actually removing it')
    .addHelpText(
      'after',
      `
Examples:
  # Remove a dependency
  $ lcp dependency remove backups

  # Preview removal without changing the file
  $ lcp dependency remove backups --dry-run

  # Use specific manifest file
  $ lcp dependency remove backups --manifest path/to/lcp-manifest.yaml
`
    )
    .action(async function (this: Command, moniker: string) {
      const cmdOptions = this.optsWithGlobals<{
        manifest?: string;
        dryRun?: boolean;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Find manifest file
        const manifestPath = findManifestPath(cmdOptions.manifest);

        if (cmdOptions.debug) {
          console.error(`Reading manifest from: ${manifestPath}`);
          console.error(`Removing dependency: ${moniker}`);
        }

        // Read and parse manifest (use raw YAML to preserve formatting)
        const content = readFileSync(manifestPath, 'utf-8');
        const manifest = parseYaml(content) as {
          dependencies?: Record<string, unknown>;
          [key: string]: unknown;
        };

        // Check if dependency exists
        if (!manifest.dependencies || !manifest.dependencies[moniker]) {
          const available = manifest.dependencies ? Object.keys(manifest.dependencies) : [];
          throw new Error(
            `Dependency not found: ${moniker}\n\n` +
              `Available dependencies: ${available.length > 0 ? available.join(', ') : 'none'}`
          );
        }

        // Get dependency info before removal
        const dependency = manifest.dependencies[moniker];

        // Dry-run mode
        if (cmdOptions.dryRun) {
          if (cmdOptions.json) {
            console.log(
              JSON.stringify(
                {
                  action: 'remove',
                  moniker,
                  dependency,
                  dryRun: true,
                },
                null,
                2
              )
            );
          } else if (!cmdOptions.quiet) {
            console.log(`[DRY RUN] Would remove dependency: ${moniker}`);
            console.log(`Type: ${(dependency as { type?: string }).type || 'unknown'}`);
          }
          return;
        }

        // Remove dependency
        delete manifest.dependencies[moniker];

        // Write updated manifest
        const updatedContent = stringifyYaml(manifest);
        writeFileSync(manifestPath, updatedContent, 'utf-8');

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                action: 'removed',
                moniker,
                file: manifestPath,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log(`✓ Removed dependency: ${moniker}`);
          console.log(`  Updated: ${manifestPath}`);
        }
      } catch (error) {
        if (cmdOptions.debug) {
          console.error('Debug: Full error:', error);
        }
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
