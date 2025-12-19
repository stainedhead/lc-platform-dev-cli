#!/usr/bin/env bun
/**
 * LC Platform Dev CLI
 *
 * Main entry point for the `lcp` command-line interface.
 * Wraps @stainedhead/lc-platform-dev-accelerators for local developer tooling.
 */

import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { getVersion } from '../utils/version.js';
import { setupGlobalOptions } from './options.js';
import { handleError } from '../utils/errors.js';

const program = new Command();

program
  .name('lcp')
  .description('LC Platform Dev CLI - Cloud-agnostic application management')
  .version(getVersion(), '-V, --version', 'Output the version number');

// Setup global options (--provider, --region, --json, --verbose, etc.)
setupGlobalOptions(program);

// Register all service commands
registerCommands(program);

// Global error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  handleError(error);
}
