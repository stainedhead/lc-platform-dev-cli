/**
 * lcp app validate command
 * Validate application configuration without making changes
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Basic config validation
 * TODO: Replace with actual schema validation from core library
 */
function validateAppConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!config['name']) {
    errors.push('Missing required field: name');
  }

  // Validate field types
  if (config['name'] && typeof config['name'] !== 'string') {
    errors.push('Field "name" must be a string');
  }

  if (config['description'] && typeof config['description'] !== 'string') {
    errors.push('Field "description" must be a string');
  }

  if (config['environment'] && typeof config['environment'] !== 'object') {
    errors.push('Field "environment" must be an object');
  }

  // Validate environment variables are strings
  if (
    config['environment'] &&
    typeof config['environment'] === 'object' &&
    !Array.isArray(config['environment'])
  ) {
    for (const [key, value] of Object.entries(config['environment'] as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        errors.push(`Environment variable "${key}" must be a string, got ${typeof value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate application configuration without making changes')
    .requiredOption('--config <file>', 'Path to application configuration file (JSON)')
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        config: string;
        json?: boolean;
        quiet?: boolean;
        debug?: boolean;
      }>();

      try {
        // Load config file
        if (!existsSync(cmdOptions.config)) {
          console.error(`Error: Config file not found: ${cmdOptions.config}`);
          process.exit(1);
        }

        let appConfig: Record<string, unknown>;
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

        // Validate config (T036, T042)
        const validation = validateAppConfig(appConfig);

        if (cmdOptions.json) {
          console.log(
            JSON.stringify(
              {
                valid: validation.valid,
                errors: validation.errors,
                file: cmdOptions.config,
              },
              null,
              2
            )
          );
        } else {
          if (validation.valid) {
            if (!cmdOptions.quiet) {
              console.log('✓ Configuration is valid');
              console.log(`  File: ${cmdOptions.config}`);
            }
          } else {
            console.error('✗ Configuration validation failed:');
            console.error('');
            validation.errors.forEach((error) => {
              console.error(`  - ${error}`);
            });
            console.error('');
            console.error(`Fix the errors in ${cmdOptions.config} and try again.`);
            process.exit(1);
          }
        }

        // Exit with appropriate code
        process.exit(validation.valid ? 0 : 1);
      } catch (error) {
        if (cmdOptions.debug) {
          console.error('Debug: Full error:', error);
        }
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
