/**
 * Context command group
 * Manages CLI context configuration (account, team, moniker, provider, region)
 */

import { Command } from 'commander';
import { createReadCommand } from './read.js';
import { createWriteCommand } from './write.js';
import { createClearCommand } from './clear.js';
import { createExportCommand } from './export.js';

export function createContextCommand(): Command {
  const context = new Command('context').description(
    'Manage CLI context configuration and export manifest topology'
  );

  // Register subcommands
  context.addCommand(createReadCommand());
  context.addCommand(createWriteCommand());
  context.addCommand(createClearCommand());
  context.addCommand(createExportCommand());

  return context;
}
