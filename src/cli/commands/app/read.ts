/**
 * lcp app read command
 * Read and display application configuration
 */

import { Command } from 'commander';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Read application using ApplicationConfigurator
 */
async function readApp(context: CliContext): Promise<Record<string, unknown>> {
  // Create adapters from context
  const adapterResult = createAdapters(context);
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage } = adapterResult.adapters!;

  // Create ApplicationConfigurator
  const appConfigurator = new LCPlatformAppConfigurator(storage);

  // Read application
  const result = await appConfigurator.read({
    account: context.account!,
    team: context.team!,
    moniker: context.moniker!,
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
    moniker: app.moniker,
    account: app.account,
    team: app.team,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    ...app.metadata,
  };
}

export function createReadCommand(): Command {
  return new Command('read')
    .description('Read and display application configuration')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        account?: string;
        team?: string;
        moniker?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        const context = getResolvedContext(this);
        validateRequiredContext(context, REQUIRED_FIELDS, 'app read');

        const app = await readApp(context);

        if (cmdOptions.json) {
          console.log(JSON.stringify(app, null, 2));
        } else {
          console.log('Application configuration:');
          console.log('');
          for (const [key, value] of Object.entries(app)) {
            if (value !== undefined && value !== null) {
              console.log(`  ${key}: ${value}`);
            }
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
