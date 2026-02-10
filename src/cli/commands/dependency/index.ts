/**
 * Dependency command group
 * Manages application dependencies via lcp-manifest.yaml
 */

import { Command } from 'commander';
import { createAddCommand } from './add.js';
import { createListCommand } from './list.js';
import { createShowCommand } from './show.js';
import { createRemoveCommand } from './remove.js';
import { createValidateCommand } from './validate.js';

export function createDependencyCommand(): Command {
  const dependency = new Command('dependency').description(
    'Manage application dependencies (add, list, show, remove, validate)'
  );

  // Register subcommands
  dependency.addCommand(createAddCommand());
  dependency.addCommand(createListCommand());
  dependency.addCommand(createShowCommand());
  dependency.addCommand(createRemoveCommand());
  dependency.addCommand(createValidateCommand());

  return dependency;
}
