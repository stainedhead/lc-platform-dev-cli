/**
 * Unit tests for config writer
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  writeConfig,
  writeGlobalConfig,
  writeProjectLocalConfig,
  clearConfig,
  clearGlobalConfig,
  clearProjectLocalConfig,
} from '../../../src/config/writer';
import type { CliContext } from '../../../src/config/types';

// Test directory setup
const TEST_HOME = join(tmpdir(), 'lcp-test-home-writer-' + Date.now());
const TEST_PROJECT = join(tmpdir(), 'lcp-test-project-writer-' + Date.now());

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

describe('writeConfig - create new', () => {
  test('creates new config file when it does not exist', () => {
    const configPath = join(TEST_PROJECT, 'test-config.json');
    const config: CliContext = {
      account: 'test-account',
      team: 'test-team',
    };

    writeConfig(configPath, config, false);

    expect(existsSync(configPath)).toBe(true);

    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(config);
  });

  test('creates directory if it does not exist', () => {
    const configPath = join(TEST_PROJECT, 'nested', 'dir', 'config.json');
    const config: CliContext = {
      account: 'test-account',
    };

    writeConfig(configPath, config, false);

    expect(existsSync(configPath)).toBe(true);
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(config);
  });

  test('formats JSON with 2-space indentation', () => {
    const configPath = join(TEST_PROJECT, 'config.json');
    const config: CliContext = {
      account: 'test-account',
      team: 'test-team',
    };

    writeConfig(configPath, config, false);

    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('{\n  "account"');
    expect(content).toContain(',\n  "team"');
  });
});

describe('writeConfig - merge behavior', () => {
  test('merges with existing config when merge=true', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    // Write initial config
    const initial: CliContext = {
      account: 'initial-account',
      team: 'initial-team',
      provider: 'aws',
    };
    writeConfig(configPath, initial, false);

    // Update with merge
    const updates: Partial<CliContext> = {
      account: 'updated-account',
      region: 'us-west-2',
    };
    writeConfig(configPath, updates, true);

    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed).toEqual({
      account: 'updated-account', // updated
      team: 'initial-team', // preserved
      provider: 'aws', // preserved
      region: 'us-west-2', // added
    });
  });

  test('overwrites entire config when merge=false', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    // Write initial config
    const initial: CliContext = {
      account: 'initial-account',
      team: 'initial-team',
      provider: 'aws',
    };
    writeConfig(configPath, initial, false);

    // Update without merge
    const updates: Partial<CliContext> = {
      account: 'updated-account',
      region: 'us-west-2',
    };
    writeConfig(configPath, updates, false);

    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed).toEqual(updates);
  });

  test('creates new file with merge=true if file does not exist', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    const config: CliContext = {
      account: 'test-account',
    };

    writeConfig(configPath, config, true);

    expect(existsSync(configPath)).toBe(true);
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(config);
  });
});

describe('writeConfig - validation', () => {
  test('rejects invalid provider', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    const invalid: any = {
      provider: 'invalid-provider',
    };

    expect(() => writeConfig(configPath, invalid, false)).toThrow('Invalid configuration');
  });

  test('rejects invalid moniker format', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    const invalid: any = {
      moniker: 'Invalid_Moniker',
    };

    expect(() => writeConfig(configPath, invalid, false)).toThrow('Invalid configuration');
  });

  test('rejects empty string values', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    const invalid: any = {
      account: '',
    };

    expect(() => writeConfig(configPath, invalid, false)).toThrow('Invalid configuration');
  });

  test('accepts valid partial config', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    const valid: Partial<CliContext> = {
      account: 'test-account',
    };

    expect(() => writeConfig(configPath, valid, false)).not.toThrow();

    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(valid);
  });
});

describe('writeConfig - atomic writes', () => {
  test('does not leave partial file on write error', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    // Create initial valid config
    const initial: CliContext = {
      account: 'test-account',
    };
    writeConfig(configPath, initial, false);

    // Read initial content
    const initialContent = readFileSync(configPath, 'utf-8');

    // Attempt to write invalid config (should fail validation before write)
    try {
      writeConfig(configPath, { provider: 'invalid' } as any, false);
    } catch {
      // Expected to fail
    }

    // Original file should be unchanged
    const currentContent = readFileSync(configPath, 'utf-8');
    expect(currentContent).toBe(initialContent);
  });
});

describe('writeGlobalConfig', () => {
  test('writes to global config path', () => {
    const config: CliContext = {
      account: 'global-account',
      team: 'global-team',
    };

    writeGlobalConfig(config, false);

    const globalPath = join(TEST_HOME, '.lcp', 'config.json');
    expect(existsSync(globalPath)).toBe(true);

    const content = readFileSync(globalPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(config);
  });

  test('merges with existing global config by default', () => {
    // Write initial config
    writeGlobalConfig({ account: 'initial-account', team: 'initial-team' }, false);

    // Update with merge (default)
    writeGlobalConfig({ account: 'updated-account', region: 'us-east-1' });

    const globalPath = join(TEST_HOME, '.lcp', 'config.json');
    const content = readFileSync(globalPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed).toEqual({
      account: 'updated-account',
      team: 'initial-team',
      region: 'us-east-1',
    });
  });
});

describe('writeProjectLocalConfig', () => {
  test('writes to project-local config path', () => {
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    const config: CliContext = {
      moniker: 'project-app',
    };

    writeProjectLocalConfig(config, false);

    process.chdir(originalCwd);

    const projectPath = join(TEST_PROJECT, '.lcp', 'config.json');
    expect(existsSync(projectPath)).toBe(true);

    const content = readFileSync(projectPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(config);
  });
});

describe('clearConfig', () => {
  test('removes existing config file', () => {
    const configPath = join(TEST_PROJECT, 'config.json');

    // Create config file
    writeConfig(configPath, { account: 'test' }, false);
    expect(existsSync(configPath)).toBe(true);

    // Clear it
    clearConfig(configPath);
    expect(existsSync(configPath)).toBe(false);
  });

  test('does not throw if file does not exist', () => {
    const configPath = join(TEST_PROJECT, 'nonexistent.json');

    expect(() => clearConfig(configPath)).not.toThrow();
  });
});

describe('clearGlobalConfig', () => {
  test('removes global config file', () => {
    // Create global config
    writeGlobalConfig({ account: 'test' }, false);

    const globalPath = join(TEST_HOME, '.lcp', 'config.json');
    expect(existsSync(globalPath)).toBe(true);

    // Clear it
    clearGlobalConfig();
    expect(existsSync(globalPath)).toBe(false);
  });
});

describe('clearProjectLocalConfig', () => {
  test('removes project-local config file', () => {
    const originalCwd = process.cwd();
    process.chdir(TEST_PROJECT);

    // Create project config
    writeProjectLocalConfig({ moniker: 'test' }, false);

    const projectPath = join(TEST_PROJECT, '.lcp', 'config.json');
    expect(existsSync(projectPath)).toBe(true);

    // Clear it
    clearProjectLocalConfig();
    expect(existsSync(projectPath)).toBe(false);

    process.chdir(originalCwd);
  });
});
