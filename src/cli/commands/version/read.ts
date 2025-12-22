/**
 * lcp version read command
 * Read and display a specific version's configuration
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
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
 * Mock version read
 * TODO: Replace with actual core library integration
 */
async function readVersion(context: CliContext, version: string): Promise<Record<string, unknown>> {
  const appKey = `${context.account}/${context.team}/${context.moniker}`;
  const versions = loadVersions(appKey);

  if (!versions[version]) {
    throw new Error(
      `Version not found: ${version}\n\n` +
        `Available versions: ${Object.keys(versions).join(', ') || 'none'}\n` +
        `To add a new version, use: lcp version add --version ${version} --config <file>`
    );
  }

  return versions[version] as Record<string, unknown>;
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
          console.log(JSON.stringify(versionData, null, 2));
        } else {
          console.log(`Version: ${versionData['version']}`);
          console.log(`Created: ${versionData['createdAt']}`);
          console.log(`Updated: ${versionData['updatedAt']}`);
          console.log(`Deployed: ${versionData['isDeployed'] ? 'Yes' : 'No'}`);
          console.log('');
          console.log('Configuration:');
          console.log(JSON.stringify(versionData['config'], null, 2));
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
