/**
 * Unit tests for config loader
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadConfig,
  loadConfigWithOptions,
  mergeConfigs,
  getGlobalConfigPath,
  findProjectLocalConfig,
  globalConfigExists,
  projectLocalConfigExists,
} from '../../../src/config/loader';
import type { CliContext } from '../../../src/config/types';

// Test directory setup
const TEST_HOME = join(tmpdir(), 'lcp-test-home-' + Date.now());
const TEST_PROJECT = join(tmpdir(), 'lcp-test-project-' + Date.now());

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
});

describe('mergeConfigs', () => {
  test('merges two configs with local overriding global', () => {
    const global: CliContext = {
      account: 'global-account',
      team: 'global-team',
      provider: 'aws',
    };

    const local: CliContext = {
      account: 'local-account',
      region: 'us-west-2',
    };

    const result = mergeConfigs(global, local);

    expect(result).toEqual({
      account: 'local-account', // overridden
      team: 'global-team', // preserved
      provider: 'aws', // preserved
      region: 'us-west-2', // added
    });
  });

  test('skips undefined values in local config', () => {
    const global: CliContext = {
      account: 'global-account',
      team: 'global-team',
    };

    const local: CliContext = {
      account: undefined,
      region: 'us-east-1',
    };

    const result = mergeConfigs(global, local);

    expect(result).toEqual({
      account: 'global-account', // not overridden by undefined
      team: 'global-team',
      region: 'us-east-1',
    });
  });

  test('handles empty configs', () => {
    const global: CliContext = {};
    const local: CliContext = {};

    const result = mergeConfigs(global, local);

    expect(result).toEqual({});
  });

  test('handles null values as deletions', () => {
    const global: CliContext = {
      account: 'global-account',
      team: 'global-team',
      provider: 'aws',
    };

    const local: CliContext = {
      team: null as any, // Delete team
      region: 'us-east-1',
    };

    const result = mergeConfigs(global, local);

    expect(result).toEqual({
      account: 'global-account',
      provider: 'aws',
      region: 'us-east-1',
    });
    expect('team' in result).toBe(false);
  });
});

describe('loadConfig - global only', () => {
  test('loads global config when it exists', () => {
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    const globalConfig: CliContext = {
      account: 'test-account',
      team: 'test-team',
      provider: 'aws',
    };

    writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

    // Change to test project directory
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const result = loadConfig();

    process.chdir(originalCwd);

    expect(result).toEqual(globalConfig);
  });

  test('returns empty config when no config files exist', () => {
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const result = loadConfig();

    process.chdir(originalCwd);

    expect(result).toEqual({});
  });

  test('returns empty config when global config is invalid JSON', () => {
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    writeFileSync(globalConfigPath, 'invalid json {{{');

    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const result = loadConfig();

    process.chdir(originalCwd);

    expect(result).toEqual({});
  });
});

describe('loadConfig - project-local override', () => {
  test('merges project-local config over global config', () => {
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
      moniker: 'my-app',
    };

    writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    // Change to test project directory
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const result = loadConfig();

    process.chdir(originalCwd);

    expect(result).toEqual({
      account: 'project-account', // overridden by project
      team: 'global-team', // from global
      provider: 'aws', // from global
      region: 'us-east-1', // from global
      moniker: 'my-app', // from project
    });
  });

  test('finds project-local config in parent directory', () => {
    // Create project-local config in TEST_PROJECT
    const projectConfigPath = join(TEST_PROJECT, '.lcp', 'config.json');
    mkdirSync(join(TEST_PROJECT, '.lcp'), { recursive: true });

    const projectConfig: CliContext = {
      moniker: 'parent-app',
    };

    writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));

    // Create subdirectory
    const subDir = join(TEST_PROJECT, 'subdir', 'nested');
    mkdirSync(subDir, { recursive: true });

    // Change to subdirectory
    const originalCwd = process.cwd();
    process.chdir(subDir);

    const result = loadConfig();

    process.chdir(originalCwd);

    expect(result).toEqual({
      moniker: 'parent-app',
    });
  });
});

describe('loadConfigWithOptions', () => {
  test('command-line options override file config', () => {
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    const globalConfig: CliContext = {
      account: 'file-account',
      team: 'file-team',
      provider: 'aws',
    };

    writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const options: Partial<CliContext> = {
      account: 'cli-account',
      region: 'us-west-2',
    };

    const result = loadConfigWithOptions(options);

    process.chdir(originalCwd);

    expect(result).toEqual({
      account: 'cli-account', // from CLI options
      team: 'file-team', // from file
      provider: 'aws', // from file
      region: 'us-west-2', // from CLI options
    });
  });

  test('works with empty options', () => {
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });

    const globalConfig: CliContext = {
      account: 'file-account',
    };

    writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const result = loadConfigWithOptions({});

    process.chdir(originalCwd);

    expect(result).toEqual(globalConfig);
  });
});

describe('findProjectLocalConfig', () => {
  test('finds config in current directory', () => {
    const configPath = join(TEST_PROJECT, '.lcp', 'config.json');
    mkdirSync(join(TEST_PROJECT, '.lcp'), { recursive: true });
    writeFileSync(configPath, '{}');

    const result = findProjectLocalConfig(TEST_PROJECT);

    expect(result).toBe(configPath);
  });

  test('finds config in parent directory', () => {
    const configPath = join(TEST_PROJECT, '.lcp', 'config.json');
    mkdirSync(join(TEST_PROJECT, '.lcp'), { recursive: true });
    writeFileSync(configPath, '{}');

    const subDir = join(TEST_PROJECT, 'subdir');
    mkdirSync(subDir);

    const result = findProjectLocalConfig(subDir);

    expect(result).toBe(configPath);
  });

  test('returns null when no config found', () => {
    const result = findProjectLocalConfig(TEST_PROJECT);

    expect(result).toBeNull();
  });
});

describe('helper functions', () => {
  test('globalConfigExists returns true when global config exists', () => {
    const globalConfigPath = join(TEST_HOME, '.lcp', 'config.json');
    mkdirSync(join(TEST_HOME, '.lcp'), { recursive: true });
    writeFileSync(globalConfigPath, '{}');

    expect(globalConfigExists()).toBe(true);
  });

  test('globalConfigExists returns false when global config does not exist', () => {
    expect(globalConfigExists()).toBe(false);
  });

  test('projectLocalConfigExists returns true when project config exists', () => {
    const projectConfigPath = join(TEST_PROJECT, '.lcp', 'config.json');
    mkdirSync(join(TEST_PROJECT, '.lcp'), { recursive: true });
    writeFileSync(projectConfigPath, '{}');

    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    expect(projectLocalConfigExists()).toBe(true);

    process.chdir(originalCwd);
  });

  test('projectLocalConfigExists returns false when project config does not exist', () => {
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    expect(projectLocalConfigExists()).toBe(false);

    process.chdir(originalCwd);
  });

  test('getGlobalConfigPath returns correct path', () => {
    const path = getGlobalConfigPath();
    expect(path).toContain('.lcp');
    expect(path).toContain('config.json');
  });
});
