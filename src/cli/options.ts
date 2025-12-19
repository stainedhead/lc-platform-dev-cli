/**
 * Global CLI options shared across all commands
 */

import type { Command } from 'commander';

export interface GlobalOptions {
  provider?: 'aws' | 'azure' | 'mock';
  region?: string;
  profile?: string;
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
    .option(
      '-p, --provider <provider>',
      'Cloud provider (aws, azure, mock)',
      process.env['LCP_PROVIDER']
    )
    .option('-r, --region <region>', 'Cloud region', process.env['LCP_REGION'])
    .option('--profile <name>', 'Named configuration profile', process.env['LCP_PROFILE'])
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
