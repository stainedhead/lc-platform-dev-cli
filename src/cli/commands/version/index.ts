/**
 * Version command group
 * Manages application versions (add, read, deploy)
 */

import { Command } from 'commander';
import { createAddCommand } from './add.js';
import { createReadCommand } from './read.js';
import { createDeployCommand } from './deploy.js';

export function createVersionCommand(): Command {
  const version = new Command('version').description(
    'Manage application versions (add, read, deploy)'
  );

  // Register subcommands
  version.addCommand(createAddCommand());
  version.addCommand(createReadCommand());
  version.addCommand(createDeployCommand());

  return version;
}
