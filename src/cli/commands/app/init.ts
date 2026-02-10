/**
 * lcp app init command
 * Initialize a new application in the platform
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';
import type { CliContext } from '../../../config/types.js';

// Required context fields for app init
const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Initialize application using ApplicationConfigurator
 */
async function initializeApp(
  context: CliContext,
  metadata?: Record<string, unknown>
): Promise<{ id: string; status: string }> {
  // Create adapters from context
  const adapterResult = createAdapters(context);
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage } = adapterResult.adapters!;

  // Create ApplicationConfigurator
  const appConfigurator = new LCPlatformAppConfigurator(storage);

  // Initialize application
  const result = await appConfigurator.init({
    account: context.account!,
    team: context.team!,
    moniker: context.moniker!,
    metadata: metadata || {},
  });

  if (!result.success) {
    // Map ConfigurationError to user-friendly message
    const error = result.error;
    if (error.code === 'ALREADY_EXISTS') {
      throw new Error(
        `Application already exists: ${context.account}/${context.team}/${context.moniker}\n\n` +
          `To update the existing application, use: lcp app update --config <file>`
      );
    }
    throw new Error(error.message);
  }

  const app = result.value;
  return {
    id: app.id,
    status: 'active',
  };
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a new application in the platform')
    .option('--config <file>', 'Path to application configuration file (JSON)')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .option('--provider <provider>', 'Cloud provider (aws, azure, mock) (overrides context)')
    .option('--region <region>', 'Cloud region (overrides context)')
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
        dryRun?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load and resolve context (merges file config with CLI options)
        const context = getResolvedContext(this);

        // Validate required context fields (T030)
        validateRequiredContext(context, REQUIRED_FIELDS, 'app init');

        // Load config file if provided
        let appConfig: Record<string, unknown> | undefined;
        if (cmdOptions.config) {
          if (!existsSync(cmdOptions.config)) {
            console.error(`Error: Config file not found: ${cmdOptions.config}`);
            process.exit(1);
          }

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
        }

        // Dry-run mode
        if (cmdOptions.dryRun) {
          if (!cmdOptions.quiet) {
            console.log('[DRY RUN] Would initialize application with:');
            console.log(`  Account: ${context.account}`);
            console.log(`  Team: ${context.team}`);
            console.log(`  Moniker: ${context.moniker}`);
            if (context.provider) console.log(`  Provider: ${context.provider}`);
            if (context.region) console.log(`  Region: ${context.region}`);
            if (appConfig) {
              console.log(`  Config: ${Object.keys(appConfig).length} keys`);
            }
          }
          return;
        }

        // Initialize app via core library (T031 - includes duplicate detection)
        const result = await initializeApp(context, appConfig);

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                id: result.id,
                moniker: context.moniker,
                account: context.account,
                team: context.team,
                provider: context.provider,
                region: context.region,
                status: result.status,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log(`✓ Application initialized successfully`);
          console.log(`  Moniker: ${context.moniker}`);
          console.log(`  Account: ${context.account}`);
          console.log(`  Team: ${context.team}`);
          if (context.provider) console.log(`  Provider: ${context.provider}`);
          if (result.id) console.log(`  ID: ${result.id}`);
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
