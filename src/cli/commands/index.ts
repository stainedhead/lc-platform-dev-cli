/**
 * Command registration for all CLI services
 */

import type { Command } from 'commander';
import { createContextCommand } from './context/index.js';
import { createAppCommand } from './app/index.js';
import { createVersionCommand } from './version/index.js';

// Import command registrations as they are implemented
// import { registerStorageCommands } from './storage/index.js';
// import { registerSecretsCommands } from './secrets/index.js';
// import { registerConfigCommands } from './config/index.js';
// import { registerQueueCommands } from './queue/index.js';
// import { registerEventsCommands } from './events/index.js';
// import { registerDbCommands } from './db/index.js';
// import { registerAuthCommands } from './auth/index.js';

/**
 * Register all CLI commands with the program
 */
export function registerCommands(program: Command): void {
  // Context management commands
  program.addCommand(createContextCommand());

  // App management commands
  program.addCommand(createAppCommand());

  // Version management commands
  program.addCommand(createVersionCommand());

  // TODO: Uncomment as commands are implemented
  // registerStorageCommands(program);
  // registerSecretsCommands(program);
  // registerConfigCommands(program);
  // registerQueueCommands(program);
  // registerEventsCommands(program);
  // registerDbCommands(program);
  // registerAuthCommands(program);
}
