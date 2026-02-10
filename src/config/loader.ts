/**
 * Configuration loader with global + project-local merge support
 *
 * Load priority (highest to lowest):
 * 1. Command-line flags
 * 2. Project-local config (.lcp/config.json in current or parent directory)
 * 3. Global config (~/.lcp/config.json)
 * 4. Empty defaults (all fields optional)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import type { CliContext } from './types.js';
import { safeValidateCliContext } from './schema.js';

/**
 * Get global config file path
 * Respects HOME environment variable for testability
 */
export function getGlobalConfigPath(): string {
  const home = process.env['HOME'] || process.env['USERPROFILE'] || homedir();
  return join(home, '.lcp', 'config.json');
}

/**
 * Find project-local config file by walking up the directory tree
 * Returns the path to .lcp/config.json if found, otherwise null
 */
export function findProjectLocalConfig(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (true) {
    const configPath = join(currentDir, '.lcp', 'config.json');
    if (existsSync(configPath)) {
      return configPath;
    }

    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Load config file from path with validation
 * Returns empty object if file doesn't exist or is invalid
 */
function loadConfigFile(path: string): CliContext {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const data = JSON.parse(content);

    // Validate the config data
    const result = safeValidateCliContext(data);
    if (result.success) {
      return result.data;
    }

    // If validation fails, log warning and return empty config
    console.warn(`Warning: Invalid config file at ${path}. Using empty config.`);
    return {};
  } catch (error) {
    // If file read or JSON parse fails, return empty config
    console.warn(`Warning: Failed to load config file at ${path}. ${(error as Error).message}`);
    return {};
  }
}

/**
 * Deep merge two config objects
 * Project-local values override global values
 * Arrays are replaced, not merged
 * Null values delete the key
 */
export function mergeConfigs(global: CliContext, local: CliContext): CliContext {
  const result: CliContext = { ...global };

  for (const key in local) {
    const localValue = local[key as keyof CliContext];

    if (localValue === undefined) {
      continue; // Skip undefined values
    }

    if (localValue === null) {
      // Null means delete the key
      delete result[key as keyof CliContext];
      continue;
    }

    // For primitive values and arrays, replace
    // At this point, localValue is not undefined or null
    // Both configs are already validated, so we can safely cast
    const typedKey = key as keyof CliContext;
    (result as Record<string, unknown>)[typedKey] = localValue;
  }

  return result;
}

/**
 * Load merged configuration from global and project-local files
 * Project-local overrides global
 * Returns merged CliContext
 */
export function loadConfig(): CliContext {
  // Load global config
  const globalPath = getGlobalConfigPath();
  const globalConfig = loadConfigFile(globalPath);

  // Find and load project-local config
  const projectLocalPath = findProjectLocalConfig();
  const projectLocalConfig = projectLocalPath ? loadConfigFile(projectLocalPath) : {};

  // Merge configurations (project-local overrides global)
  return mergeConfigs(globalConfig, projectLocalConfig);
}

/**
 * Load config and merge with command-line options
 * Command-line options have highest priority
 * If activeApp is set and account/team/moniker are not provided, use activeApp values
 */
export function loadConfigWithOptions(options: Partial<CliContext>): CliContext {
  const fileConfig = loadConfig();

  // Merge file config with options (options override file config)
  const merged = mergeConfigs(fileConfig, options);

  // If activeApp is set, use it to fill missing account/team/moniker
  if (merged.activeApp) {
    if (!merged.account) {
      merged.account = merged.activeApp.account;
    }
    if (!merged.team) {
      merged.team = merged.activeApp.team;
    }
    if (!merged.moniker) {
      merged.moniker = merged.activeApp.moniker;
    }
  }

  return merged;
}

/**
 * Check if global config file exists
 */
export function globalConfigExists(): boolean {
  return existsSync(getGlobalConfigPath());
}

/**
 * Check if project-local config file exists in current directory tree
 */
export function projectLocalConfigExists(): boolean {
  return findProjectLocalConfig() !== null;
}

/**
 * Get the path to the project-local config file if it exists
 */
export function getProjectLocalConfigPath(): string | null {
  return findProjectLocalConfig();
}

/**
 * Save config to project-local file (.lcp/config.json in current directory)
 * Creates the directory if it doesn't exist
 */
export function saveConfig(config: CliContext): void {
  const configDir = join(process.cwd(), '.lcp');
  const configPath = join(configDir, 'config.json');

  // Create directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Write config to file
  const content = JSON.stringify(config, null, 2);
  writeFileSync(configPath, content, 'utf-8');
}
