/**
 * Configuration loader
 *
 * Loads and merges configuration from multiple sources:
 * 1. Built-in defaults
 * 2. Config file (~/.lcp/config.json)
 * 3. Environment variables
 * 4. Command-line flags
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { GlobalOptions } from '../cli/options.js';
import { type CLIConfig, type ResolvedConfig, type ProviderName, DEFAULT_CONFIG } from './types.js';

const CONFIG_DIR = join(homedir(), '.lcp');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Load configuration from file
 */
function loadConfigFile(path: string = CONFIG_FILE): CLIConfig {
  const configPath = process.env['LCP_CONFIG_PATH'] ?? path;

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as CLIConfig;
  } catch {
    // If config file is invalid, return empty config
    return {};
  }
}

/**
 * Get configuration from environment variables
 */
function getEnvConfig(): Partial<ResolvedConfig> {
  const config: Partial<ResolvedConfig> = {};

  const provider = process.env['LCP_PROVIDER'];
  if (provider && isValidProvider(provider)) {
    config.provider = provider;
  }

  const region = process.env['LCP_REGION'];
  if (region) {
    config.region = region;
  }

  return config;
}

/**
 * Validate provider name
 */
function isValidProvider(provider: string): provider is ProviderName {
  return ['aws', 'azure', 'mock'].includes(provider);
}

/**
 * Get resolved configuration by merging all sources
 *
 * Priority (highest to lowest):
 * 1. Command-line options
 * 2. Environment variables
 * 3. Profile settings from config file
 * 4. Default profile settings
 * 5. Built-in defaults
 */
export function getConfig(options?: GlobalOptions): ResolvedConfig {
  // Start with defaults
  const config: ResolvedConfig = { ...DEFAULT_CONFIG };

  // Load config file
  const fileConfig = loadConfigFile();

  // Apply default settings from file
  if (fileConfig.defaultProvider && isValidProvider(fileConfig.defaultProvider)) {
    config.provider = fileConfig.defaultProvider;
  }
  if (fileConfig.defaultRegion) {
    config.region = fileConfig.defaultRegion;
  }
  if (fileConfig.options) {
    config.options = { ...config.options, ...fileConfig.options };
  }

  // Apply profile settings if specified
  const profileName = options?.profile ?? process.env['LCP_PROFILE'];
  if (profileName && fileConfig.profiles?.[profileName]) {
    const profile = fileConfig.profiles[profileName];
    if (profile.provider && isValidProvider(profile.provider)) {
      config.provider = profile.provider;
    }
    if (profile.region) {
      config.region = profile.region;
    }
    if (profile.options) {
      config.options = { ...config.options, ...profile.options };
    }
  }

  // Apply environment variables
  const envConfig = getEnvConfig();
  if (envConfig.provider) {
    config.provider = envConfig.provider;
  }
  if (envConfig.region) {
    config.region = envConfig.region;
  }

  // Apply command-line options (highest priority)
  if (options?.provider && isValidProvider(options.provider)) {
    config.provider = options.provider;
  }
  if (options?.region) {
    config.region = options.region;
  }

  return config;
}

/**
 * Get the configuration file path
 */
export function getConfigPath(): string {
  return process.env['LCP_CONFIG_PATH'] ?? CONFIG_FILE;
}

/**
 * Check if configuration file exists
 */
export function configFileExists(): boolean {
  return existsSync(getConfigPath());
}
