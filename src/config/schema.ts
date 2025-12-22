/**
 * Zod schemas for CLI context configuration validation
 */

import { z } from 'zod';
import type { CliContext } from './types.js';

/**
 * Provider name validation schema
 */
export const ProviderSchema = z.enum(['aws', 'azure', 'mock'], {
  message: 'Provider must be one of: aws, azure, mock',
});

/**
 * Moniker validation schema
 * Must be lowercase alphanumeric with hyphens only
 */
export const MonikerSchema = z
  .string()
  .min(1, 'Moniker must not be empty')
  .regex(/^[a-z0-9-]+$/, 'Moniker must contain only lowercase letters, numbers, and hyphens');

/**
 * CLI Context schema with Zod validation
 * All fields are optional to support partial configuration updates
 */
export const CliContextSchema = z.object({
  account: z.string().min(1, 'Account must not be empty').optional(),
  team: z.string().min(1, 'Team must not be empty').optional(),
  moniker: MonikerSchema.optional(),
  provider: ProviderSchema.optional(),
  region: z.string().min(1, 'Region must not be empty').optional(),
});

/**
 * Type-safe validator for CliContext
 * Returns validated context or throws ZodError with detailed validation errors
 */
export function validateCliContext(data: unknown): CliContext {
  return CliContextSchema.parse(data) as CliContext;
}

/**
 * Safe validator that returns success/error result instead of throwing
 */
export function safeValidateCliContext(
  data: unknown
):
  | { success: true; data: CliContext; error?: never }
  | { success: false; data?: never; error: z.ZodError } {
  const result = CliContextSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as CliContext };
  }
  return { success: false, error: result.error };
}

/**
 * Validate partial context update
 * Used by context write command for merge behavior validation
 */
export function validatePartialContext(data: unknown): Partial<CliContext> {
  return CliContextSchema.partial().parse(data) as Partial<CliContext>;
}
