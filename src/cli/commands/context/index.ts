/**
 * Context command group
 * Manages CLI context configuration (account, team, moniker, provider, region)
 */

import { Command } from 'commander';
import { createReadCommand } from './read.js';
import { createWriteCommand } from './write.js';
import { createClearCommand } from './clear.js';

export function createContextCommand(): Command {
  const context = new Command('context').description(
    'Manage CLI context configuration (account, team, moniker, provider, region)'
  );

  // Register subcommands
  context.addCommand(createReadCommand());
  context.addCommand(createWriteCommand());
  context.addCommand(createClearCommand());

  return context;
}
