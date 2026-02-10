/**
 * lcp app use command
 * Set the active application context
 */

import { Command } from 'commander';
import { loadConfig, saveConfig } from '../../../config/loader.js';
import type { ActiveApp } from '../../../config/types.js';

/**
 * Parse moniker argument which can be:
 * - "moniker" (uses current team from context)
 * - "team/moniker" (explicit team/moniker)
 */
function parseMoniker(
  input: string,
  currentContext: { team?: string }
): { team: string; moniker: string } | { error: string } {
  const parts = input.split('/');

  if (parts.length === 1) {
    // Just moniker, need team from context
    const moniker = parts[0]!;

    if (!currentContext.team) {
      return {
        error:
          `No team found in context. Provide team explicitly: lcp app use <team>/<moniker>\n` +
          `Or set team first: lcp context write --team <team>`,
      };
    }

    return { team: currentContext.team, moniker };
  } else if (parts.length === 2) {
    // team/moniker format
    const team = parts[0]!;
    const moniker = parts[1]!;

    if (!team || !moniker) {
      return {
        error: 'Invalid format. Use: lcp app use <moniker> or lcp app use <team>/<moniker>',
      };
    }

    return { team, moniker };
  } else {
    return {
      error: 'Invalid format. Use: lcp app use <moniker> or lcp app use <team>/<moniker>',
    };
  }
}

export function createUseCommand(): Command {
  return new Command('use')
    .description('Set the active application context')
    .argument('<moniker>', 'Application moniker or team/moniker')
    .option('--account <account>', 'Account identifier (required if not in context)')
    .addHelpText(
      'after',
      `
Examples:
  # Set active app using moniker (requires team in context)
  $ lcp context write --team backend
  $ lcp app use order-svc

  # Set active app with explicit team/moniker
  $ lcp app use backend/order-svc

  # Set active app with explicit account
  $ lcp app use backend/order-svc --account prod-aws

Description:
  Sets the active application context, which auto-fills account/team/moniker
  for subsequent commands. The active app is stored in .lcp/config.json
  (project-local) and persists across commands.

  After setting an active app, you can omit --account, --team, and --moniker
  flags from subsequent commands.
`
    )
    .action(async function (this: Command, monikerInput: string) {
      const cmdOptions = this.optsWithGlobals<{
        account?: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load current config
        const config = loadConfig();

        if (cmdOptions.debug) {
          console.error('Current context:', config);
          console.error('Moniker input:', monikerInput);
        }

        // Parse moniker input
        const parsed = parseMoniker(monikerInput, config);

        if ('error' in parsed) {
          throw new Error(parsed.error);
        }

        const { team, moniker } = parsed;

        // Get account (from flag, active app, or context)
        const account = cmdOptions.account || config.activeApp?.account || config.account;

        if (!account) {
          throw new Error(
            `No account found. Provide account via flag or context:\n` +
              `  Option 1: lcp app use ${monikerInput} --account <account>\n` +
              `  Option 2: lcp context write --account <account>`
          );
        }

        // Create active app entry
        const activeApp: ActiveApp = {
          account,
          team,
          moniker,
        };

        // Update config with active app
        config.activeApp = activeApp;

        // Also update context fields for backwards compatibility
        config.account = account;
        config.team = team;
        config.moniker = moniker;

        // Save config
        saveConfig(config);

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                activeApp,
                message: 'Active application context updated',
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log('✓ Active application context set:');
          console.log(`  Account: ${account}`);
          console.log(`  Team: ${team}`);
          console.log(`  Moniker: ${moniker}`);
          console.log('');
          console.log('Subsequent commands will use this context automatically.');
          console.log(`Use -a/--app <moniker> to temporarily override for a single command.`);
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
