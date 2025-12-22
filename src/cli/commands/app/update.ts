/**
 * lcp app update command
 * Update application configuration
 */

import { Command } from 'commander';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker'] as const;

/**
 * Basic config validation (same as validate command)
 */
function validateAppConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!config['name']) {
    errors.push('Missing required field: name');
  }

  // Validate field types
  if (config['name'] && typeof config['name'] !== 'string') {
    errors.push('Field "name" must be a string');
  }

  if (config['description'] && typeof config['description'] !== 'string') {
    errors.push('Field "description" must be a string');
  }

  if (config['environment'] && typeof config['environment'] !== 'object') {
    errors.push('Field "environment" must be an object');
  }

  // Validate environment variables are strings
  if (
    config['environment'] &&
    typeof config['environment'] === 'object' &&
    !Array.isArray(config['environment'])
  ) {
    for (const [key, value] of Object.entries(config['environment'] as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        errors.push(`Environment variable "${key}" must be a string, got ${typeof value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get path to mock app configs storage
 */
function getMockAppConfigPath(appKey: string): string {
  return join(homedir(), '.lcp', 'mock-app-configs', `${appKey.replace(/\//g, '-')}.json`);
}

/**
 * Mock app update
 * TODO: Replace with actual core library integration
 */
async function updateApp(
  context: CliContext,
  config: Record<string, unknown>
): Promise<{ id: string; status: string; updated: boolean }> {
  const appKey = `${context.account}/${context.team}/${context.moniker}`;
  const configPath = getMockAppConfigPath(appKey);
  const dir = join(homedir(), '.lcp', 'mock-app-configs');

  // Create directory if it doesn't exist
  mkdirSync(dir, { recursive: true });

  // Save config
  writeFileSync(
    configPath,
    JSON.stringify(
      {
        appKey,
        config,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  return {
    id: `app-${context.moniker}`,
    status: 'active',
    updated: true,
  };
}

export function createUpdateCommand(): Command {
  return new Command('update')
    .description('Update application configuration')
    .requiredOption('--config <file>', 'Path to application configuration file (JSON)')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
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
        validateRequiredContext(context, REQUIRED_FIELDS, 'app update');

        // Load config file
        if (!existsSync(cmdOptions.config)) {
          console.error(`Error: Config file not found: ${cmdOptions.config}`);
          process.exit(1);
        }

        let appConfig: Record<string, unknown>;
        try {
          const configContent = readFileSync(cmdOptions.config, 'utf-8');
          appConfig = JSON.parse(configContent);

          if (cmdOptions.debug) {
            console.error('Loaded config from file:', cmdOptions.config);
            console.error('Config:', JSON.stringify(appConfig, null, 2));
          }
        } catch (error) {
          console.error(`Error: Failed to parse config file: ${(error as Error).message}`);
          process.exit(1);
        }

        // Validate config before updating (T037, T041)
        const validation = validateAppConfig(appConfig);

        if (!validation.valid) {
          console.error('✗ Configuration validation failed:');
          console.error('');
          validation.errors.forEach((error) => {
            console.error(`  - ${error}`);
          });
          console.error('');
          console.error(`Fix the errors in ${cmdOptions.config} and try again.`);
          process.exit(1);
        }

        // Update app via core library
        const result = await updateApp(context, appConfig);

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                id: result.id,
                moniker: context.moniker,
                account: context.account,
                team: context.team,
                status: result.status,
                updated: result.updated,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log('✓ Application configuration updated successfully');
          console.log(`  Moniker: ${context.moniker}`);
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
