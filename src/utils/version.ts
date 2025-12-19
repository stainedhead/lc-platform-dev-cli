/**
 * Version utilities
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the CLI version from package.json
 */
export function getVersion(): string {
  try {
    // Get the directory of the current module
    const currentDir = dirname(fileURLToPath(import.meta.url));
    // Navigate up to find package.json (from dist/utils or src/utils)
    const packagePath = join(currentDir, '..', '..', 'package.json');

    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8')) as { version: string };
    return packageJson.version;
  } catch {
    return '0.0.0-unknown';
  }
}
