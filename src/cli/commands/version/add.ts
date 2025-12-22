/**
 * lcp version add command
 * Add a new version to an application
 */

import { Command } from 'commander';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker'] as const;

/**
 * Get path to mock versions storage
 */
function getMockVersionsPath(appKey: string): string {
  return join(homedir(), '.lcp', 'mock-versions', `${appKey.replace(/\//g, '-')}.json`);
}

/**
 * Load existing versions for an app
 */
function loadVersions(appKey: string): Record<string, unknown> {
  const path = getMockVersionsPath(appKey);
  if (!existsSync(path)) {
    return {};
  }

  try {
    const data = readFileSync(path, 'utf-8');
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Save versions for an app
 */
function saveVersions(appKey: string, versions: Record<string, unknown>): void {
  const path = getMockVersionsPath(appKey);
  const dir = join(homedir(), '.lcp', 'mock-versions');

  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(versions, null, 2));
}

/**
 * Mock version add
 * TODO: Replace with actual core library integration
 */
async function addVersion(
  context: CliContext,
  version: string,
  config: Record<string, unknown>
): Promise<{ id: string; version: string; created: boolean }> {
  const appKey = `${context.account}/${context.team}/${context.moniker}`;
  const versions = loadVersions(appKey);

  // Check if version already exists
  if (versions[version]) {
    throw new Error(
      `Version already exists: ${version}\n\n` +
        `To update the version, use: lcp version update --version ${version} --config <file>`
    );
  }

  // Add new version
  versions[version] = {
    version,
    config,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeployed: false,
  };

  saveVersions(appKey, versions);

  return {
    id: `version-${version}`,
    version,
    created: true,
  };
}

export function createAddCommand(): Command {
  return new Command('add')
    .description('Add a new version to an application')
    .requiredOption('--ver <version>', 'Version identifier (e.g., v1.0.0)')
    .requiredOption('--config <file>', 'Path to version configuration file (JSON)')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .addHelpText(
      'after',
      `
Examples:
  # Add a new version using context values
  $ lcp version add --ver v1.0.0 --config version-config.json

  # Add a version with explicit context
  $ lcp version add --ver v1.2.0 --config v1.2.0.json --account prod-aws --team platform --moniker api-service

  # Create version config file (version-config.json):
  {
    "name": "my-app-v1.0.0",
    "description": "Production release",
    "environment": {
      "LOG_LEVEL": "info",
      "PORT": "8080",
      "NODE_ENV": "production"
    },
    "resources": {
      "compute": {
        "memory": "2Gi",
        "cpu": "1000m"
      }
    }
  }
`
    )
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        ver: string;
        config: string;
        account?: string;
        team?: string;
        moniker?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load and resolve context
        const context = getResolvedContext(this);
        validateRequiredContext(context, REQUIRED_FIELDS, 'version add');

        // Validate version flag provided (FR-025)
        if (!cmdOptions.ver) {
          console.error('Error: --ver flag is required');
          console.error('Usage: lcp version add --ver <version> --config <file>');
          process.exit(2);
        }

        // Load config file
        if (!existsSync(cmdOptions.config)) {
          console.error(`Error: Config file not found: ${cmdOptions.config}`);
          process.exit(1);
        }

        let versionConfig: Record<string, unknown>;
        try {
          const configContent = readFileSync(cmdOptions.config, 'utf-8');
          versionConfig = JSON.parse(configContent);

          if (cmdOptions.debug) {
            console.error('Loaded config from file:', cmdOptions.config);
            console.error('Config:', JSON.stringify(versionConfig, null, 2));
          }
        } catch (error) {
          console.error(`Error: Failed to parse config file: ${(error as Error).message}`);
          process.exit(1);
        }

        // Add version via core library
        const result = await addVersion(context, cmdOptions.ver, versionConfig);

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                id: result.id,
                version: result.version,
                moniker: context.moniker,
                account: context.account,
                team: context.team,
                created: result.created,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log('✓ Version added successfully');
          console.log(`  Version: ${result.version}`);
          console.log(`  Application: ${context.moniker}`);
          console.log(`  Account: ${context.account}`);
          console.log(`  Team: ${context.team}`);
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
