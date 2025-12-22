/**
 * End-to-end tests for context commands
 * Tests the full workflow: write -> read -> clear
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// CLI command to run (use development entry point with absolute path)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../../src/cli/index.ts');
const CLI_CMD = `bun run ${CLI_PATH}`;

describe('Context Commands E2E', () => {
  let testHome: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    // Create a unique test home directory
    testHome = join(tmpdir(), 'lcp-e2e-test-' + Date.now());
    mkdirSync(testHome, { recursive: true });

    // Save and override HOME
    originalHome = process.env['HOME'];
    process.env['HOME'] = testHome;
  });

  afterEach(() => {
    // Restore original HOME
    if (originalHome !== undefined) {
      process.env['HOME'] = originalHome;
    } else {
      delete process.env['HOME'];
    }

    // Clean up test directory
    if (existsSync(testHome)) {
      rmSync(testHome, { recursive: true, force: true });
    }
  });

  describe('lcp context write', () => {
    it('should write global context', () => {
      // Write context
      const result = execSync(`${CLI_CMD} context write --account test-account --team test-team`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Global context updated');
      expect(result).toContain('account: test-account');
      expect(result).toContain('team: test-team');

      // Verify config file was created
      const configPath = join(testHome, '.lcp', 'config.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should write project-local context with --local flag', () => {
      // Create project directory
      const projectDir = join(testHome, 'test-project');
      mkdirSync(projectDir, { recursive: true });

      // Write project-local context
      const result = execSync(`${CLI_CMD} context write --local --moniker test-app`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Project-local context updated');
      expect(result).toContain('moniker: test-app');

      // Verify config file was created in project directory
      const configPath = join(projectDir, '.lcp', 'config.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should merge with existing context', () => {
      // Write initial context
      execSync(`${CLI_CMD} context write --account test-account`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Write additional field
      const result = execSync(`${CLI_CMD} context write --team test-team`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Global context updated');
      expect(result).toContain('team: test-team');

      // Read context to verify both fields exist
      const readResult = execSync(`${CLI_CMD} context read --json`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      const config = JSON.parse(readResult);
      expect(config.account).toBe('test-account');
      expect(config.team).toBe('test-team');
    });

    it('should validate input and fail on invalid provider', () => {
      expect(() => {
        execSync(`${CLI_CMD} context write --provider invalid`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });
      }).toThrow();
    });
  });

  describe('lcp context read', () => {
    it('should display message when no context exists', () => {
      const result = execSync(`${CLI_CMD} context read`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('No context configuration found');
      expect(result).toContain('lcp context write');
    });

    it('should display context in human-readable format', () => {
      // Write context first
      execSync(`${CLI_CMD} context write --account test-account --team test-team`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Read context
      const result = execSync(`${CLI_CMD} context read`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Current context configuration');
      expect(result).toContain('account');
      expect(result).toContain('test-account');
      expect(result).toContain('team');
      expect(result).toContain('test-team');
    });

    it('should output JSON format with --json flag', () => {
      // Write context first
      execSync(`${CLI_CMD} context write --account test-account --team test-team`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Read context as JSON
      const result = execSync(`${CLI_CMD} context read --json`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      const config = JSON.parse(result);
      expect(config).toEqual({
        account: 'test-account',
        team: 'test-team',
      });
    });

    it('should merge global and project-local context', () => {
      const projectDir = join(testHome, 'test-project');
      mkdirSync(projectDir, { recursive: true });

      // Write global context
      execSync(`${CLI_CMD} context write --account global-account --team global-team`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Write project-local context that overrides account
      execSync(`${CLI_CMD} context write --local --account project-account`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Read context from project directory
      const result = execSync(`${CLI_CMD} context read --json`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      const config = JSON.parse(result);
      expect(config.account).toBe('project-account'); // Overridden by local
      expect(config.team).toBe('global-team'); // From global
    });
  });

  describe('lcp context clear', () => {
    it('should clear global context', () => {
      // Write context first
      execSync(`${CLI_CMD} context write --account test-account`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Clear context
      const result = execSync(`${CLI_CMD} context clear`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Global context cleared');

      // Verify config file was deleted
      const configPath = join(testHome, '.lcp', 'config.json');
      expect(existsSync(configPath)).toBe(false);
    });

    it('should clear project-local context with --local flag', () => {
      const projectDir = join(testHome, 'test-project');
      mkdirSync(projectDir, { recursive: true });

      // Write project-local context first
      execSync(`${CLI_CMD} context write --local --moniker test-app`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Clear project-local context
      const result = execSync(`${CLI_CMD} context clear --local`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Project-local context cleared');

      // Verify config file was deleted
      const configPath = join(projectDir, '.lcp', 'config.json');
      expect(existsSync(configPath)).toBe(false);
    });

    it('should not error when clearing non-existent context', () => {
      // Clear without any existing context
      const result = execSync(`${CLI_CMD} context clear`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(result).toContain('Global context cleared');
    });
  });

  describe('Full Workflow', () => {
    it('should support complete context management workflow', () => {
      const projectDir = join(testHome, 'workflow-test');
      mkdirSync(projectDir, { recursive: true });

      // Step 1: Write global context
      const writeGlobal = execSync(
        `${CLI_CMD} context write --account acc-123 --team devs --provider aws --region us-east-1`,
        {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        }
      );
      expect(writeGlobal).toContain('Global context updated');

      // Step 2: Read global context
      const readGlobal = execSync(`${CLI_CMD} context read --json`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      const globalConfig = JSON.parse(readGlobal);
      expect(globalConfig).toEqual({
        account: 'acc-123',
        team: 'devs',
        provider: 'aws',
        region: 'us-east-1',
      });

      // Step 3: Write project-local context (override account and add moniker)
      const writeLocal = execSync(`${CLI_CMD} context write --local --account acc-456 --moniker my-app`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      expect(writeLocal).toContain('Project-local context updated');

      // Step 4: Read merged context from project directory
      const readMerged = execSync(`${CLI_CMD} context read --json`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      const mergedConfig = JSON.parse(readMerged);
      expect(mergedConfig).toEqual({
        account: 'acc-456', // Overridden by local
        team: 'devs', // From global
        provider: 'aws', // From global
        region: 'us-east-1', // From global
        moniker: 'my-app', // Only in local
      });

      // Step 5: Clear project-local context
      const clearLocal = execSync(`${CLI_CMD} context clear --local`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      expect(clearLocal).toContain('Project-local context cleared');

      // Step 6: Read context again (should only show global)
      const readAfterClear = execSync(`${CLI_CMD} context read --json`, {
        cwd: projectDir,
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      const afterClearConfig = JSON.parse(readAfterClear);
      expect(afterClearConfig).toEqual({
        account: 'acc-123', // Back to global
        team: 'devs',
        provider: 'aws',
        region: 'us-east-1',
      });

      // Step 7: Clear global context
      const clearGlobal = execSync(`${CLI_CMD} context clear`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      expect(clearGlobal).toContain('Global context cleared');

      // Step 8: Verify no context remains
      const readEmpty = execSync(`${CLI_CMD} context read`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });
      expect(readEmpty).toContain('No context configuration found');
    });
  });
});
