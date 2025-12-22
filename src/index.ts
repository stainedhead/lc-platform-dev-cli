/**
 * LC Platform Dev CLI
 *
 * Public API exports for programmatic usage.
 * For CLI usage, run the `lcp` command.
 */

// Configuration types and utilities
export {
  type CLIConfig,
  type ProfileConfig,
  type ResolvedConfig,
  type ProviderName,
  type CliContext,
} from './config/types.js';
export {
  loadConfig,
  loadConfigWithOptions,
  getGlobalConfigPath,
  globalConfigExists,
  projectLocalConfigExists,
} from './config/loader.js';
export {
  writeGlobalConfig,
  writeProjectLocalConfig,
  clearGlobalConfig,
  clearProjectLocalConfig,
} from './config/writer.js';

// Error handling
export { CLIError, ExitCode, handleError } from './utils/errors.js';

// Formatters
export {
  formatOutput,
  formatSuccess,
  formatError,
  outputJson,
  outputHuman,
} from './formatters/index.js';

// Logger
export { Logger, LogLevel, createLogger } from './utils/logger.js';

// Version
export { getVersion } from './utils/version.js';
