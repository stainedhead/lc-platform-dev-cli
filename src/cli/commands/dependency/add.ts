/**
 * lcp dependency add command
 * Add a new dependency to the manifest
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { DependencyType } from '../../../../../lc-platform-config/src/index.js';

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
 * Validate dependency moniker format
 */
function validateMoniker(moniker: string): { valid: boolean; error?: string } {
  if (moniker.length < 2 || moniker.length > 64) {
    return {
      valid: false,
      error: 'Moniker must be between 2 and 64 characters',
    };
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(moniker) && moniker.length > 1) {
    return {
      valid: false,
      error: 'Moniker must be kebab-case (lowercase letters, numbers, and hyphens only)',
    };
  }

  return { valid: true };
}

/**
 * Parse configuration from JSON string or file
 */
function parseConfig(configInput?: string): Record<string, unknown> {
  if (!configInput) {
    return {};
  }

  // Try to parse as JSON first
  try {
    return JSON.parse(configInput) as Record<string, unknown>;
  } catch {
    // If not JSON, try to read as file
    if (existsSync(configInput)) {
      try {
        const fileContent = readFileSync(configInput, 'utf-8');
        return JSON.parse(fileContent) as Record<string, unknown>;
      } catch (error) {
        throw new Error(`Failed to parse config file ${configInput}: ${(error as Error).message}`);
      }
    }

    throw new Error(
      'Config must be valid JSON or a path to a JSON file\n' +
        'Example: --config \'{"encryption": "aes256", "versioning": true}\''
    );
  }
}

export function createAddCommand(): Command {
  return new Command('add')
    .description('Add a new dependency to the manifest')
    .argument('<moniker>', 'Dependency moniker (kebab-case identifier)')
    .requiredOption('--type <type>', `Dependency type (${Object.values(DependencyType).join(', ')})`)
    .option(
      '--config <json>',
      'Configuration as JSON string or path to JSON file'
    )
    .option('--manifest <file>', 'Path to manifest file (default: ./lcp-manifest.yaml)')
    .option('--dry-run', 'Show what would be added without actually modifying the manifest')
    .option('--force', 'Overwrite existing dependency with the same moniker')
    .addHelpText(
      'after',
      `
Examples:
  # Add a simple dependency with default configuration
  $ lcp dependency add backups --type object-store

  # Add with configuration as JSON
  $ lcp dependency add backups --type object-store --config '{"encryption": "aes256", "versioning": true}'

  # Add with configuration from file
  $ lcp dependency add backups --type object-store --config ./backups-config.json

  # Preview addition without modifying the file
  $ lcp dependency add order-queue --type queue --config '{"fifo": true}' --dry-run

  # Overwrite existing dependency
  $ lcp dependency add backups --type object-store --config '{"encryption": "aes256"}' --force

Supported dependency types:
  ${Object.values(DependencyType).join(', ')}
`
    )
    .action(async function (this: Command, moniker: string) {
      const cmdOptions = this.optsWithGlobals<{
        type: string;
        config?: string;
        manifest?: string;
        dryRun?: boolean;
        force?: boolean;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Validate moniker
        const monikerValidation = validateMoniker(moniker);
        if (!monikerValidation.valid) {
          throw new Error(`Invalid moniker: ${monikerValidation.error}`);
        }

        // Validate dependency type
        const validTypes = new Set(Object.values(DependencyType));
        if (!validTypes.has(cmdOptions.type as DependencyType)) {
          throw new Error(
            `Invalid dependency type: ${cmdOptions.type}\n` +
              `Valid types: ${Array.from(validTypes).join(', ')}`
          );
        }

        // Parse configuration
        const config = parseConfig(cmdOptions.config);

        // Find manifest file
        const manifestPath = findManifestPath(cmdOptions.manifest);

        if (cmdOptions.debug) {
          console.error(`Reading manifest from: ${manifestPath}`);
          console.error(`Adding dependency: ${moniker}`);
          console.error(`Type: ${cmdOptions.type}`);
          console.error(`Config: ${JSON.stringify(config)}`);
        }

        // Read and parse manifest (use raw YAML to preserve formatting)
        const content = readFileSync(manifestPath, 'utf-8');
        const manifest = parseYaml(content) as {
          dependencies?: Record<string, { type: string; config?: Record<string, unknown> }>;
          [key: string]: unknown;
        };

        // Initialize dependencies if not present
        if (!manifest.dependencies) {
          manifest.dependencies = {};
        }

        // Check if dependency already exists
        if (manifest.dependencies[moniker] && !cmdOptions.force) {
          throw new Error(
            `Dependency already exists: ${moniker}\n` +
              `Type: ${manifest.dependencies[moniker]!.type}\n\n` +
              `To overwrite, use --force flag\n` +
              `To modify, use: lcp dependency remove ${moniker} && lcp dependency add ${moniker} --type ${cmdOptions.type}`
          );
        }

        // Create dependency entry
        const dependency: { type: string; config?: Record<string, unknown> } = {
          type: cmdOptions.type,
        };

        // Only add config if it's not empty
        if (Object.keys(config).length > 0) {
          dependency.config = config;
        }

        // Dry-run mode
        if (cmdOptions.dryRun) {
          if (cmdOptions.json) {
            console.log(
              JSON.stringify(
                {
                  action: 'add',
                  moniker,
                  dependency,
                  dryRun: true,
                  wouldOverwrite: !!manifest.dependencies[moniker],
                },
                null,
                2
              )
            );
          } else if (!cmdOptions.quiet) {
            console.log(`[DRY RUN] Would add dependency:`);
            console.log(`  Moniker: ${moniker}`);
            console.log(`  Type: ${cmdOptions.type}`);
            if (Object.keys(config).length > 0) {
              console.log(`  Config: ${JSON.stringify(config, null, 2)}`);
            }
            if (manifest.dependencies[moniker]) {
              console.log(`  ⚠️  Would overwrite existing dependency`);
            }
          }
          return;
        }

        // Add dependency
        manifest.dependencies[moniker] = dependency;

        // Write updated manifest
        const updatedContent = stringifyYaml(manifest);
        writeFileSync(manifestPath, updatedContent, 'utf-8');

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                action: 'added',
                moniker,
                type: cmdOptions.type,
                file: manifestPath,
                overwritten: cmdOptions.force && manifest.dependencies[moniker] !== undefined,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          const action = cmdOptions.force ? 'Updated' : 'Added';
          console.log(`✓ ${action} dependency: ${moniker}`);
          console.log(`  Type: ${cmdOptions.type}`);
          if (Object.keys(config).length > 0) {
            console.log(`  Configuration: ${Object.keys(config).length} ${Object.keys(config).length === 1 ? 'property' : 'properties'}`);
          }
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
