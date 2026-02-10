/**
 * lcp app update command
 * Update application configuration
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Basic config validation
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
 * Update application using ApplicationConfigurator
 */
async function updateApp(
  context: CliContext,
  metadata: Record<string, unknown>
): Promise<{ id: string; status: string; updated: boolean }> {
  // Create adapters from context
  const adapterResult = createAdapters(context);
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage } = adapterResult.adapters!;

  // Create ApplicationConfigurator
  const appConfigurator = new LCPlatformAppConfigurator(storage);

  // Update application
  const result = await appConfigurator.update({
    account: context.account!,
    team: context.team!,
    moniker: context.moniker!,
    metadata,
  });

  if (!result.success) {
    const error = result.error;
    if (error.code === 'NOT_FOUND') {
      throw new Error(
        `Application not found: ${context.account}/${context.team}/${context.moniker}\n\n` +
          `Initialize the application first with: lcp app init`
      );
    }
    throw new Error(error.message);
  }

  const app = result.value;
  return {
    id: app.id,
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
