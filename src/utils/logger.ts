/**
 * Logging utilities with verbosity support
 */

import type { GlobalOptions } from '../cli/options.js';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Logger instance with verbosity control
 */
export class Logger {
  private level: LogLevel;

  constructor(options?: GlobalOptions) {
    if (options?.quiet) {
      this.level = LogLevel.ERROR;
    } else if (options?.debug) {
      this.level = LogLevel.DEBUG;
    } else if (options?.verbose) {
      this.level = LogLevel.INFO;
    } else {
      this.level = LogLevel.WARN;
    }
  }

  /**
   * Log debug message (only with --debug)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info message (with --verbose or --debug)
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.error(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning message (default visibility)
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.error(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log error message (always visible unless --quiet)
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Log a progress message (for long-running operations)
   */
  progress(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.error(`→ ${message}`);
    }
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    if (this.level <= LogLevel.WARN) {
      console.error(`✓ ${message}`);
    }
  }
}

/**
 * Create a logger from global options
 */
export function createLogger(options?: GlobalOptions): Logger {
  return new Logger(options);
}
