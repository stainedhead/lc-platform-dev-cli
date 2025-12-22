/**
 * Validation utilities for CLI context and required values
 */

import type { CliContext } from '../config/types.js';

/**
 * Required context fields for different operations
 */
export const REQUIRED_FIELDS = {
  APP_OPERATIONS: ['account', 'team', 'moniker'] as const,
  VERSION_OPERATIONS: ['account', 'team', 'moniker'] as const,
  DEPLOY_OPERATIONS: ['account', 'team', 'moniker'] as const,
} as const;

/**
 * Error thrown when required context values are missing
 */
export class MissingContextError extends Error {
  constructor(
    public readonly missing: string[],
    public readonly operation: string
  ) {
    super(
      `Missing required context values: ${missing.join(', ')}.\n\n` +
        `To fix this, either:\n` +
        `1. Set context values: lcp context write ${missing.map((f) => `--${f} <value>`).join(' ')}\n` +
        `2. Or provide them as command flags: ${missing.map((f) => `--${f} <value>`).join(' ')}`
    );
    this.name = 'MissingContextError';
  }
}

/**
 * Validate that required context fields are present
 * @param context - The CLI context to validate
 * @param requiredFields - Array of field names that are required
 * @param operation - Name of the operation for error messages
 * @throws MissingContextError if any required fields are missing
 */
export function validateRequiredContext(
  context: CliContext,
  requiredFields: readonly string[],
  operation: string
): void {
  const missing: string[] = [];

  for (const field of requiredFields) {
    const value = context[field as keyof CliContext];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new MissingContextError(missing, operation);
  }
}

/**
 * Validate context for app operations
 * Requires: account, team, moniker
 */
export function validateAppContext(context: CliContext): void {
  validateRequiredContext(context, REQUIRED_FIELDS.APP_OPERATIONS, 'app operations');
}

/**
 * Validate context for version operations
 * Requires: account, team, moniker
 */
export function validateVersionContext(context: CliContext): void {
  validateRequiredContext(context, REQUIRED_FIELDS.VERSION_OPERATIONS, 'version operations');
}

/**
 * Validate context for deploy operations
 * Requires: account, team, moniker
 */
export function validateDeployContext(context: CliContext): void {
  validateRequiredContext(context, REQUIRED_FIELDS.DEPLOY_OPERATIONS, 'deploy operations');
}

/**
 * Check if context has all required fields for an operation
 * Returns true if all required fields are present, false otherwise
 * Does not throw errors
 */
export function hasRequiredContext(
  context: CliContext,
  requiredFields: readonly string[]
): boolean {
  for (const field of requiredFields) {
    const value = context[field as keyof CliContext];
    if (value === undefined || value === null || value === '') {
      return false;
    }
  }
  return true;
}

/**
 * Get list of missing required fields
 * Returns empty array if all fields are present
 */
export function getMissingFields(context: CliContext, requiredFields: readonly string[]): string[] {
  const missing: string[] = [];

  for (const field of requiredFields) {
    const value = context[field as keyof CliContext];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
    }
  }

  return missing;
}
