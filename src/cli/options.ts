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
  // Active app override
  app?: string;
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
    // Active app override (one-off context switch)
    .option(
      '-a, --app <moniker>',
      'Use specific app for this command (moniker or team/moniker)',
      process.env['LCP_APP']
    )
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
 * Parse app flag (--app or -a) which can be:
 * - "moniker" (uses team from context)
 * - "team/moniker" (explicit team/moniker)
 */
function parseAppFlag(
  appFlag: string,
  currentContext: CliContext
): { team?: string; moniker?: string } {
  const parts = appFlag.split('/');

  if (parts.length === 1) {
    // Just moniker, use team from current context
    return {
      team: currentContext.team,
      moniker: parts[0],
    };
  } else if (parts.length === 2) {
    // team/moniker format
    return {
      team: parts[0],
      moniker: parts[1],
    };
  }

  // Invalid format, return empty
  return {};
}

/**
 * Load and resolve CLI context with proper precedence:
 * 1. Command-line flags (from GlobalOptions)
 * 2. -a/--app flag (temporary active app override)
 * 3. Project-local config (.lcp/config.json)
 * 4. Global config (~/.lcp/config.json)
 * 5. Empty defaults
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

  // Load config files first
  const baseContext = loadConfigWithOptions(contextOptions);

  // Handle -a/--app flag (one-off active app override)
  if (options.app) {
    const appOverride = parseAppFlag(options.app, baseContext);

    // Apply app override (team and moniker from -a flag)
    if (appOverride.team) baseContext.team = appOverride.team;
    if (appOverride.moniker) baseContext.moniker = appOverride.moniker;
  }

  return baseContext;
}
