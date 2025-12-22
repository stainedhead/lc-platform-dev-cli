/**
 * lcp context write command
 * Write CLI context configuration values
 */

import { Command } from 'commander';
import { writeGlobalConfig, writeProjectLocalConfig } from '../../../config/writer.js';
import type { CliContext } from '../../../config/types.js';

export function createWriteCommand(): Command {
  return new Command('write')
    .description('Write CLI context configuration values')
    .option('--local', 'Write to project-local config (.lcp/config.json) instead of global')
    .option('--account <account>', 'Cloud provider account identifier')
    .option('--team <team>', 'Team or organization identifier')
    .option('--moniker <moniker>', 'Application moniker (unique identifier)')
    .option('--provider <provider>', 'Cloud provider (aws, azure, mock)')
    .option('--region <region>', 'Cloud region')
    .action(async function (this: Command) {
      // Get all options including globals
      const cmdOptions = this.optsWithGlobals<{
        local?: boolean;
        account?: string;
        team?: string;
        moniker?: string;
        provider?: string;
        region?: string;
        json?: boolean;
        quiet?: boolean;
      }>();

      const local = cmdOptions.local || false;

      // Extract context values from command options
      const updates: Partial<CliContext> = {};

      if (cmdOptions.account !== undefined) {
        updates.account = cmdOptions.account;
      }
      if (cmdOptions.team !== undefined) {
        updates.team = cmdOptions.team;
      }
      if (cmdOptions.moniker !== undefined) {
        updates.moniker = cmdOptions.moniker;
      }
      if (cmdOptions.provider !== undefined) {
        updates.provider = cmdOptions.provider as 'aws' | 'azure' | 'mock';
      }
      if (cmdOptions.region !== undefined) {
        updates.region = cmdOptions.region;
      }

      // Check if any values were provided
      if (Object.keys(updates).length === 0) {
        console.error('Error: No context values provided.');
        console.error('');
        console.error('Usage: lcp context write [options]');
        console.error('');
        console.error('Options:');
        console.error('  --account <account>    Cloud provider account identifier');
        console.error('  --team <team>          Team or organization identifier');
        console.error('  --moniker <moniker>    Application moniker');
        console.error('  --provider <provider>  Cloud provider (aws, azure, mock)');
        console.error('  --region <region>      Cloud region');
        console.error('  --local                Write to project-local config');
        process.exit(1);
      }

      try {
        // Write config (merges with existing by default)
        if (local) {
          writeProjectLocalConfig(updates, true);
          if (!cmdOptions.quiet) {
            console.log('✓ Project-local context updated:');
            console.log(`  Location: .lcp/config.json`);
          }
        } else {
          writeGlobalConfig(updates, true);
          if (!cmdOptions.quiet) {
            console.log('✓ Global context updated:');
            console.log(`  Location: ~/.lcp/config.json`);
          }
        }

        if (!cmdOptions.quiet) {
          console.log('');
          console.log('Updated values:');
          for (const [key, value] of Object.entries(updates)) {
            console.log(`  ${key}: ${value}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
