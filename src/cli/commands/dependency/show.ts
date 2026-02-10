/**
 * lcp dependency show command
 * Show details about a specific dependency
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

export function createShowCommand(): Command {
  return new Command('show')
    .description('Show details about a specific dependency')
    .argument('<moniker>', 'Dependency moniker')
    .option('--manifest <file>', 'Path to manifest file (default: ./lcp-manifest.yaml)')
    .addHelpText(
      'after',
      `
Examples:
  # Show dependency details
  $ lcp dependency show backups

  # Show with JSON output
  $ lcp dependency show backups --json

  # Use specific manifest file
  $ lcp dependency show backups --manifest path/to/lcp-manifest.yaml
`
    )
    .action(async function (this: Command, moniker: string) {
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
          console.error(`Looking for dependency: ${moniker}`);
        }

        // Parse manifest
        const manifest = await parseManifest(manifestPath);

        // Find dependency
        const dependency = manifest.dependencies[moniker];
        if (!dependency) {
          const available = Object.keys(manifest.dependencies);
          throw new Error(
            `Dependency not found: ${moniker}\n\n` +
              `Available dependencies: ${available.length > 0 ? available.join(', ') : 'none'}\n` +
              `To add this dependency, use: lcp dependency add ${moniker} --type <type>`
          );
        }

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                moniker,
                type: dependency.type,
                config: dependency.config || {},
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log(`Dependency: ${moniker}`);
          console.log(`Type: ${dependency.type}`);

          if (dependency.config && Object.keys(dependency.config).length > 0) {
            console.log('');
            console.log('Configuration:');
            console.log(JSON.stringify(dependency.config, null, 2));
          } else {
            console.log('');
            console.log('Configuration: (using defaults)');
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
