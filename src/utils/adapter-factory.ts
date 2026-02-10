/**
 * Adapter Factory for CLI
 *
 * Creates processing-lib adapters from CLI context
 */

import type { CliContext } from '../config/types.js';
import { AcceleratorStorageAdapterFactory } from '../../../lc-platform-processing-lib/src/adapters/storage/AcceleratorStorageAdapterFactory.js';
import { AcceleratorPolicyAdapter } from '../../../lc-platform-processing-lib/src/adapters/policy/AcceleratorPolicyAdapter.js';
import { AcceleratorDeploymentAdapter } from '../../../lc-platform-processing-lib/src/adapters/deployment/AcceleratorDeploymentAdapter.js';
import type {
  IStorageProvider,
  IPolicyProvider,
  IDeploymentProvider,
} from '../../../lc-platform-processing-lib/src/use-cases/ports.js';
import { generateResourceName } from '../../../lc-platform-dev-accelerators/src/utils/nameGenerator.js';

/**
 * Processing-lib adapters bundle
 */
export interface ProcessingLibAdapters {
  storage: IStorageProvider;
  policy: IPolicyProvider;
  deployment: IDeploymentProvider;
}

/**
 * Result type for adapter creation
 */
export interface AdapterFactoryResult {
  success: boolean;
  adapters?: ProcessingLibAdapters;
  error?: string;
  missingFields?: string[];
}

/**
 * Required fields for adapter creation
 */
const REQUIRED_CONTEXT_FIELDS = ['account', 'team', 'moniker', 'provider', 'region'] as const;

/**
 * Validate that CLI context has all required fields for adapter creation
 *
 * @param context - CLI context to validate
 * @returns Validation result with missing fields if invalid
 */
function validateContext(context: CliContext): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  for (const field of REQUIRED_CONTEXT_FIELDS) {
    if (!context[field]) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Generate config bucket name from context
 *
 * Pattern: lcp-{account}-{team}-{moniker}-config
 *
 * @param context - CLI context with account, team, and moniker
 * @returns Config bucket name
 */
function generateConfigBucketName(context: CliContext): string {
  // These are guaranteed to exist due to validation
  const account = context.account!;
  const team = context.team!;
  const moniker = context.moniker!;

  return generateResourceName(account, team, moniker, 'config');
}

/**
 * Create processing-lib adapters from CLI context
 *
 * This factory creates all three adapters needed by processing-lib:
 * - Storage adapter (for reading/writing app configs)
 * - Policy adapter (for generating IAM policies)
 * - Deployment adapter (for deploying applications and dependencies)
 *
 * @param context - CLI context with provider, region, account, team, moniker
 * @returns Result containing adapters or error information
 *
 * @example
 * ```typescript
 * const context = {
 *   account: '123456',
 *   team: 'backend',
 *   moniker: 'order-svc',
 *   provider: 'aws',
 *   region: 'us-east-1'
 * };
 *
 * const result = createAdapters(context);
 * if (result.success) {
 *   const { storage, policy, deployment } = result.adapters;
 *   // Use adapters...
 * }
 * ```
 */
export function createAdapters(context: CliContext): AdapterFactoryResult {
  // Validate context has all required fields
  const validation = validateContext(context);
  if (!validation.valid) {
    return {
      success: false,
      error: `Missing required context fields: ${validation.missingFields.join(', ')}`,
      missingFields: validation.missingFields,
    };
  }

  try {
    // Generate config bucket name
    const configBucket = generateConfigBucketName(context);

    // Create storage adapter using the factory from processing-lib
    const storage = AcceleratorStorageAdapterFactory.create({
      provider: context.provider!,
      region: context.region!,
      configBucket,
    });

    // Create policy adapter
    const policy = new AcceleratorPolicyAdapter();

    // Create deployment adapter
    const deployment = new AcceleratorDeploymentAdapter();

    return {
      success: true,
      adapters: {
        storage,
        policy,
        deployment,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating adapters',
    };
  }
}

/**
 * Get config bucket name for a given context
 *
 * Useful for displaying the config bucket name to users
 * or for validating configuration before creating adapters.
 *
 * @param context - CLI context with account, team, and moniker
 * @returns Config bucket name or error if context is invalid
 */
export function getConfigBucketName(context: CliContext): {
  success: boolean;
  bucketName?: string;
  error?: string;
  missingFields?: string[];
} {
  // Only validate the fields needed for bucket name generation
  const requiredFields = ['account', 'team', 'moniker'] as const;
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!context[field]) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields,
    };
  }

  try {
    const bucketName = generateConfigBucketName(context);
    return {
      success: true,
      bucketName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating bucket name',
    };
  }
}
