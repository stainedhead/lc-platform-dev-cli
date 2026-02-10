/**
 * lcp version read command
 * Read and display a specific version's configuration
 */

import { Command } from 'commander';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppVersionConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Read version using VersionConfigurator
 */
async function readVersion(
  context: CliContext,
  versionNumber: string
): Promise<{
  id: string;
  version: string;
  metadata: Record<string, unknown>;
  dependencies: Array<{ type: string; name: string; configuration: Record<string, unknown> }>;
  createdAt: string;
  updatedAt: string;
}> {
  // Create adapters from context
  const adapterResult = createAdapters(context);
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage, policy, deployment } = adapterResult.adapters!;

  // Create VersionConfigurator
  const versionConfigurator = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

  // Read version
  const result = await versionConfigurator.read({
    account: context.account!,
    team: context.team!,
    moniker: context.moniker!,
    versionNumber,
  });

  if (!result.success) {
    const error = result.error;
    if (error.code === 'NOT_FOUND') {
      throw new Error(
        `Version not found: ${versionNumber}\n\n` +
          `To add a new version, use: lcp version add --ver ${versionNumber} --config <file>`
      );
    }
    throw new Error(error.message);
  }

  const version = result.value;
  return {
    id: version.id,
    version: version.versionNumber,
    metadata: version.metadata,
    dependencies: version.dependencies || [],
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
  };
}

export function createReadCommand(): Command {
  return new Command('read')
    .description('Read and display a version configuration')
    .requiredOption('--ver <version>', 'Version identifier to read')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .addHelpText(
      'after',
      `
Examples:
  # Read version details using context
  $ lcp version read --ver v1.0.0

  # Read version with JSON output
  $ lcp version read --ver v2.1.0 --json

  # Read version from specific app
  $ lcp version read --ver v1.5.3 --account prod-aws --team platform --moniker api-service
`
    )
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        ver: string;
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
        validateRequiredContext(context, REQUIRED_FIELDS, 'version read');

        // Validate version flag provided (FR-025)
        if (!cmdOptions.ver) {
          console.error('Error: --ver flag is required');
          console.error('Usage: lcp version read --ver <version>');
          process.exit(2);
        }

        // Read version via core library
        const versionData = await readVersion(context, cmdOptions.ver);

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                id: versionData.id,
                version: versionData.version,
                account: context.account,
                team: context.team,
                moniker: context.moniker,
                metadata: versionData.metadata,
                dependencies: versionData.dependencies,
                createdAt: versionData.createdAt,
                updatedAt: versionData.updatedAt,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log(`Version: ${versionData.version}`);
          console.log(`Application: ${context.moniker}`);
          console.log(`Account: ${context.account}`);
          console.log(`Team: ${context.team}`);
          console.log(`Created: ${versionData.createdAt}`);
          console.log(`Updated: ${versionData.updatedAt}`);

          if (versionData.dependencies.length > 0) {
            console.log('');
            console.log('Dependencies:');
            versionData.dependencies.forEach((dep) => {
              console.log(`  - ${dep.type}: ${dep.name}`);
            });
          }

          if (Object.keys(versionData.metadata).length > 0) {
            console.log('');
            console.log('Metadata:');
            console.log(JSON.stringify(versionData.metadata, null, 2));
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
