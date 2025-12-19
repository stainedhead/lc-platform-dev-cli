/**
 * Error handling utilities
 *
 * Provides consistent error handling and exit code management for the CLI.
 */

/**
 * Exit codes following the constitution's conventions
 */
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGUMENTS = 2,
  CONFIGURATION_ERROR = 3,
  AUTH_ERROR = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  NETWORK_ERROR = 7,
  TIMEOUT = 8,
}

/**
 * CLI-specific error class with exit code
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode = ExitCode.GENERAL_ERROR,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Handle errors and exit with appropriate code
 */
export function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    if (error.suggestion) {
      console.error(`Suggestion: ${error.suggestion}`);
    }
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    // Check for common error types and map to exit codes
    const exitCode = mapErrorToExitCode(error);
    console.error(`Error: ${error.message}`);

    if (process.env['LCP_DEBUG'] === 'true') {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(exitCode);
  }

  // Unknown error type
  console.error('An unexpected error occurred');
  if (process.env['LCP_DEBUG'] === 'true') {
    console.error(error);
  }
  process.exit(ExitCode.GENERAL_ERROR);
}

/**
 * Map common error types to exit codes
 */
function mapErrorToExitCode(error: Error): ExitCode {
  const message = error.message.toLowerCase();

  if (message.includes('not found') || message.includes('does not exist')) {
    return ExitCode.NOT_FOUND;
  }

  if (message.includes('already exists') || message.includes('duplicate')) {
    return ExitCode.ALREADY_EXISTS;
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('access denied')
  ) {
    return ExitCode.AUTH_ERROR;
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return ExitCode.TIMEOUT;
  }

  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('econnrefused')
  ) {
    return ExitCode.NETWORK_ERROR;
  }

  if (
    message.includes('invalid') ||
    message.includes('missing required') ||
    message.includes('argument')
  ) {
    return ExitCode.INVALID_ARGUMENTS;
  }

  if (message.includes('config') || message.includes('configuration')) {
    return ExitCode.CONFIGURATION_ERROR;
  }

  return ExitCode.GENERAL_ERROR;
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string, identifier: string): CLIError {
  return new CLIError(
    `${resource} '${identifier}' not found`,
    ExitCode.NOT_FOUND,
    `Use 'lcp ${resource.toLowerCase()} list' to see available ${resource.toLowerCase()}s`
  );
}

/**
 * Create an already exists error
 */
export function alreadyExistsError(resource: string, identifier: string): CLIError {
  return new CLIError(
    `${resource} '${identifier}' already exists`,
    ExitCode.ALREADY_EXISTS,
    `Use a different name or delete the existing ${resource.toLowerCase()} first`
  );
}

/**
 * Create a configuration error
 */
export function configError(message: string): CLIError {
  return new CLIError(
    message,
    ExitCode.CONFIGURATION_ERROR,
    "Check your configuration with 'lcp config show' or set via environment variables"
  );
}

/**
 * Create an authentication error
 */
export function authError(message: string): CLIError {
  return new CLIError(
    message,
    ExitCode.AUTH_ERROR,
    'Verify your credentials and permissions for the configured provider'
  );
}
