/**
 * lcp context export command
 * Export manifest topology with TypeScript access patterns for AI agents
 */

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseManifest, DependencyType } from '../../../../../lc-platform-config/src/index.js';

/**
 * Find manifest file in current directory or specified path
 */
function findManifestPath(manifestPath?: string): string {
  if (manifestPath) {
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }
    return manifestPath;
  }

  // Look for lcp-manifest.yaml in current directory
  const defaultPath = join(process.cwd(), 'lcp-manifest.yaml');
  if (!existsSync(defaultPath)) {
    throw new Error(
      `No manifest file found. Expected ${defaultPath}\n\n` +
        'To create a manifest, use: lcp app init'
    );
  }

  return defaultPath;
}

/**
 * Map dependency type to runtime access pattern
 */
function getAccessPattern(moniker: string, type: string): string {
  switch (type) {
    case DependencyType.OBJECT_STORE:
      return `runtime.store('${moniker}')`;
    case DependencyType.QUEUE:
      return `runtime.queue('${moniker}')`;
    case DependencyType.SECRETS:
      return `runtime.secrets('${moniker}')`;
    case DependencyType.CONFIGURATION:
      return `runtime.config('${moniker}')`;
    case DependencyType.DATA_STORE:
      return `runtime.dataStore('${moniker}')`;
    case DependencyType.DOCUMENT_STORE:
      return `runtime.documentStore('${moniker}')`;
    case DependencyType.EVENT_BUS:
      return `runtime.eventBus('${moniker}')`;
    case DependencyType.NOTIFICATION:
      return `runtime.notifications('${moniker}')`;
    case DependencyType.CACHE:
      return `runtime.cache('${moniker}')`;
    case DependencyType.WEB_HOSTING:
      return `runtime.webHosting('${moniker}')`;
    case DependencyType.FUNCTION_HOSTING:
      return `runtime.functionHosting('${moniker}')`;
    case DependencyType.BATCH:
      return `runtime.batch('${moniker}')`;
    case DependencyType.AUTHENTICATION:
      return `runtime.auth('${moniker}')`;
    case DependencyType.CONTAINER_REPO:
      return `runtime.containerRepo('${moniker}')`;
    default:
      return `runtime.dependency('${moniker}')`;
  }
}

/**
 * Get code example for dependency type
 */
function getCodeExample(moniker: string, type: string): string {
  switch (type) {
    case DependencyType.OBJECT_STORE:
      return `// Upload a file\nawait runtime.store('${moniker}').put('file.txt', data);\n\n// Download a file\nconst data = await runtime.store('${moniker}').get('file.txt');`;

    case DependencyType.QUEUE:
      return `// Send a message\nawait runtime.queue('${moniker}').send({ orderId: '123' });\n\n// Receive messages\nconst messages = await runtime.queue('${moniker}').receive();`;

    case DependencyType.SECRETS:
      return `// Get a secret\nconst apiKey = await runtime.secrets('${moniker}').get('API_KEY');\n\n// Store a secret\nawait runtime.secrets('${moniker}').put('API_KEY', 'secret-value');`;

    case DependencyType.CONFIGURATION:
      return `// Get configuration\nconst config = await runtime.config('${moniker}').get('feature-flags');\n\n// Update configuration\nawait runtime.config('${moniker}').put('feature-flags', { enabled: true });`;

    case DependencyType.DATA_STORE:
      return `// Query data\nconst users = await runtime.dataStore('${moniker}').query({\n  table: 'users',\n  where: { active: true }\n});\n\n// Insert data\nawait runtime.dataStore('${moniker}').insert('users', { name: 'Alice' });`;

    case DependencyType.DOCUMENT_STORE:
      return `// Get document\nconst doc = await runtime.documentStore('${moniker}').get('doc-id');\n\n// Save document\nawait runtime.documentStore('${moniker}').put({ id: 'doc-id', data: {...} });`;

    case DependencyType.EVENT_BUS:
      return `// Publish event\nawait runtime.eventBus('${moniker}').publish('OrderCreated', { orderId: '123' });\n\n// Subscribe to events\nruntime.eventBus('${moniker}').subscribe('OrderCreated', async (event) => {\n  console.log('Order created:', event);\n});`;

    case DependencyType.NOTIFICATION:
      return `// Send notification\nawait runtime.notifications('${moniker}').send({\n  to: 'user@example.com',\n  subject: 'Hello',\n  body: 'Message content'\n});`;

    case DependencyType.CACHE:
      return `// Get from cache\nconst value = await runtime.cache('${moniker}').get('key');\n\n// Set in cache\nawait runtime.cache('${moniker}').set('key', 'value', { ttl: 3600 });`;

    case DependencyType.WEB_HOSTING:
      return `// Get hosting URL\nconst url = runtime.webHosting('${moniker}').getUrl();\n\n// Deploy content\nawait runtime.webHosting('${moniker}').deploy('./dist');`;

    case DependencyType.FUNCTION_HOSTING:
      return `// Invoke function\nconst result = await runtime.functionHosting('${moniker}').invoke('functionName', {\n  param1: 'value'\n});`;

    case DependencyType.BATCH:
      return `// Submit batch job\nconst jobId = await runtime.batch('${moniker}').submit({\n  command: 'process-data',\n  params: { file: 'data.csv' }\n});\n\n// Check job status\nconst status = await runtime.batch('${moniker}').getStatus(jobId);`;

    case DependencyType.AUTHENTICATION:
      return `// Verify token\nconst user = await runtime.auth('${moniker}').verifyToken(token);\n\n// Generate token\nconst token = await runtime.auth('${moniker}').generateToken(user);`;

    case DependencyType.CONTAINER_REPO:
      return `// Push image\nawait runtime.containerRepo('${moniker}').push('my-image:v1.0.0');\n\n// Pull image\nawait runtime.containerRepo('${moniker}').pull('my-image:v1.0.0');`;

    default:
      return `// Access dependency\nconst resource = runtime.dependency('${moniker}');`;
  }
}

export function createExportCommand(): Command {
  return new Command('export')
    .description('Export manifest topology with TypeScript access patterns')
    .option('--manifest <file>', 'Path to manifest file (default: ./lcp-manifest.yaml)')
    .addHelpText(
      'after',
      `
Examples:
  # Export context from current directory
  $ lcp context export

  # Export with specific manifest file
  $ lcp context export --manifest path/to/lcp-manifest.yaml

  # Use output for AI agent code generation
  $ lcp context export > .claude/project-context.json

Description:
  This command generates a machine-readable JSON export of your application's
  resource topology, including TypeScript access patterns and code examples.

  The output is designed for AI agent consumption (e.g., Claude, Copilot) to
  enable accurate code generation without cloud-specific knowledge.
`
    )
    .action(async function (this: Command) {
      const cmdOptions = this.optsWithGlobals<{
        manifest?: string;
        debug?: boolean;
      }>();

      try {
        // Find manifest file
        const manifestPath = findManifestPath(cmdOptions.manifest);

        if (cmdOptions.debug) {
          console.error(`Reading manifest from: ${manifestPath}`);
        }

        // Parse manifest
        const manifest = await parseManifest(manifestPath);

        // Build export structure
        const exportData = {
          metadata: {
            team: manifest.metadata.team,
            moniker: manifest.metadata.moniker,
            environment: manifest.metadata.environment,
            provider: manifest.provider.type,
            region: manifest.provider.region,
          },
          dependencies: {} as Record<
            string,
            {
              type: string;
              accessPattern: string;
              example: string;
              config?: Record<string, unknown>;
            }
          >,
        };

        // Add dependencies with access patterns and examples
        for (const [moniker, dep] of Object.entries(manifest.dependencies || {})) {
          exportData.dependencies[moniker] = {
            type: dep.type,
            accessPattern: getAccessPattern(moniker, dep.type),
            example: getCodeExample(moniker, dep.type),
          };

          // Include config if present
          if (dep.config && Object.keys(dep.config).length > 0) {
            exportData.dependencies[moniker]!.config = dep.config;
          }
        }

        // Always output as JSON (machine-readable format)
        console.log(JSON.stringify(exportData, null, 2));
      } catch (error) {
        if (cmdOptions.debug) {
          console.error('Debug: Full error:', error);
        }
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
