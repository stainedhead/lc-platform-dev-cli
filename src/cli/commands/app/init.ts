/**
 * lcp app init command
 * Initialize a new application in the platform
 */

import { Command } from 'commander';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getResolvedContext } from '../../options.js';
import { validateRequiredContext } from '../../../utils/validation.js';
import type { CliContext } from '../../../config/types.js';

// Required context fields for app init
const REQUIRED_FIELDS = ['account', 'team', 'moniker'] as const;

/**
 * Get path to mock apps state file
 */
function getMockAppsPath(): string {
  return join(homedir(), '.lcp', 'mock-apps.json');
}

/**
 * Load mock apps from state file
 */
function loadMockApps(): Set<string> {
  const path = getMockAppsPath();
  if (!existsSync(path)) {
    return new Set();
  }

  try {
    const data = readFileSync(path, 'utf-8');
    const apps = JSON.parse(data);
    return new Set(apps);
  } catch {
    return new Set();
  }
}

/**
 * Save mock apps to state file
 */
function saveMockApps(apps: Set<string>): void {
  const path = getMockAppsPath();
  const dir = join(homedir(), '.lcp');

  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify([...apps], null, 2));
}

/**
 * Mock app initialization
 * TODO: Replace with actual core library integration when available
 */
async function initializeApp(
  context: CliContext,
  _config?: Record<string, unknown>
): Promise<{ id: string; status: string }> {
  // Load existing apps
  const mockApps = loadMockApps();

  // Create unique key for app
  const appKey = `${context.account}/${context.team}/${context.moniker}`;

  // Check for duplicate (FR-010 acceptance scenario 3, T031)
  if (mockApps.has(appKey)) {
    throw new Error(
      `Application already exists: ${context.account}/${context.team}/${context.moniker}\n\n` +
        `To update the existing application, use: lcp app update --config <file>`
    );
  }

  // Register app
  mockApps.add(appKey);
  saveMockApps(mockApps);

  // Simulate app initialization
  return {
    id: `app-${Date.now()}`,
    status: 'active',
  };
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a new application in the platform')
    .option('--config <file>', 'Path to application configuration file (JSON)')
    .option('--account <account>', 'Cloud provider account identifier (overrides context)')
    .option('--team <team>', 'Team or organization identifier (overrides context)')
    .option('--moniker <moniker>', 'Application moniker (overrides context)')
    .option('--provider <provider>', 'Cloud provider (aws, azure, mock) (overrides context)')
    .option('--region <region>', 'Cloud region (overrides context)')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        config?: string;
        account?: string;
        team?: string;
        moniker?: string;
        provider?: string;
        region?: string;
        json?: boolean;
        quiet?: boolean;
        dryRun?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load and resolve context (merges file config with CLI options)
        const context = getResolvedContext(this);

        // Validate required context fields (T030)
        validateRequiredContext(context, REQUIRED_FIELDS, 'app init');

        // Load config file if provided
        let appConfig: Record<string, unknown> | undefined;
        if (cmdOptions.config) {
          if (!existsSync(cmdOptions.config)) {
            console.error(`Error: Config file not found: ${cmdOptions.config}`);
            process.exit(1);
          }

          try {
            const configContent = readFileSync(cmdOptions.config, 'utf-8');
            appConfig = JSON.parse(configContent);

            if (cmdOptions.debug) {
              console.error('Loaded config from file:', cmdOptions.config);
              console.error('Config:', JSON.stringify(appConfig, null, 2));
            }
          } catch (error) {
            console.error(`Error: Failed to parse config file: ${(error as Error).message}`);
            process.exit(1);
          }
        }

        // Dry-run mode
        if (cmdOptions.dryRun) {
          if (!cmdOptions.quiet) {
            console.log('[DRY RUN] Would initialize application with:');
            console.log(`  Account: ${context.account}`);
            console.log(`  Team: ${context.team}`);
            console.log(`  Moniker: ${context.moniker}`);
            if (context.provider) console.log(`  Provider: ${context.provider}`);
            if (context.region) console.log(`  Region: ${context.region}`);
            if (appConfig) {
              console.log(`  Config: ${Object.keys(appConfig).length} keys`);
            }
          }
          return;
        }

        // Initialize app via core library (T031 - includes duplicate detection)
        const result = await initializeApp(context, appConfig);

        // Output result
        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                id: result.id,
                moniker: context.moniker,
                account: context.account,
                team: context.team,
                provider: context.provider,
                region: context.region,
                status: result.status,
              },
              null,
              2
            )
          );
        } else if (!cmdOptions.quiet) {
          console.log(`✓ Application initialized successfully`);
          console.log(`  Moniker: ${context.moniker}`);
          console.log(`  Account: ${context.account}`);
          console.log(`  Team: ${context.team}`);
          if (context.provider) console.log(`  Provider: ${context.provider}`);
          if (result.id) console.log(`  ID: ${result.id}`);
        }
      } catch (error) {
        if (cmdOptions.debug) {
          console.error('Debug: Full error:', error);
        }
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
