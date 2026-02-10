/**
 * Error enrichment utilities
 * Maps processing-lib errors to user-friendly CLI messages with actionable suggestions
 */

/**
 * Error codes from processing-lib ConfigurationError
 */
export type ErrorCode =
  | 'ALREADY_EXISTS'
  | 'NOT_FOUND'
  | 'INVALID_CONFIG'
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'POLICY_VIOLATION'
  | 'DEPLOYMENT_ERROR';

/**
 * Enriched error with user-friendly message and suggestions
 */
export interface EnrichedError {
  /** User-friendly error message */
  message: string;
  /** Actionable suggestions for fixing the error */
  suggestions: string[];
  /** Original error code */
  code?: ErrorCode;
  /** Whether this is a fatal error (should exit) */
  fatal: boolean;
}

/**
 * Error enrichment rules for common error codes
 */
const ERROR_ENRICHMENT_RULES: Record<
  ErrorCode,
  (context: { resource?: string; details?: string }) => EnrichedError
> = {
  ALREADY_EXISTS: (ctx) => ({
    message: `${ctx.resource || 'Resource'} already exists${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      `To update the existing ${ctx.resource?.toLowerCase() || 'resource'}, use the 'update' command`,
      `To use a different name, change the moniker or version identifier`,
      `To view the existing ${ctx.resource?.toLowerCase() || 'resource'}, use the 'read' command`,
    ],
    code: 'ALREADY_EXISTS',
    fatal: true,
  }),

  NOT_FOUND: (ctx) => ({
    message: `${ctx.resource || 'Resource'} not found${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      `Check that you're using the correct account, team, and moniker`,
      `To list available ${ctx.resource?.toLowerCase() || 'resource'}s, use the 'list' command`,
      `To create a new ${ctx.resource?.toLowerCase() || 'resource'}, use the 'init' or 'add' command`,
      `Verify your context with: lcp context read`,
    ],
    code: 'NOT_FOUND',
    fatal: true,
  }),

  INVALID_CONFIG: (ctx) => ({
    message: `Invalid configuration${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      'Check the configuration file format (must be valid JSON)',
      'Ensure all required fields are present',
      'Validate the configuration with: lcp app validate --config <file>',
      'Review the documentation for configuration schema',
    ],
    code: 'INVALID_CONFIG',
    fatal: true,
  }),

  VALIDATION_ERROR: (ctx) => ({
    message: `Validation failed${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      'Check field types and formats (e.g., kebab-case for monikers)',
      'Ensure required fields are provided',
      'Validate field constraints (length, character set, etc.)',
      'Use --debug flag to see detailed validation errors',
    ],
    code: 'VALIDATION_ERROR',
    fatal: true,
  }),

  STORAGE_ERROR: (ctx) => ({
    message: `Storage operation failed${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      'Check cloud provider credentials and permissions',
      'Verify network connectivity',
      'Ensure the config bucket exists and is accessible',
      'Try using --provider mock for local development',
      'Use --debug flag for detailed error information',
    ],
    code: 'STORAGE_ERROR',
    fatal: true,
  }),

  POLICY_VIOLATION: (ctx) => ({
    message: `Policy violation${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      'Check organization policies and compliance requirements',
      'Verify required approvals are in place',
      'Contact your platform administrator',
      'Review policy documentation',
    ],
    code: 'POLICY_VIOLATION',
    fatal: true,
  }),

  DEPLOYMENT_ERROR: (ctx) => ({
    message: `Deployment failed${ctx.details ? `: ${ctx.details}` : ''}`,
    suggestions: [
      'Check deployment logs for detailed error information',
      'Verify all dependencies are properly configured',
      'Ensure cloud provider resources are available',
      'Try --dry-run to preview deployment without executing',
      'Use --debug flag for detailed deployment trace',
    ],
    code: 'DEPLOYMENT_ERROR',
    fatal: true,
  }),
};

/**
 * Enrich an error from processing-lib with user-friendly message and suggestions
 */
export function enrichError(
  error: { code?: string; message: string },
  context: { resource?: string; command?: string; details?: string } = {}
): EnrichedError {
  const errorCode = error.code as ErrorCode | undefined;

  // If we have an enrichment rule for this error code, use it
  if (errorCode && ERROR_ENRICHMENT_RULES[errorCode]) {
    const enricher = ERROR_ENRICHMENT_RULES[errorCode]!;
    const enriched = enricher({
      resource: context.resource,
      details: context.details || error.message,
    });

    return enriched;
  }

  // Default enrichment for unknown errors
  return {
    message: error.message || 'An unexpected error occurred',
    suggestions: [
      'Use --debug flag to see detailed error information',
      'Check your configuration and context with: lcp context read',
      'Verify network connectivity and cloud provider credentials',
      'Consult the documentation or contact support',
    ],
    code: errorCode,
    fatal: true,
  };
}

/**
 * Format an enriched error for console output
 */
export function formatEnrichedError(enriched: EnrichedError, includeCode: boolean = false): string {
  const lines: string[] = [];

  // Error message
  lines.push(`Error: ${enriched.message}`);

  // Error code (if requested)
  if (includeCode && enriched.code) {
    lines.push(`Code: ${enriched.code}`);
  }

  // Suggestions
  if (enriched.suggestions.length > 0) {
    lines.push('');
    lines.push('Suggestions:');
    enriched.suggestions.forEach((suggestion, index) => {
      lines.push(`  ${index + 1}. ${suggestion}`);
    });
  }

  return lines.join('\n');
}

/**
 * Display an enriched error to the user and exit if fatal
 */
export function handleEnrichedError(
  enriched: EnrichedError,
  options: { debug?: boolean; json?: boolean } = {}
): void {
  if (options.json) {
    // JSON output
    console.log(
      JSON.stringify(
        {
          error: {
            message: enriched.message,
            code: enriched.code,
            suggestions: enriched.suggestions,
            fatal: enriched.fatal,
          },
        },
        null,
        2
      )
    );
  } else {
    // Human-readable output
    console.error(formatEnrichedError(enriched, options.debug));
  }

  // Exit if fatal
  if (enriched.fatal) {
    process.exit(1);
  }
}

/**
 * Convenience function to enrich and display an error in one call
 */
export function enrichAndHandleError(
  error: { code?: string; message: string },
  context: { resource?: string; command?: string; details?: string } = {},
  options: { debug?: boolean; json?: boolean } = {}
): void {
  const enriched = enrichError(error, context);
  handleEnrichedError(enriched, options);
}
