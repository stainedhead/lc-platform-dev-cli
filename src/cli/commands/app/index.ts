/**
 * App command group
 * Manages application lifecycle (init, read, validate, update, use, list, current)
 */

import { Command } from 'commander';
import { createInitCommand } from './init.js';
import { createReadCommand } from './read.js';
import { createValidateCommand } from './validate.js';
import { createUpdateCommand } from './update.js';
import { createUseCommand } from './use.js';
import { createListCommand } from './list.js';
import { createCurrentCommand } from './current.js';

export function createAppCommand(): Command {
  const app = new Command('app').description(
    'Manage applications (init, read, validate, update, use, list, current)'
  );

  // Register subcommands (T043)
  app.addCommand(createInitCommand());
  app.addCommand(createReadCommand());
  app.addCommand(createValidateCommand());
  app.addCommand(createUpdateCommand());
  app.addCommand(createUseCommand());
  app.addCommand(createListCommand());
  app.addCommand(createCurrentCommand());

  return app;
}
