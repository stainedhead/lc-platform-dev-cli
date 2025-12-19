/**
 * Output formatters for CLI responses
 */

import type { GlobalOptions } from '../cli/options.js';

/**
 * Format and output data based on global options
 */
export function formatOutput(data: unknown, options: GlobalOptions): void {
  if (options.quiet) {
    return;
  }

  if (options.json) {
    outputJson(data);
  } else {
    outputHuman(data);
  }
}

/**
 * Output data as JSON to stdout
 */
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output data in human-readable format to stdout
 */
export function outputHuman(data: unknown): void {
  if (data === null || data === undefined) {
    return;
  }

  if (typeof data === 'string') {
    console.log(data);
    return;
  }

  if (Array.isArray(data)) {
    outputArray(data);
    return;
  }

  if (typeof data === 'object') {
    outputObject(data as Record<string, unknown>);
    return;
  }

  console.log(String(data));
}

/**
 * Output an array in human-readable format
 */
function outputArray(data: unknown[]): void {
  if (data.length === 0) {
    console.log('(empty)');
    return;
  }

  // If array of objects, try to format as table
  if (typeof data[0] === 'object' && data[0] !== null) {
    const keys = Object.keys(data[0] as Record<string, unknown>);
    console.log(keys.join('\t'));
    console.log('-'.repeat(keys.length * 12));
    for (const item of data) {
      const values = keys.map((k) => String((item as Record<string, unknown>)[k] ?? ''));
      console.log(values.join('\t'));
    }
  } else {
    for (const item of data) {
      console.log(String(item));
    }
  }
}

/**
 * Output an object in human-readable format
 */
function outputObject(data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      console.log(`${key}:`);
      const nested = value as Record<string, unknown>;
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        console.log(`  ${nestedKey}: ${String(nestedValue)}`);
      }
    } else {
      console.log(`${key}: ${String(value)}`);
    }
  }
}

/**
 * Format a success message
 */
export function formatSuccess(message: string, options: GlobalOptions): void {
  if (options.quiet) {
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ success: true, message }));
  } else {
    console.log(`✓ ${message}`);
  }
}

/**
 * Format an error message to stderr
 */
export function formatError(message: string, options: GlobalOptions): void {
  if (options.json) {
    console.error(JSON.stringify({ success: false, error: message }));
  } else {
    console.error(`✗ ${message}`);
  }
}
