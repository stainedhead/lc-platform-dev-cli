/**
 * lcp version add command
 * Add a new version to an application
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppVersionConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Add version using VersionConfigurator
 */
async function addVersion(
  context: CliContext,
  versionNumber: string,
  config: Record<string, unknown>
): Promise<{ id: string; version: string; created: boolean }> {
  // Create adapters from context
  const adapterResult = createAdapters(context);
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage, policy, deployment } = adapterResult.adapters!;

  // Create VersionConfigurator
  const versionConfigurator = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

  // Extract dependencies and metadata from config
  const dependencies = config.dependencies as Array<{
    type: string;
    name: string;
    configuration: Record<string, unknown>;
  }> | undefined;

  const metadata = { ...config };
  delete metadata.dependencies; // Remove dependencies from metadata

  // Initialize version
  const result = await versionConfigurator.init({
    account: context.account!,
    team: context.team!,
    moniker: context.moniker!,
    versionNumber,
    dependencies,
    metadata,
  });

  if (!result.success) {
    const error = result.error;
    if (error.code === 'ALREADY_EXISTS') {
      throw new Error(
        `Version already exists: ${versionNumber}\n\n` +
          `To update the version, use: lcp version update --version ${versionNumber} --config <file>`
      );
    }
    throw new Error(error.message);
  }

  const version = result.value;
  return {
    id: version.id,
    version: version.versionNumber,
    created: true,
  };
}

export function createAddCommand(): Command {
  return new Command('add')
    .description('Add a new version to an application')
    .requiredOption('--ver <version>', 'Version identifier (e.g., v1.0.0 or 1.0.0)')
    .requiredOption('--config <file>', 'Path to version configuration file (JSON)')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .addHelpText(
      'after',
      `
Examples:
  $ lcp version add --ver v1.0.0 --config version-config.json
  $ lcp version add --ver 2.1.0 --config v2-config.json --moniker my-app
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
          console.log(`✓ Version ${result.version} added successfully`);
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
