/**
 * Configuration type definitions for the CLI
 */

/**
 * Provider types supported by the CLI
 */
export type ProviderName = 'aws' | 'azure' | 'mock';

/**
 * CLI Context Configuration
 * Persistent configuration stored in ~/.lcp/config.json (global) and .lcp/config.json (project-local)
 * All fields are optional to allow partial configuration
 */
export interface CliContext {
  /** Cloud provider account identifier */
  account?: string;

  /** Team or organization identifier */
  team?: string;

  /** Application moniker (unique identifier) */
  moniker?: string;

  /** Cloud provider selection */
  provider?: ProviderName;

  /** Cloud provider region */
  region?: string;
}

/**
 * Configuration file locations
 */
export const CONFIG_PATHS = {
  GLOBAL: '~/.lcp/config.json',
  PROJECT_LOCAL: '.lcp/config.json',
} as const;

/**
 * Configuration profile settings (legacy - kept for backwards compatibility)
 */
export interface ProfileConfig {
  provider?: ProviderName;
  region?: string;
  options?: Record<string, unknown>;
}

/**
 * Main CLI configuration structure (legacy - kept for backwards compatibility)
 * Stored at ~/.lcp/config.json
 */
export interface CLIConfig {
  /** Default provider if not specified */
  defaultProvider?: ProviderName;

  /** Default region if not specified */
  defaultRegion?: string;

  /** Named configuration profiles */
  profiles?: Record<string, ProfileConfig>;

  /** Additional options passed to core library */
  options?: Record<string, unknown>;
}

/**
 * Resolved configuration after merging all sources
 */
export interface ResolvedConfig {
  provider: ProviderName;
  region: string;
  options: Record<string, unknown>;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ResolvedConfig = {
  provider: 'mock',
  region: 'us-east-1',
  options: {},
};
