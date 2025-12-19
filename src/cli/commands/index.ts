/**
 * Command registration for all CLI services
 */

import type { Command } from 'commander';

// Import command registrations as they are implemented
// import { registerStorageCommands } from './storage/index.js';
// import { registerSecretsCommands } from './secrets/index.js';
// import { registerConfigCommands } from './config/index.js';
// import { registerAppCommands } from './app/index.js';
// import { registerQueueCommands } from './queue/index.js';
// import { registerEventsCommands } from './events/index.js';
// import { registerDbCommands } from './db/index.js';
// import { registerAuthCommands } from './auth/index.js';

/**
 * Register all CLI commands with the program
 */
export function registerCommands(program: Command): void {
  // TODO: Uncomment as commands are implemented
  // registerStorageCommands(program);
  // registerSecretsCommands(program);
  // registerConfigCommands(program);
  // registerAppCommands(program);
  // registerQueueCommands(program);
  // registerEventsCommands(program);
  // registerDbCommands(program);
  // registerAuthCommands(program);

  // Placeholder command to verify CLI works
  program
    .command('version')
    .description('Display version information')
    .action(() => {
      console.log('lcp version 0.1.0');
      console.log('Core library: @stainedhead/lc-platform-dev-accelerators');
    });
}
