/**
 * lcp app list command
 * List known applications with active app highlighted
 */

import { Command } from 'commander';
import { loadConfig } from '../../../config/loader.js';

export function createListCommand(): Command {
  return new Command('list')
    .description('List known applications with active app highlighted')
    .addHelpText(
      'after',
      `
Examples:
  # List applications
  $ lcp app list

  # List with JSON output
  $ lcp app list --json

Description:
  Lists known applications. The currently active application is highlighted
  with an asterisk (*).

  Note: In this version, only the active app is shown. Future versions will
  query the storage layer to show all initialized apps for the account/team.
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

        // For MVP, just show the active app if set
        // TODO: Future enhancement - query storage layer for all apps
        const apps = config.activeApp ? [config.activeApp] : [];

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                apps,
                activeApp: config.activeApp,
              },
              null,
              2
            )
          );
        } else {
          if (apps.length === 0) {
            console.log('No applications found.');
            console.log('');
            console.log('To initialize a new application:');
            console.log('  lcp app init');
            console.log('');
            console.log('To set an existing application as active:');
            console.log('  lcp app use <moniker>');
          } else {
            console.log('Applications:');
            console.log('');

            apps.forEach((app) => {
              const isActive = config.activeApp &&
                config.activeApp.account === app.account &&
                config.activeApp.team === app.team &&
                config.activeApp.moniker === app.moniker;

              const marker = isActive ? ' *' : '  ';
              console.log(`${marker} ${app.account}/${app.team}/${app.moniker}`);
            });

            console.log('');
            console.log('* = active application');
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
