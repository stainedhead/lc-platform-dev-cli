/**
 * Configuration writer with atomic write and merge-on-write behavior
 */

import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { CliContext } from './types.js';
import { safeValidateCliContext } from './schema.js';
import { getGlobalConfigPath, mergeConfigs } from './loader.js';

/**
 * Atomic file write using temp file + rename pattern
 * This ensures the config file is never in a partially written state
 */
function atomicWrite(filePath: string, content: string): void {
  const dir = dirname(filePath);
  const tempPath = join(dir, `.${Date.now()}.tmp`);

  try {
    // Ensure directory exists
    mkdirSync(dir, { recursive: true });

    // Write to temp file
    writeFileSync(tempPath, content, 'utf-8');

    // Atomically rename temp file to target file
    renameSync(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(`Failed to write config file: ${(error as Error).message}`);
  }
}

/**
 * Write configuration to file with merge behavior
 * If file exists, merges new values with existing values
 * If file doesn't exist, creates new file with provided values
 *
 * @param filePath - Path to config file
 * @param updates - Partial config to write/merge
 * @param merge - If true, merge with existing config. If false, overwrite entirely
 */
export function writeConfig(filePath: string, updates: Partial<CliContext>, merge = true): void {
  // Validate updates
  const validationResult = safeValidateCliContext(updates);
  if (!validationResult.success) {
    const errors = validationResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }

  let finalConfig: CliContext;

  if (merge && existsSync(filePath)) {
    // Load existing config
    try {
      const existingContent = readFileSync(filePath, 'utf-8');
      const existingData = JSON.parse(existingContent);
      const existingConfig = safeValidateCliContext(existingData);

      if (existingConfig.success) {
        // Merge updates with existing config
        finalConfig = mergeConfigs(existingConfig.data, updates);
      } else {
        // If existing config is invalid, replace with updates
        console.warn(
          `Warning: Existing config at ${filePath} is invalid. Replacing with new config.`
        );
        finalConfig = updates;
      }
    } catch {
      // If can't read existing file, use updates only
      console.warn(`Warning: Failed to read existing config at ${filePath}. Creating new config.`);
      finalConfig = updates;
    }
  } else {
    // No merge or file doesn't exist - use updates directly
    finalConfig = updates;
  }

  // Write config atomically
  const content = JSON.stringify(finalConfig, null, 2) + '\n';
  atomicWrite(filePath, content);
}

/**
 * Write to global config file
 * Merges with existing config by default
 */
export function writeGlobalConfig(updates: Partial<CliContext>, merge = true): void {
  const globalPath = getGlobalConfigPath();
  writeConfig(globalPath, updates, merge);
}

/**
 * Write to project-local config file
 * Merges with existing config by default
 */
export function writeProjectLocalConfig(updates: Partial<CliContext>, merge = true): void {
  const projectPath = join(process.cwd(), '.lcp', 'config.json');
  writeConfig(projectPath, updates, merge);
}

/**
 * Clear (delete) configuration file
 * @param filePath - Path to config file to clear
 */
export function clearConfig(filePath: string): void {
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch (error) {
      throw new Error(`Failed to clear config file: ${(error as Error).message}`);
    }
  }
}

/**
 * Clear global configuration file
 */
export function clearGlobalConfig(): void {
  const globalPath = getGlobalConfigPath();
  clearConfig(globalPath);
}

/**
 * Clear project-local configuration file
 */
export function clearProjectLocalConfig(): void {
  const projectPath = join(process.cwd(), '.lcp', 'config.json');
  clearConfig(projectPath);
}
