/**
 * Global CLI options shared across all commands
 */

import type { Command } from 'commander';
import { loadConfigWithOptions } from '../config/loader.js';
import type { CliContext } from '../config/types.js';

export interface GlobalOptions {
  // Context options (from CliContext)
  account?: string;
  team?: string;
  moniker?: string;
  provider?: 'aws' | 'azure' | 'mock';
  region?: string;
  // Legacy profile option
  profile?: string;
  // Output and behavior options
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;
  dryRun?: boolean;
}

/**
 * Setup global options that apply to all commands
 */
export function setupGlobalOptions(program: Command): void {
  program
    // Context options (override config file values)
    .option('--account <account>', 'Cloud provider account identifier', process.env['LCP_ACCOUNT'])
    .option('--team <team>', 'Team or organization identifier', process.env['LCP_TEAM'])
    .option(
      '--moniker <moniker>',
      'Application moniker (unique identifier)',
      process.env['LCP_MONIKER']
    )
    .option(
      '-p, --provider <provider>',
      'Cloud provider (aws, azure, mock)',
      process.env['LCP_PROVIDER']
    )
    .option('-r, --region <region>', 'Cloud region', process.env['LCP_REGION'])
    // Legacy profile option
    .option('--profile <name>', 'Named configuration profile', process.env['LCP_PROFILE'])
    // Output and behavior options
    .option('--json', 'Output in JSON format', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('-q, --quiet', 'Suppress non-essential output', false)
    .option('--debug', 'Show debug information', process.env['LCP_DEBUG'] === 'true')
    .option('--dry-run', 'Preview changes without executing', false);
}

/**
 * Extract global options from a command
 */
export function getGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals<GlobalOptions>();
}

/**
 * Load and resolve CLI context with proper precedence:
 * 1. Command-line flags (from GlobalOptions)
 * 2. Project-local config (.lcp/config.json)
 * 3. Global config (~/.lcp/config.json)
 * 4. Empty defaults
 *
 * @param command - The commander Command instance
 * @returns Resolved CliContext with all sources merged
 */
export function getResolvedContext(command: Command): CliContext {
  const options = getGlobalOptions(command);

  // Extract context-related options
  // Only include defined values to satisfy exactOptionalPropertyTypes
  const contextOptions: Partial<CliContext> = {};
  if (options.account !== undefined) contextOptions.account = options.account;
  if (options.team !== undefined) contextOptions.team = options.team;
  if (options.moniker !== undefined) contextOptions.moniker = options.moniker;
  if (options.provider !== undefined) contextOptions.provider = options.provider;
  if (options.region !== undefined) contextOptions.region = options.region;

  // Load config files and merge with CLI options
  // CLI options have highest priority
  return loadConfigWithOptions(contextOptions);
}
