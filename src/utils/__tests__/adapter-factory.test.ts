/**
 * Tests for Adapter Factory
 */

import { describe, test, expect } from 'bun:test';
import { createAdapters, getConfigBucketName } from '../adapter-factory';
import type { CliContext } from '../../config/types';

describe('adapter-factory', () => {
  describe('createAdapters', () => {
    describe('validation', () => {
      test('should fail when account is missing', () => {
        const context: CliContext = {
          team: 'backend',
          moniker: 'order-svc',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('account');
        expect(result.adapters).toBeUndefined();
      });

      test('should fail when team is missing', () => {
        const context: CliContext = {
          account: '123456',
          moniker: 'order-svc',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('team');
        expect(result.adapters).toBeUndefined();
      });

      test('should fail when moniker is missing', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('moniker');
        expect(result.adapters).toBeUndefined();
      });

      test('should fail when provider is missing', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('provider');
        expect(result.adapters).toBeUndefined();
      });

      test('should fail when region is missing', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          provider: 'mock',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('region');
        expect(result.adapters).toBeUndefined();
      });

      test('should fail when multiple fields are missing', () => {
        const context: CliContext = {
          account: '123456',
          // team, moniker, provider, region missing
        };

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toHaveLength(4);
        expect(result.missingFields).toContain('team');
        expect(result.missingFields).toContain('moniker');
        expect(result.missingFields).toContain('provider');
        expect(result.missingFields).toContain('region');
      });

      test('should fail when all fields are missing', () => {
        const context: CliContext = {};

        const result = createAdapters(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toHaveLength(5);
        expect(result.missingFields).toContain('account');
        expect(result.missingFields).toContain('team');
        expect(result.missingFields).toContain('moniker');
        expect(result.missingFields).toContain('provider');
        expect(result.missingFields).toContain('region');
      });
    });

    describe('successful adapter creation', () => {
      test('should create all three adapters with valid context (mock provider)', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.missingFields).toBeUndefined();
        expect(result.adapters).toBeDefined();
        expect(result.adapters!.storage).toBeDefined();
        expect(result.adapters!.policy).toBeDefined();
        expect(result.adapters!.deployment).toBeDefined();
      });

      test('should create all three adapters with valid context (aws provider)', () => {
        const context: CliContext = {
          account: '999888777',
          team: 'frontend',
          moniker: 'web-app',
          provider: 'aws',
          region: 'eu-west-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.adapters).toBeDefined();
        expect(result.adapters!.storage).toBeDefined();
        expect(result.adapters!.policy).toBeDefined();
        expect(result.adapters!.deployment).toBeDefined();
      });

      test('should create all three adapters with different account/team/moniker', () => {
        const context: CliContext = {
          account: 'sub-12345',
          team: 'platform',
          moniker: 'api-gateway',
          provider: 'mock',
          region: 'eastus',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.adapters).toBeDefined();
        expect(result.adapters!.storage).toBeDefined();
        expect(result.adapters!.policy).toBeDefined();
        expect(result.adapters!.deployment).toBeDefined();
      });

      test('storage adapter should have correct interface methods', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(true);
        const { storage } = result.adapters!;

        // Verify storage adapter implements IStorageProvider interface
        expect(typeof storage.exists).toBe('function');
        expect(typeof storage.read).toBe('function');
        expect(typeof storage.write).toBe('function');
        expect(typeof storage.delete).toBe('function');
        expect(typeof storage.uploadArtifact).toBe('function');
        expect(typeof storage.deleteArtifact).toBe('function');
      });

      test('policy adapter should have correct interface methods', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(true);
        const { policy } = result.adapters!;

        // Verify policy adapter implements IPolicyProvider interface
        expect(typeof policy.generateAppPolicy).toBe('function');
        expect(typeof policy.generateCICDPolicy).toBe('function');
      });

      test('deployment adapter should have correct interface methods', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          provider: 'mock',
          region: 'us-east-1',
        };

        const result = createAdapters(context);

        expect(result.success).toBe(true);
        const { deployment } = result.adapters!;

        // Verify deployment adapter implements IDeploymentProvider interface
        expect(typeof deployment.deployApplication).toBe('function');
        expect(typeof deployment.deployDependency).toBe('function');
        expect(typeof deployment.rollbackDeployment).toBe('function');
      });
    });
  });

  describe('getConfigBucketName', () => {
    describe('validation', () => {
      test('should fail when account is missing', () => {
        const context: CliContext = {
          team: 'backend',
          moniker: 'order-svc',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('account');
        expect(result.bucketName).toBeUndefined();
      });

      test('should fail when team is missing', () => {
        const context: CliContext = {
          account: '123456',
          moniker: 'order-svc',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('team');
        expect(result.bucketName).toBeUndefined();
      });

      test('should fail when moniker is missing', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.missingFields).toContain('moniker');
        expect(result.bucketName).toBeUndefined();
      });

      test('should not require provider or region', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
          // provider and region not required for bucket name
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(true);
        expect(result.bucketName).toBeDefined();
      });
    });

    describe('bucket name generation', () => {
      test('should generate correct bucket name pattern', () => {
        const context: CliContext = {
          account: '123456',
          team: 'backend',
          moniker: 'order-svc',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(true);
        expect(result.bucketName).toBe('lcp-123456-backend-order-svc-config');
      });

      test('should generate correct bucket name for different account', () => {
        const context: CliContext = {
          account: '999888',
          team: 'frontend',
          moniker: 'web-app',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(true);
        expect(result.bucketName).toBe('lcp-999888-frontend-web-app-config');
      });

      test('should sanitize bucket name (lowercase, alphanumeric + hyphens)', () => {
        const context: CliContext = {
          account: 'ABC123',
          team: 'Platform_Team',
          moniker: 'My-Service!',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(true);
        // Should be lowercase, no underscores or special chars
        expect(result.bucketName).toBe('lcp-abc123-platformteam-my-service-config');
      });

      test('should handle numeric-only values', () => {
        const context: CliContext = {
          account: '12345678',
          team: '001',
          moniker: '2024',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(true);
        expect(result.bucketName).toBe('lcp-12345678-001-2024-config');
      });

      test('should handle hyphenated values', () => {
        const context: CliContext = {
          account: '123-456',
          team: 'my-team',
          moniker: 'my-service',
        };

        const result = getConfigBucketName(context);

        expect(result.success).toBe(true);
        expect(result.bucketName).toBe('lcp-123-456-my-team-my-service-config');
      });
    });
  });
});
