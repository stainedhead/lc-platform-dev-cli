/**
 * Configuration type definitions for the CLI
 */

/**
 * Provider types supported by the CLI
 */
export type ProviderName = 'aws' | 'azure' | 'mock';

/**
 * Configuration profile settings
 */
export interface ProfileConfig {
  provider?: ProviderName;
  region?: string;
  options?: Record<string, unknown>;
}

/**
 * Main CLI configuration structure
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
