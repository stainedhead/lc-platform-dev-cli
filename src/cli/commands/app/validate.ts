/**
 * lcp app validate command
 * Validate application configuration without making changes
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';

/**
 * Basic config validation for local files
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
 * Validate stored application using ApplicationConfigurator
 */
async function validateStoredApp(
  account: string,
  team: string,
  moniker: string,
  provider: string,
  region: string
): Promise<{ valid: boolean; failures: string[] }> {
  // Create adapters
  const adapterResult = createAdapters({ account, team, moniker, provider, region });
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage } = adapterResult.adapters!;

  // Create ApplicationConfigurator
  const appConfigurator = new LCPlatformAppConfigurator(storage);

  // Validate application
  const result = await appConfigurator.validate({ account, team, moniker });

  if (!result.success) {
    const error = result.error;
    if (error.code === 'NOT_FOUND') {
      throw new Error(
        `Application not found: ${account}/${team}/${moniker}\n\n` +
          `Initialize the application first with: lcp app init`
      );
    }
    throw new Error(error.message);
  }

  const report = result.value;
  return {
    valid: report.valid,
    failures: report.failures.map((f) => `${f.field}: ${f.message}`),
  };
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate application configuration')
    .option('--config <file>', 'Path to application configuration file (JSON) to validate locally')
    .option('--account <account>', 'Cloud provider account identifier (for stored app validation)')
    .option('--team <team>', 'Team or organization identifier (for stored app validation)')
    .option('--moniker <moniker>', 'Application moniker (for stored app validation)')
    .option('--provider <provider>', 'Cloud provider (for stored app validation)')
    .option('--region <region>', 'Cloud region (for stored app validation)')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        config?: string;
        account?: string;
        team?: string;
        moniker?: string;
        provider?: string;
        region?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Validate config file if provided
        if (cmdOptions.config) {
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

          // Validate config (T036, T042)
          const validation = validateAppConfig(appConfig);

          if (cmdOptions.json) {
            console.log(
              JSON.stringify(
                {
                  valid: validation.valid,
                  errors: validation.errors,
                  file: cmdOptions.config,
                },
                null,
                2
              )
            );
          } else {
            if (validation.valid) {
              if (!cmdOptions.quiet) {
                console.log('✓ Configuration file is valid');
                console.log(`  File: ${cmdOptions.config}`);
              }
            } else {
              console.error('✗ Configuration file validation failed:');
              console.error('');
              validation.errors.forEach((error) => {
                console.error(`  - ${error}`);
              });
              console.error('');
              console.error(`Fix the errors in ${cmdOptions.config} and try again.`);
              process.exit(1);
            }
          }

          // Exit with appropriate code
          process.exit(validation.valid ? 0 : 1);
        } else {
          // Validate stored application
          const context = getResolvedContext(this);
          const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;
          validateRequiredContext(context, REQUIRED_FIELDS, 'app validate');

          const validation = await validateStoredApp(
            context.account!,
            context.team!,
            context.moniker!,
            context.provider!,
            context.region!
          );

          if (cmdOptions.json) {
            console.log(
              JSON.stringify(
                {
                  valid: validation.valid,
                  failures: validation.failures,
                  account: context.account,
                  team: context.team,
                  moniker: context.moniker,
                },
                null,
                2
              )
            );
          } else {
            if (validation.valid) {
              if (!cmdOptions.quiet) {
                console.log('✓ Stored application is valid');
                console.log(`  Application: ${context.account}/${context.team}/${context.moniker}`);
              }
            } else {
              console.error('✗ Stored application validation failed:');
              console.error('');
              validation.failures.forEach((error) => {
                console.error(`  - ${error}`);
              });
              process.exit(1);
            }
          }

          // Exit with appropriate code
          process.exit(validation.valid ? 0 : 1);
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
