/**
 * Integration test for config loading and precedence
 * Tests that CLI flags > project-local > global > defaults
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { setupGlobalOptions, getResolvedContext } from '../../src/cli/options';
import type { CliContext } from '../../src/config/types';

// Test directory setup
const TEST_HOME = join(tmpdir(), 'lcp-test-home-precedence-' + Date.now());
const TEST_PROJECT = join(tmpdir(), 'lcp-test-project-precedence-' + Date.now());

beforeEach(() => {
  // Create test directories
  mkdirSync(TEST_HOME, { recursive: true });
  mkdirSync(TEST_PROJECT, { recursive: true });

  // Set HOME for global config
  process.env.HOME = TEST_HOME;
});

afterEach(() => {
  // Cleanup test directories
  if (existsSync(TEST_HOME)) {
    rmSync(TEST_HOME, { recursive: true, force: true });
  }
  if (existsSync(TEST_PROJECT)) {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
  }

  // Clear environment variables
  delete process.env.LCP_ACCOUNT;
  delete process.env.LCP_TEAM;
  delete process.env.LCP_MONIKER;
  delete process.env.LCP_PROVIDER;
  delete process.env.LCP_REGION;
});

describe('Config precedence integration', () => {
  test('CLI flags override all config sources', async () => {
    // Create global config
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    const globalConfig: CliContext = {
      account: 'global-account',
      team: 'global-team',
      provider: 'aws',
      region: 'us-east-1',
    };
    writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

    // Create project-local config
    const projectConfigPath = join(TEST_PROJECT, '.lcp', 'config.json');
    mkdirSync(join(TEST_PROJECT, '.lcp'), { recursive: true });

    const projectConfig: CliContext = {
      account: 'project-account',
      moniker: 'project-app',
    };
    writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    // Change to test project directory
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    // Create command with CLI flags
    const program = new Command();
    setupGlobalOptions(program);

    // Parse args with CLI flags
    program.parse([
      'node',
      'lcp',
      '--account',
      'cli-account',
      '--region',
      'cli-region',
    ]);

    // Get resolved context
    const context = getResolvedContext(program);

    process.chdir(originalCwd);

    // Verify precedence: CLI > project-local > global
    expect(context).toEqual({
      account: 'cli-account', // from CLI flags
      team: 'global-team', // from global (not overridden)
      moniker: 'project-app', // from project-local
      provider: 'aws', // from global
      region: 'cli-region', // from CLI flags
    });
  });

  test('project-local config overrides global config', async () => {
    // Create global config
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    const globalConfig: CliContext = {
      account: 'global-account',
      team: 'global-team',
      provider: 'aws',
      region: 'us-east-1',
    };
    writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

    // Create project-local config
    const projectConfigPath = join(TEST_PROJECT, '.lcp', 'config.json');
    mkdirSync(join(TEST_PROJECT, '.lcp'), { recursive: true });

    const projectConfig: CliContext = {
      team: 'project-team', // overrides global
      moniker: 'project-app',
      region: 'us-west-2', // overrides global
    };
    writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    // Change to test project directory
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    // Create command without CLI flags
    const program = new Command();
    setupGlobalOptions(program);
    program.parse(['node', 'lcp']);

    // Get resolved context
    const context = getResolvedContext(program);

    process.chdir(originalCwd);

    // Verify precedence: project-local > global
    expect(context).toEqual({
      account: 'global-account', // from global
      team: 'project-team', // from project-local (overrides global)
      moniker: 'project-app', // from project-local
      provider: 'aws', // from global
      region: 'us-west-2', // from project-local (overrides global)
    });
  });

  test('uses global config when no project-local config exists', async () => {
    // Create global config only
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    const globalConfig: CliContext = {
      account: 'global-account',
      team: 'global-team',
      provider: 'mock',
    };
    writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

    // Change to test project directory (no project config)
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    // Create command
    const program = new Command();
    setupGlobalOptions(program);
    program.parse(['node', 'lcp']);

    // Get resolved context
    const context = getResolvedContext(program);

    process.chdir(originalCwd);

    // Verify only global config is used
    expect(context).toEqual(globalConfig);
  });

  test('returns empty context when no config exists', async () => {
    // No config files created

    // Change to test project directory
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    // Create command
    const program = new Command();
    setupGlobalOptions(program);
    program.parse(['node', 'lcp']);

    // Get resolved context
    const context = getResolvedContext(program);

    process.chdir(originalCwd);

    // Verify empty context
    expect(context).toEqual({});
  });

  test('environment variables provide defaults for CLI flags', async () => {
    // Set environment variables
    process.env.LCP_ACCOUNT = 'env-account';
    process.env.LCP_PROVIDER = 'mock';

    // Create command (env vars are used as defaults)
    const program = new Command();
    setupGlobalOptions(program);
    program.parse(['node', 'lcp']);

    // Get resolved context
    const context = getResolvedContext(program);

    // Verify env vars were used
    expect(context.account).toBe('env-account');
    expect(context.provider).toBe('mock');
  });

  test('CLI flags override environment variables', async () => {
    // Set environment variables
    process.env.LCP_ACCOUNT = 'env-account';
    process.env.LCP_PROVIDER = 'mock';

    // Create command with CLI flags
    const program = new Command();
    setupGlobalOptions(program);
    program.parse(['node', 'lcp', '--account', 'cli-account', '--provider', 'aws']);

    // Get resolved context
    const context = getResolvedContext(program);

    // Verify CLI flags override env vars
    expect(context.account).toBe('cli-account');
    expect(context.provider).toBe('aws');
  });
});
