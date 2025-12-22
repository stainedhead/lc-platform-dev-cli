/**
 * lcp context clear command
 * Clear CLI context configuration
 */

import { Command } from 'commander';
import { clearGlobalConfig, clearProjectLocalConfig } from '../../../config/writer.js';

export function createClearCommand(): Command {
  return new Command('clear')
    .description('Clear CLI context configuration')
    .option('--local', 'Clear project-local config (.lcp/config.json) instead of global')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{ local?: boolean; quiet?: boolean }>();
      const local = cmdOptions.local || false;

      try {
        if (local) {
          clearProjectLocalConfig();
          if (!cmdOptions.quiet) {
            console.log('✓ Project-local context cleared');
            console.log(`  Location: .lcp/config.json`);
          }
        } else {
          clearGlobalConfig();
          if (!cmdOptions.quiet) {
            console.log('✓ Global context cleared');
            console.log(`  Location: ~/.lcp/config.json`);
          }
        }
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
