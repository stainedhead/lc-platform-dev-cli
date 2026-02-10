/**
 * End-to-end tests for app commands
 * Tests the full CLI workflow: lcp app init, read, validate, update
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// CLI command to run (use development entry point with absolute path)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../../src/cli/index.ts');
const CLI_CMD = `bun run ${CLI_PATH}`;

describe('App Commands E2E', () => {
  let testHome: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    // Create unique test home directory
    testHome = join(tmpdir(), 'lcp-app-e2e-' + Date.now());
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

  describe('lcp app init', () => {
    describe('with missing context', () => {
      it('should show descriptive error when account is missing', () => {
        // Set up partial context (missing account)
        execSync(`${CLI_CMD} context write --team test-team --moniker test-app`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Try to init without account
        expect(() => {
          execSync(`${CLI_CMD} app init`, {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          });
        }).toThrow();

        // TODO: Verify error message contains:
        // - "account"
        // - "lcp context write --account"
        // - OR command flag hint "--account <value>"
      });

      it('should show descriptive error when moniker is missing', () => {
        // Set up partial context (missing moniker)
        execSync(`${CLI_CMD} context write --account test-account --team test-team`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Try to init without moniker
        expect(() => {
          execSync(`${CLI_CMD} app init`, {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          });
        }).toThrow();
      });

      it('should show descriptive error when team is missing', () => {
        // Set up partial context (missing team)
        execSync(`${CLI_CMD} context write --account test-account --moniker test-app`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Try to init without team
        expect(() => {
          execSync(`${CLI_CMD} app init`, {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          });
        }).toThrow();
      });
    });

    describe('with valid context', () => {
      beforeEach(() => {
        // Set up complete context
        execSync(
          `${CLI_CMD} context write --account test-account --team test-team --moniker test-app --provider mock --region us-east-1`,
          {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          }
        );
      });

      it('should initialize app successfully', () => {
        const result = execSync(`${CLI_CMD} app init`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Verify success message
        expect(result).toContain('initialized');
        expect(result).toContain('test-app');
      });

      it('should accept --config file', () => {
        // Create config file
        const configFile = join(testHome, 'app-config.json');
        writeFileSync(
          configFile,
          JSON.stringify({
            name: 'Test Application',
            description: 'E2E test app',
          })
        );

        const result = execSync(`${CLI_CMD} app init --config ${configFile}`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        expect(result).toContain('initialized');
      });

      it('should support --json output', () => {
        const result = execSync(`${CLI_CMD} app init --json`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Parse JSON output
        const output = JSON.parse(result);
        expect(output).toBeDefined();
        expect(output.moniker).toBe('test-app');
      });

      it('should error when app already exists', () => {
        // Initialize app first time (should succeed)
        execSync(`${CLI_CMD} app init`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Try to initialize same app again (should fail)
        expect(() => {
          execSync(`${CLI_CMD} app init`, {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          });
        }).toThrow();

        // TODO: Verify error message mentions "already exists" or similar
      });
    });

    describe('with command-line overrides', () => {
      beforeEach(() => {
        // Set up default context
        execSync(
          `${CLI_CMD} context write --account default-account --team default-team --moniker default-app --provider mock --region us-east-1`,
          {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          }
        );
      });

      it('should allow overriding account with flag', () => {
        const result = execSync(`${CLI_CMD} app init --account override-account`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Verify that override account was used
        // TODO: Check that app was created with override-account, not default-account
        expect(result).toContain('initialized');
      });

      it('should allow overriding moniker with flag', () => {
        const result = execSync(`${CLI_CMD} app init --moniker override-app`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        expect(result).toContain('initialized');
        expect(result).toContain('override-app');
      });
    });

    describe('with dry-run mode', () => {
      beforeEach(() => {
        execSync(
          `${CLI_CMD} context write --account test-account --team test-team --moniker test-app --provider mock --region us-east-1`,
          {
            env: { ...process.env, HOME: testHome },
            encoding: 'utf-8',
          }
        );
      });

      it('should preview init without creating app', () => {
        const result = execSync(`${CLI_CMD} app init --dry-run`, {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        });

        // Verify dry-run message
        expect(result.toLowerCase()).toContain('dry');
        expect(result.toLowerCase()).toContain('would');

        // TODO: Verify that app was NOT actually created
        // (subsequent read should fail or show no app)
      });
    });
  });

  describe('workflow: init → read', () => {
    beforeEach(() => {
      // Set up context
      execSync(
        `${CLI_CMD} context write --account wf-account --team wf-team --moniker wf-app --provider mock --region us-east-1`,
        {
          env: { ...process.env, HOME: testHome },
          encoding: 'utf-8',
        }
      );
    });

    it('should allow reading app after init', () => {
      // Initialize app
      const initResult = execSync(`${CLI_CMD} app init`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      expect(initResult).toContain('initialized');

      // Read app
      const readResult = execSync(`${CLI_CMD} app read`, {
        env: { ...process.env, HOME: testHome },
        encoding: 'utf-8',
      });

      // Verify app can be read
      expect(readResult).toBeDefined();
      expect(readResult).toContain('wf-app');
    });
  });
});
