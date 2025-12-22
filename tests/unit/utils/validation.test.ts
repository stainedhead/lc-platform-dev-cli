/**
 * Unit tests for validation utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  validateRequiredContext,
  validateAppContext,
  validateVersionContext,
  validateDeployContext,
  hasRequiredContext,
  getMissingFields,
  MissingContextError,
  REQUIRED_FIELDS,
} from '../../../src/utils/validation.js';
import type { CliContext } from '../../../src/config/types.js';

describe('validation utilities', () => {
  describe('validateRequiredContext', () => {
    test('should pass when all required fields are present', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(() => {
        validateRequiredContext(context, ['account', 'team', 'moniker'], 'test operation');
      }).not.toThrow();
    });

    test('should throw MissingContextError when a field is undefined', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
      };

      expect(() => {
        validateRequiredContext(context, ['account', 'team', 'moniker'], 'test operation');
      }).toThrow(MissingContextError);
    });

    test('should throw MissingContextError when a field is null', () => {
      const context: CliContext = {
        account: 'test-account',
        team: null as any,
        moniker: 'test-app',
      };

      expect(() => {
        validateRequiredContext(context, ['account', 'team', 'moniker'], 'test operation');
      }).toThrow(MissingContextError);
    });

    test('should throw MissingContextError when a field is empty string', () => {
      const context: CliContext = {
        account: 'test-account',
        team: '',
        moniker: 'test-app',
      };

      expect(() => {
        validateRequiredContext(context, ['account', 'team', 'moniker'], 'test operation');
      }).toThrow(MissingContextError);
    });

    test('should list all missing fields in error message', () => {
      const context: CliContext = {
        account: 'test-account',
      };

      try {
        validateRequiredContext(context, ['account', 'team', 'moniker'], 'test operation');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(MissingContextError);
        const missingError = error as MissingContextError;
        expect(missingError.missing).toEqual(['team', 'moniker']);
        expect(missingError.operation).toBe('test operation');
        expect(missingError.message).toContain('team, moniker');
        expect(missingError.message).toContain('lcp context write --team <value> --moniker <value>');
      }
    });

    test('should include operation name in error', () => {
      const context: CliContext = {};

      try {
        validateRequiredContext(context, ['account'], 'app init');
        expect(true).toBe(false);
      } catch (error) {
        const missingError = error as MissingContextError;
        expect(missingError.operation).toBe('app init');
      }
    });
  });

  describe('validateAppContext', () => {
    test('should validate app operation requirements', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(() => validateAppContext(context)).not.toThrow();
    });

    test('should throw when app context is incomplete', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
      };

      expect(() => validateAppContext(context)).toThrow(MissingContextError);
    });
  });

  describe('validateVersionContext', () => {
    test('should validate version operation requirements', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(() => validateVersionContext(context)).not.toThrow();
    });

    test('should throw when version context is incomplete', () => {
      const context: CliContext = {
        account: 'test-account',
      };

      expect(() => validateVersionContext(context)).toThrow(MissingContextError);
    });
  });

  describe('validateDeployContext', () => {
    test('should validate deploy operation requirements', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(() => validateDeployContext(context)).not.toThrow();
    });

    test('should throw when deploy context is incomplete', () => {
      const context: CliContext = {
        moniker: 'test-app',
      };

      expect(() => validateDeployContext(context)).toThrow(MissingContextError);
    });
  });

  describe('hasRequiredContext', () => {
    test('should return true when all fields are present', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(hasRequiredContext(context, ['account', 'team', 'moniker'])).toBe(true);
    });

    test('should return false when a field is missing', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
      };

      expect(hasRequiredContext(context, ['account', 'team', 'moniker'])).toBe(false);
    });

    test('should return false when a field is null', () => {
      const context: CliContext = {
        account: 'test-account',
        team: null as any,
        moniker: 'test-app',
      };

      expect(hasRequiredContext(context, ['account', 'team', 'moniker'])).toBe(false);
    });

    test('should return false when a field is empty string', () => {
      const context: CliContext = {
        account: '',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(hasRequiredContext(context, ['account', 'team', 'moniker'])).toBe(false);
    });

    test('should return true for empty required fields array', () => {
      const context: CliContext = {};

      expect(hasRequiredContext(context, [])).toBe(true);
    });
  });

  describe('getMissingFields', () => {
    test('should return empty array when all fields are present', () => {
      const context: CliContext = {
        account: 'test-account',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(getMissingFields(context, ['account', 'team', 'moniker'])).toEqual([]);
    });

    test('should return array of missing field names', () => {
      const context: CliContext = {
        account: 'test-account',
      };

      expect(getMissingFields(context, ['account', 'team', 'moniker'])).toEqual(['team', 'moniker']);
    });

    test('should detect null values as missing', () => {
      const context: CliContext = {
        account: 'test-account',
        team: null as any,
        moniker: 'test-app',
      };

      expect(getMissingFields(context, ['account', 'team', 'moniker'])).toEqual(['team']);
    });

    test('should detect empty strings as missing', () => {
      const context: CliContext = {
        account: '',
        team: 'test-team',
        moniker: 'test-app',
      };

      expect(getMissingFields(context, ['account', 'team', 'moniker'])).toEqual(['account']);
    });

    test('should handle multiple missing fields', () => {
      const context: CliContext = {};

      expect(getMissingFields(context, ['account', 'team', 'moniker'])).toEqual([
        'account',
        'team',
        'moniker',
      ]);
    });
  });

  describe('MissingContextError', () => {
    test('should have correct name property', () => {
      const error = new MissingContextError(['account'], 'test op');
      expect(error.name).toBe('MissingContextError');
    });

    test('should store missing fields', () => {
      const error = new MissingContextError(['account', 'team'], 'test op');
      expect(error.missing).toEqual(['account', 'team']);
    });

    test('should store operation name', () => {
      const error = new MissingContextError(['account'], 'app init');
      expect(error.operation).toBe('app init');
    });

    test('should format error message with context write command', () => {
      const error = new MissingContextError(['account', 'team'], 'test op');
      expect(error.message).toContain('Missing required context values: account, team');
      expect(error.message).toContain('lcp context write --account <value> --team <value>');
    });

    test('should format error message with flag alternatives', () => {
      const error = new MissingContextError(['moniker'], 'test op');
      expect(error.message).toContain('--moniker <value>');
    });
  });

  describe('REQUIRED_FIELDS constants', () => {
    test('should define APP_OPERATIONS fields', () => {
      expect(REQUIRED_FIELDS.APP_OPERATIONS).toEqual(['account', 'team', 'moniker']);
    });

    test('should define VERSION_OPERATIONS fields', () => {
      expect(REQUIRED_FIELDS.VERSION_OPERATIONS).toEqual(['account', 'team', 'moniker']);
    });

    test('should define DEPLOY_OPERATIONS fields', () => {
      expect(REQUIRED_FIELDS.DEPLOY_OPERATIONS).toEqual(['account', 'team', 'moniker']);
    });
  });
});
