/**
 * lcp context read command
 * Display current CLI context configuration
 */

import { Command } from 'commander';
import { loadConfig } from '../../../config/loader.js';

export function createReadCommand(): Command {
  return new Command('read')
    .description('Display current CLI context configuration')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{ json?: boolean }>();

      // Load merged config (global + project-local)
      const config = loadConfig();

      if (cmdOptions.json) {
        // JSON output
        console.log(JSON.stringify(config, null, 2));
      } else {
        // Human-readable table output
        if (Object.keys(config).length === 0) {
          console.log('No context configuration found.');
          console.log('');
          console.log('To set context values:');
          console.log('  lcp context write --account <account> --team <team> --moniker <moniker>');
        } else {
          console.log('Current context configuration:');
          console.log('');

          // Display each field with padding
          const maxKeyLength = Math.max(...Object.keys(config).map((k) => k.length));

          for (const [key, value] of Object.entries(config)) {
            if (value !== undefined && value !== null) {
              const paddedKey = key.padEnd(maxKeyLength);
              console.log(`  ${paddedKey}: ${value}`);
            }
          }
        }
      }
    });
}
