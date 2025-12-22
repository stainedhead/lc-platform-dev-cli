/**
 * App command group
 * Manages application lifecycle (init, read, validate, update)
 */

import { Command } from 'commander';
import { createInitCommand } from './init.js';
import { createReadCommand } from './read.js';
import { createValidateCommand } from './validate.js';
import { createUpdateCommand } from './update.js';

export function createAppCommand(): Command {
  const app = new Command('app').description('Manage applications (init, read, validate, update)');

  // Register subcommands (T043)
  app.addCommand(createInitCommand());
  app.addCommand(createReadCommand());
  app.addCommand(createValidateCommand());
  app.addCommand(createUpdateCommand());

  return app;
}
