/**
 * Unit tests for CLI context configuration schema validation
 */

import { describe, test, expect } from 'bun:test';
import {
  validateCliContext,
  safeValidateCliContext,
  validatePartialContext,
  ProviderSchema,
  MonikerSchema,
} from '../../../src/config/schema';
import type { CliContext } from '../../../src/config/types';

describe('ProviderSchema', () => {
  test('accepts valid provider names', () => {
    expect(ProviderSchema.parse('aws')).toBe('aws');
    expect(ProviderSchema.parse('azure')).toBe('azure');
    expect(ProviderSchema.parse('mock')).toBe('mock');
  });

  test('rejects invalid provider names', () => {
    expect(() => ProviderSchema.parse('invalid')).toThrow();
    expect(() => ProviderSchema.parse('gcp')).toThrow();
    expect(() => ProviderSchema.parse('')).toThrow();
  });
});

describe('MonikerSchema', () => {
  test('accepts valid moniker formats', () => {
    expect(MonikerSchema.parse('my-app')).toBe('my-app');
    expect(MonikerSchema.parse('api-service')).toBe('api-service');
    expect(MonikerSchema.parse('app123')).toBe('app123');
    expect(MonikerSchema.parse('my-app-v2')).toBe('my-app-v2');
  });

  test('rejects invalid moniker formats', () => {
    expect(() => MonikerSchema.parse('')).toThrow('Moniker must not be empty');
    expect(() => MonikerSchema.parse('MyApp')).toThrow(
      'Moniker must contain only lowercase letters, numbers, and hyphens'
    );
    expect(() => MonikerSchema.parse('my_app')).toThrow(
      'Moniker must contain only lowercase letters, numbers, and hyphens'
    );
    expect(() => MonikerSchema.parse('my.app')).toThrow(
      'Moniker must contain only lowercase letters, numbers, and hyphens'
    );
    expect(() => MonikerSchema.parse('my app')).toThrow(
      'Moniker must contain only lowercase letters, numbers, and hyphens'
    );
  });
});

describe('validateCliContext', () => {
  test('accepts valid complete context', () => {
    const validContext = {
      account: '123456789012',
      team: 'engineering',
      moniker: 'my-app',
      provider: 'aws' as const,
      region: 'us-east-1',
    };

    const result = validateCliContext(validContext);
    expect(result).toEqual(validContext);
  });

  test('accepts partial context with only some fields', () => {
    const partialContext = {
      account: 'myaccount',
      team: 'platform',
    };

    const result = validateCliContext(partialContext);
    expect(result).toEqual(partialContext);
  });

  test('accepts empty context object', () => {
    const result = validateCliContext({});
    expect(result).toEqual({});
  });

  test('rejects invalid provider', () => {
    const invalidContext = {
      account: 'myaccount',
      provider: 'invalid',
    };

    expect(() => validateCliContext(invalidContext)).toThrow();
  });

  test('rejects invalid moniker format', () => {
    const invalidContext = {
      moniker: 'Invalid_Moniker',
    };

    expect(() => validateCliContext(invalidContext)).toThrow();
  });

  test('rejects empty string values', () => {
    expect(() => validateCliContext({ account: '' })).toThrow('Account must not be empty');
    expect(() => validateCliContext({ team: '' })).toThrow('Team must not be empty');
    expect(() => validateCliContext({ region: '' })).toThrow('Region must not be empty');
  });

  test('rejects non-object input', () => {
    expect(() => validateCliContext(null)).toThrow();
    expect(() => validateCliContext('string')).toThrow();
    expect(() => validateCliContext(123)).toThrow();
    expect(() => validateCliContext([])).toThrow();
  });

  test('strips unknown properties', () => {
    const contextWithExtra = {
      account: 'myaccount',
      team: 'myteam',
      unknownField: 'should be stripped',
    };

    const result = validateCliContext(contextWithExtra);
    expect(result).toEqual({
      account: 'myaccount',
      team: 'myteam',
    });
    expect('unknownField' in result).toBe(false);
  });
});

describe('safeValidateCliContext', () => {
  test('returns success for valid context', () => {
    const validContext = {
      account: 'myaccount',
      team: 'myteam',
      provider: 'aws' as const,
    };

    const result = safeValidateCliContext(validContext);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validContext);
    expect(result.error).toBeUndefined();
  });

  test('returns error for invalid context', () => {
    const invalidContext = {
      provider: 'invalid',
    };

    const result = safeValidateCliContext(invalidContext);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  test('provides detailed error information', () => {
    const invalidContext = {
      account: '',
      moniker: 'Invalid_Name',
      provider: 'gcp',
    };

    const result = safeValidateCliContext(invalidContext);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeDefined();

      // Should have errors for account, moniker, and provider
      const errorPaths = result.error.issues.map((e) => e.path[0]);
      expect(errorPaths).toContain('account');
      expect(errorPaths).toContain('moniker');
      expect(errorPaths).toContain('provider');
    }
  });
});

describe('validatePartialContext', () => {
  test('accepts partial context for updates', () => {
    const partial = { account: 'newaccount' };
    const result = validatePartialContext(partial);
    expect(result).toEqual(partial);
  });

  test('accepts empty partial context', () => {
    const result = validatePartialContext({});
    expect(result).toEqual({});
  });

  test('validates field types in partial context', () => {
    expect(() => validatePartialContext({ provider: 'invalid' })).toThrow();
    expect(() => validatePartialContext({ moniker: 'Invalid_Name' })).toThrow();
    expect(() => validatePartialContext({ account: '' })).toThrow();
  });

  test('strips unknown fields from partial context', () => {
    const partial = {
      account: 'myaccount',
      unknownField: 'value',
    };

    const result = validatePartialContext(partial);
    expect(result).toEqual({ account: 'myaccount' });
    expect('unknownField' in result).toBe(false);
  });
});
