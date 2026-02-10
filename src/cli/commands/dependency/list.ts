/**
 * lcp dependency list command
 * List all dependencies from the manifest file
 */

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseManifest } from '../../../../../lc-platform-config/src/index.js';

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

export function createListCommand(): Command {
  return new Command('list')
    .description('List all dependencies from the manifest')
    .option('--manifest <file>', 'Path to manifest file (default: ./lcp-manifest.yaml)')
    .addHelpText(
      'after',
      `
Examples:
  # List dependencies from current directory
  $ lcp dependency list

  # List with JSON output
  $ lcp dependency list --json

  # Use specific manifest file
  $ lcp dependency list --manifest path/to/lcp-manifest.yaml
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

        // Parse manifest
        const manifest = await parseManifest(manifestPath);

        // Extract dependencies
        const dependencies = manifest.dependencies || {};
        const dependencyList = Object.entries(dependencies).map(([moniker, dep]) => ({
          moniker,
          type: dep.type,
          configured: dep.config !== undefined && Object.keys(dep.config).length > 0,
        }));

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                count: dependencyList.length,
                dependencies: dependencyList,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          if (dependencyList.length === 0) {
            console.log('No dependencies found in manifest.');
            console.log('');
            console.log('To add a dependency, use: lcp dependency add <moniker> --type <type>');
          } else {
            console.log(`Found ${dependencyList.length} ${dependencyList.length === 1 ? 'dependency' : 'dependencies'}:`);
            console.log('');

            // Find max moniker length for alignment
            const maxMonikerLength = Math.max(...dependencyList.map((d) => d.moniker.length));

            dependencyList.forEach((dep) => {
              const padding = ' '.repeat(maxMonikerLength - dep.moniker.length + 2);
              const configBadge = dep.configured ? '✓' : '○';
              console.log(`  ${dep.moniker}${padding}${dep.type}  ${configBadge}`);
            });

            console.log('');
            console.log('Legend: ✓ configured, ○ default config');
          }
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
