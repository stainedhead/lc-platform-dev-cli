/**
 * lcp version deploy command
 * Deploy a specific version of an application
 */

import { Command } from 'commander';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import { createAdapters } from '../../../utils/adapter-factory.js';
import { LCPlatformAppVersionConfigurator } from '../../../../../lc-platform-processing-lib/src/index.js';
import type { CliContext } from '../../../config/types.js';

const REQUIRED_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Deploy version using VersionConfigurator
 */
async function deployVersion(
  context: CliContext,
  versionNumber: string,
  scope: 'all' | 'app-only' | 'dependencies-only',
  platformTooling: boolean,
  quiet: boolean
): Promise<{
  id: string;
  version: string;
  deployed: boolean;
  eventId?: string;
  deploymentLog?: string[];
}> {
  // Create adapters from context
  const adapterResult = createAdapters(context);
  if (!adapterResult.success) {
    throw new Error(`Failed to create adapters: ${adapterResult.error}`);
  }

  const { storage, policy, deployment } = adapterResult.adapters!;

  // Create VersionConfigurator
  const versionConfigurator = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

  // Show progress for local mode
  const progressCallback = !platformTooling && !quiet
    ? (message: string) => console.log(`  ${message}...`)
    : undefined;

  // Map scope to deployment options
  const deployApp = scope === 'all' || scope === 'app-only';
  const deployDependencies = scope === 'all' || scope === 'dependencies-only';

  // Deploy version
  const result = await versionConfigurator.deploy({
    account: context.account!,
    team: context.team!,
    moniker: context.moniker!,
    versionNumber,
    deployApp,
    deployDependencies,
    async: platformTooling,
    onProgress: progressCallback,
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

  const deploymentResult = result.value;

  return {
    id: deploymentResult.id,
    version: versionNumber,
    deployed: deploymentResult.status === 'completed',
    eventId: platformTooling ? deploymentResult.eventId : undefined,
    deploymentLog: deploymentResult.log,
  };
}

export function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Deploy a specific version of an application')
    .requiredOption('--ver <version>', 'Version identifier to deploy')
    .option('--app-only', 'Deploy only the application code')
    .option('--dependencies-only', 'Deploy only dependencies')
    .option('--all', 'Deploy application and dependencies (default)')
    .option('--platform-tooling', 'Use platform tooling for async deployment (returns event ID)')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .addHelpText(
      'after',
      `
Examples:
  # Deploy version with default scope (all)
  $ lcp version deploy --ver v1.0.0

  # Deploy only application code
  $ lcp version deploy --ver v1.2.0 --app-only

  # Deploy only dependencies
  $ lcp version deploy --ver v1.2.0 --dependencies-only

  # Deploy using platform tooling (async mode)
  $ lcp version deploy --ver v2.0.0 --platform-tooling
  # Returns event ID for tracking: lcp deployment status --event-id <id>

  # Dry-run to preview deployment
  $ lcp version deploy --ver v1.5.0 --dry-run

  # Deploy with explicit context
  $ lcp version deploy --ver v3.0.0 --account prod-aws --team platform --moniker api-service

Deployment Scopes:
  --all                Deploy both application code and dependencies (default)
  --app-only           Deploy only application code, skip dependencies
  --dependencies-only  Deploy only dependencies, skip application code

  Note: Only one scope flag can be specified at a time

Deployment Modes:
  Local (default)      Synchronous deployment with progress feedback
  --platform-tooling   Asynchronous deployment via platform, returns event ID for tracking
`
    )
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        ver: string;
        appOnly?: boolean;
        dependenciesOnly?: boolean;
        all?: boolean;
        platformTooling?: boolean;
        account?: string;
        team?: string;
        moniker?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
        dryRun?: boolean;
      }>();

      try {
        // Load and resolve context
        const context = getResolvedContext(this);
        validateRequiredContext(context, REQUIRED_FIELDS, 'version deploy');

        // Validate version flag provided (FR-025)
        if (!cmdOptions.ver) {
          console.error('Error: --ver flag is required');
          console.error(
            'Usage: lcp version deploy --ver <version> [--app-only|--dependencies-only|--all]'
          );
          process.exit(2);
        }

        // Validate scope flags - exactly one or none (default to all) (FR-029)
        const scopeFlags = [cmdOptions.appOnly, cmdOptions.dependenciesOnly, cmdOptions.all].filter(
          Boolean
        );
        if (scopeFlags.length > 1) {
          console.error(
            'Error: Only one of --app-only, --dependencies-only, or --all can be specified'
          );
          process.exit(2);
        }

        // Determine scope
        let scope: 'all' | 'app-only' | 'dependencies-only' = 'all';
        if (cmdOptions.appOnly) scope = 'app-only';
        else if (cmdOptions.dependenciesOnly) scope = 'dependencies-only';

        // Dry-run mode preview
        if (cmdOptions.dryRun) {
          if (!cmdOptions.quiet) {
            console.log('[DRY RUN] Would deploy version with:');
            console.log(`  Version: ${cmdOptions.ver}`);
            console.log(`  Application: ${context.moniker}`);
            console.log(`  Account: ${context.account}`);
            console.log(`  Team: ${context.team}`);
            console.log(`  Scope: ${scope}`);
            console.log(`  Mode: ${cmdOptions.platformTooling ? 'platform-tooling' : 'local'}`);
          }
          return;
        }

        // Deploy version
        if (!cmdOptions.quiet && !cmdOptions.platformTooling) {
          console.log(`Deploying version ${cmdOptions.ver}...`);
          console.log('');
        }

        const result = await deployVersion(
          context,
          cmdOptions.ver,
          scope,
          cmdOptions.platformTooling || false,
          cmdOptions.quiet || false
        );

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
                deployed: result.deployed,
                scope,
                mode: cmdOptions.platformTooling ? 'platform-tooling' : 'local',
                eventId: result.eventId,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log('');
          console.log('✓ Deployment successful');
          console.log(`  Version: ${result.version}`);
          console.log(`  Application: ${context.moniker}`);
          console.log(`  Scope: ${scope}`);

          if (result.eventId) {
            console.log(`  Event ID: ${result.eventId}`);
            console.log('');
            console.log(
              'Track deployment status with: lcp deployment status --event-id ' + result.eventId
            );
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
