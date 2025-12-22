/**
 * Unit tests for version commands
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { unlinkSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const CLI_PATH = join(process.cwd(), 'src', 'cli', 'index.ts');
const TEST_CONFIG_V1 = join(tmpdir(), 'version-v1.0.0.json');
const TEST_CONFIG_V2 = join(tmpdir(), 'version-v2.0.0.json');

function getMockVersionsPath(appKey: string): string {
  return join(homedir(), '.lcp', 'mock-versions', `${appKey.replace(/\//g, '-')}.json`);
}

function cleanupMockVersions(appKey: string): void {
  const path = getMockVersionsPath(appKey);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

function setupTestConfig(): void {
  // Create test version config files
  writeFileSync(
    TEST_CONFIG_V1,
    JSON.stringify({
      name: 'test-app-v1',
      description: 'Version 1.0.0',
      environment: {
        LOG_LEVEL: 'info',
        PORT: '8080',
      },
    })
  );

  writeFileSync(
    TEST_CONFIG_V2,
    JSON.stringify({
      name: 'test-app-v2',
      description: 'Version 2.0.0',
      environment: {
        LOG_LEVEL: 'debug',
        PORT: '8080',
      },
    })
  );
}

function cleanupTestConfig(): void {
  if (existsSync(TEST_CONFIG_V1)) unlinkSync(TEST_CONFIG_V1);
  if (existsSync(TEST_CONFIG_V2)) unlinkSync(TEST_CONFIG_V2);
}

describe('lcp version add', () => {
  const appKey = 'test-account/test-team/version-test-app';

  beforeEach(() => {
    cleanupMockVersions(appKey);
    setupTestConfig();
  });

  afterEach(() => {
    cleanupMockVersions(appKey);
    cleanupTestConfig();
  });

  test('should add version with config file', () => {
    const result = execSync(
      `bun run ${CLI_PATH} version add --ver v1.0.0 --config ${TEST_CONFIG_V1} --account test-account --team test-team --moniker version-test-app --json`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.version).toBe('v1.0.0');
    expect(output.moniker).toBe('version-test-app');
    expect(output.created).toBe(true);

    // Verify file was created
    expect(existsSync(getMockVersionsPath(appKey))).toBe(true);
  });

  test('should reject duplicate version', () => {
    // Add first version
    execSync(
      `bun run ${CLI_PATH} version add --ver v1.0.0 --config ${TEST_CONFIG_V1} --account test-account --team test-team --moniker version-test-app`,
      { encoding: 'utf-8' }
    );

    // Try to add duplicate
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version add --ver v1.0.0 --config ${TEST_CONFIG_V1} --account test-account --team test-team --moniker version-test-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });

  test('should require --ver flag', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version add --config ${TEST_CONFIG_V1} --account test-account --team test-team --moniker version-test-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });

  test('should require --config flag', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version add --ver v1.0.0 --account test-account --team test-team --moniker version-test-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });

  test('should require account, team, moniker context', () => {
    expect(() => {
      execSync(`bun run ${CLI_PATH} version add --ver v1.0.0 --config ${TEST_CONFIG_V1}`, {
        encoding: 'utf-8',
      });
    }).toThrow();
  });
});

describe('lcp version read', () => {
  const appKey = 'test-account/test-team/version-read-app';

  beforeEach(() => {
    cleanupMockVersions(appKey);
    setupTestConfig();

    // Add a version for reading
    execSync(
      `bun run ${CLI_PATH} version add --ver v1.0.0 --config ${TEST_CONFIG_V1} --account test-account --team test-team --moniker version-read-app`,
      { encoding: 'utf-8' }
    );
  });

  afterEach(() => {
    cleanupMockVersions(appKey);
    cleanupTestConfig();
  });

  test('should read existing version', () => {
    const result = execSync(
      `bun run ${CLI_PATH} version read --ver v1.0.0 --account test-account --team test-team --moniker version-read-app --json`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.version).toBe('v1.0.0');
    expect(output.config).toBeDefined();
    expect(output.config.name).toBe('test-app-v1');
    expect(output.isDeployed).toBe(false);
  });

  test('should error on non-existent version', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version read --ver v2.0.0 --account test-account --team test-team --moniker version-read-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });

  test('should require --ver flag', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version read --account test-account --team test-team --moniker version-read-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });
});

describe('lcp version deploy', () => {
  const appKey = 'test-account/test-team/version-deploy-app';

  beforeEach(() => {
    cleanupMockVersions(appKey);
    setupTestConfig();

    // Add versions for deployment
    execSync(
      `bun run ${CLI_PATH} version add --ver v1.0.0 --config ${TEST_CONFIG_V1} --account test-account --team test-team --moniker version-deploy-app`,
      { encoding: 'utf-8' }
    );

    execSync(
      `bun run ${CLI_PATH} version add --ver v2.0.0 --config ${TEST_CONFIG_V2} --account test-account --team test-team --moniker version-deploy-app`,
      { encoding: 'utf-8' }
    );
  });

  afterEach(() => {
    cleanupMockVersions(appKey);
    cleanupTestConfig();
  });

  test('should deploy version with default scope (all)', () => {
    const result = execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --json --quiet`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.version).toBe('v1.0.0');
    expect(output.deployed).toBe(true);
    expect(output.scope).toBe('all');
    expect(output.mode).toBe('local');
  });

  test('should deploy with --app-only scope', () => {
    const result = execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --app-only --account test-account --team test-team --moniker version-deploy-app --json --quiet`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.scope).toBe('app-only');
  });

  test('should deploy with --dependencies-only scope', () => {
    const result = execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --dependencies-only --account test-account --team test-team --moniker version-deploy-app --json --quiet`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.scope).toBe('dependencies-only');
  });

  test('should reject mutually exclusive scope flags', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version deploy --ver v1.0.0 --app-only --dependencies-only --account test-account --team test-team --moniker version-deploy-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });

  test('should deploy with --platform-tooling mode', () => {
    const result = execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --platform-tooling --account test-account --team test-team --moniker version-deploy-app --json`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.mode).toBe('platform-tooling');
    expect(output.eventId).toBeDefined();
    expect(output.eventId).toContain('event-');
  });

  test('should support --dry-run mode', () => {
    // In dry-run, deployment returns deployed: false
    execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --dry-run --quiet`,
      { encoding: 'utf-8' }
    );

    // Verify version is not marked as deployed
    const readResult = execSync(
      `bun run ${CLI_PATH} version read --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --json`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(readResult);
    expect(output.isDeployed).toBe(false);
  });

  test('should mark version as deployed after deployment', () => {
    // Deploy v1.0.0
    execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --quiet`,
      { encoding: 'utf-8' }
    );

    // Read and verify deployed status
    const readResult = execSync(
      `bun run ${CLI_PATH} version read --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --json`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(readResult);
    expect(output.isDeployed).toBe(true);
    expect(output.lastDeployed).toBeDefined();
    expect(output.deploymentScope).toBe('all');
  });

  test('should mark previous version as not deployed when deploying new version', () => {
    // Deploy v1.0.0
    execSync(
      `bun run ${CLI_PATH} version deploy --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --quiet`,
      { encoding: 'utf-8' }
    );

    // Deploy v2.0.0
    execSync(
      `bun run ${CLI_PATH} version deploy --ver v2.0.0 --account test-account --team test-team --moniker version-deploy-app --quiet`,
      { encoding: 'utf-8' }
    );

    // Verify v1.0.0 is no longer deployed
    const v1Result = execSync(
      `bun run ${CLI_PATH} version read --ver v1.0.0 --account test-account --team test-team --moniker version-deploy-app --json`,
      { encoding: 'utf-8' }
    );

    const v1Output = JSON.parse(v1Result);
    expect(v1Output.isDeployed).toBe(false);

    // Verify v2.0.0 is deployed
    const v2Result = execSync(
      `bun run ${CLI_PATH} version read --ver v2.0.0 --account test-account --team test-team --moniker version-deploy-app --json`,
      { encoding: 'utf-8' }
    );

    const v2Output = JSON.parse(v2Result);
    expect(v2Output.isDeployed).toBe(true);
  });

  test('should error on non-existent version', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version deploy --ver v99.0.0 --account test-account --team test-team --moniker version-deploy-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });

  test('should require --ver flag', () => {
    expect(() => {
      execSync(
        `bun run ${CLI_PATH} version deploy --account test-account --team test-team --moniker version-deploy-app`,
        { encoding: 'utf-8' }
      );
    }).toThrow();
  });
});
