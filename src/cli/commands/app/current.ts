/**
 * lcp app current command
 * Show the current active application context
 */

import { Command } from 'commander';
import { loadConfig } from '../../../config/loader.js';

export function createCurrentCommand(): Command {
  return new Command('current')
    .description('Show the current active application context')
    .addHelpText(
      'after',
      `
Examples:
  # Show current active app
  $ lcp app current

  # Show with JSON output
  $ lcp app current --json

Description:
  Displays the currently active application context. If no active app is set,
  shows an error message with instructions to set one.

  The active app is used to auto-fill account/team/moniker for subsequent
  commands when those flags are not provided.
`
    )
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load current config
        const config = loadConfig();

        if (cmdOptions.debug) {
          console.error('Current context:', config);
        }

        // Check if active app is set
        if (!config.activeApp) {
          throw new Error(
            `No active application context set.\n\n` +
              `To set an active app:\n` +
              `  lcp app use <moniker>\n` +
              `  lcp app use <team>/<moniker>\n\n` +
              `Or initialize a new app:\n` +
              `  lcp app init`
          );
        }

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                activeApp: config.activeApp,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log('Active application context:');
          console.log(`  Account: ${config.activeApp.account}`);
          console.log(`  Team: ${config.activeApp.team}`);
          console.log(`  Moniker: ${config.activeApp.moniker}`);
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
