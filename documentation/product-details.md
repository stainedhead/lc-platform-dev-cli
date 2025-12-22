# LC Platform Dev CLI - Product Details

**Last Updated**: 2025-12-22

## Table of Contents

- [Command Reference](#command-reference)
- [Configuration System](#configuration-system)
- [Workflow Patterns](#workflow-patterns)
- [Error Handling](#error-handling)
- [Output Formats](#output-formats)
- [Integration Patterns](#integration-patterns)

## Command Reference

### Global Options

Available on all commands:

```
--account <account>    Cloud provider account identifier
--team <team>          Team or organization identifier
--moniker <moniker>    Application moniker (unique identifier)
--json                 Output in JSON format
--quiet                Suppress non-essential output
--debug                Show debug information
--dry-run              Preview changes without executing
-h, --help             Display help for command
```

### Context Commands

Manage persistent configuration to reduce repetitive flag usage.

#### `lcp context read`

Display current context configuration (merged from global and project-local).

```bash
# Display as table
lcp context read

# Output as JSON
lcp context read --json
```

**Output Example**:
```
Current context configuration:

  account: my-account
  team   : platform-team
  moniker: api-service
  provider: aws
  region : us-east-1
```

#### `lcp context write`

Store context values globally or per-project.

```bash
# Write to global config (~/.lcp/config.json)
lcp context write --account prod-account --team platform

# Write to project-local config (.lcp/config.json)
lcp context write --local --moniker my-app

# Set all common values
lcp context write \
  --account my-account \
  --team my-team \
  --moniker my-app \
  --provider aws \
  --region us-east-1
```

**Features**:
- Merge behavior: Updates only specified fields, preserves others
- Atomic writes: Temp file + rename for safe concurrent access
- Validation: Ensures values meet format requirements

#### `lcp context clear`

Remove context configuration.

```bash
# Clear global config
lcp context clear

# Clear project-local config
lcp context clear --local
```

### Application Commands

Manage application lifecycle and configuration.

#### `lcp app init`

Initialize a new application.

```bash
# Using context defaults
lcp app init

# With explicit values (overrides context)
lcp app init --account prod --team platform --moniker api-service

# With configuration file
lcp app init --config app-config.json
```

**Requirements**:
- Context must provide: account, team, moniker
- Or all three must be specified via flags

**Error Handling**:
- Duplicate detection: Prevents re-initializing existing applications
- Missing context: Lists required fields and how to provide them

#### `lcp app read`

Display current application configuration.

```bash
# Human-readable format
lcp app read

# JSON output
lcp app read --json
```

**Output Example**:
```
Application configuration:

  id        : app-my-service
  moniker   : my-service
  account   : prod-account
  team      : platform
  provider  : aws
  region    : us-east-1
  status    : active
  createdAt : 2025-12-22T10:30:00.000Z
```

#### `lcp app validate`

Validate application configuration without making changes.

```bash
lcp app validate --config new-config.json
```

**Validation Rules**:
- Required fields: `name`
- Field types: All fields must match expected types
- Environment variables: Must all be strings
- No state changes: Read-only operation

**Output Example**:
```
✓ Configuration is valid

Validated fields:
  - name: my-app
  - description: Production application
  - environment: 3 variables
```

**Error Example**:
```
✗ Configuration is invalid

Errors:
  - Missing required field: name
  - Environment variable "PORT" must be a string, got number
```

#### `lcp app update`

Update application configuration with validation.

```bash
lcp app update --config updated-config.json
```

**Features**:
- Validates before applying (same rules as `validate`)
- Atomic update: All-or-nothing operation
- Version tracking: Updates `updatedAt` timestamp

### Version Commands

Manage application versions and deployments.

#### `lcp version add`

Add a new version to an application.

```bash
lcp version add --ver v1.0.0 --config version-config.json
```

**Configuration File Format**:
```json
{
  "name": "my-app-v1.0.0",
  "description": "Production release",
  "environment": {
    "LOG_LEVEL": "info",
    "PORT": "8080",
    "NODE_ENV": "production"
  },
  "resources": {
    "compute": {
      "memory": "2Gi",
      "cpu": "1000m"
    }
  }
}
```

**Features**:
- Duplicate detection: Prevents overwriting existing versions
- Validation: Ensures config file is valid JSON
- Helpful errors: Suggests using `update` if version exists

**Note**: Uses `--ver` flag (not `--version`) to avoid conflicts with Commander.js built-in version flag.

#### `lcp version read`

Read and display version configuration.

```bash
# Human-readable output
lcp version read --ver v1.0.0

# JSON output
lcp version read --ver v2.1.0 --json
```

**Output Example**:
```
Version: v1.0.0
Created: 2025-12-22T10:00:00.000Z
Updated: 2025-12-22T10:00:00.000Z
Deployed: Yes

Configuration:
{
  "name": "my-app-v1.0.0",
  "description": "Production release",
  ...
}
```

#### `lcp version deploy`

Deploy a specific version with flexible scope and mode options.

```bash
# Deploy with default scope (all)
lcp version deploy --ver v1.0.0

# Deploy only application code
lcp version deploy --ver v1.0.0 --app-only

# Deploy only dependencies
lcp version deploy --ver v1.0.0 --dependencies-only

# Platform-tooling mode (async with event tracking)
lcp version deploy --ver v2.0.0 --platform-tooling

# Dry-run to preview deployment
lcp version deploy --ver v1.5.0 --dry-run
```

**Deployment Scopes**:
- `--all` (default): Deploy application code and dependencies
- `--app-only`: Deploy only application code, skip dependencies
- `--dependencies-only`: Deploy only dependencies, skip application

**Scope Mutual Exclusivity**: Only one scope flag can be specified at a time.

**Deployment Modes**:

1. **Local Mode (default)**:
   - Synchronous deployment
   - Progress feedback with multi-step simulation
   - Immediate completion

2. **Platform-Tooling Mode** (`--platform-tooling`):
   - Asynchronous deployment via platform
   - Returns event ID for tracking
   - Suitable for production deployments

**Dry-Run Mode** (`--dry-run`):
- Previews deployment without executing
- Shows: version, scope, mode, application details
- No state changes

**State Management**:
- Single active deployment: Only one version marked as deployed at a time
- Automatic state transitions: Previous version unmarked on new deployment
- Deployment metadata: Tracks timestamp and scope

**Output Examples**:

Local mode:
```
Deploying version v1.0.0...

  Validating version configuration...
  Deploying all...
  Updating routing configuration...
  Running health checks...
  Deployment complete...

✓ Deployment successful
  Version: v1.0.0
  Application: my-service
  Scope: all
```

Platform-tooling mode:
```
✓ Deployment successful
  Version: v2.0.0
  Application: my-service
  Scope: all
  Event ID: event-1766428916770

Track deployment status with: lcp deployment status --event-id event-1766428916770
```

JSON output:
```json
{
  "id": "deployment-1766428921023",
  "version": "v1.0.0",
  "moniker": "my-service",
  "account": "prod-account",
  "team": "platform",
  "deployed": true,
  "scope": "all",
  "mode": "local"
}
```

## Configuration System

### Configuration Precedence

Configuration values are resolved in this order (highest to lowest priority):

1. **Command-line flags** (highest priority)
2. **Project-local config** (`.lcp/config.json`)
3. **Global config** (`~/.lcp/config.json`)
4. **Built-in defaults** (lowest priority)

### Configuration File Format

```json
{
  "account": "my-account",
  "team": "my-team",
  "moniker": "my-app",
  "provider": "aws",
  "region": "us-east-1"
}
```

### File Locations

- **Global**: `~/.lcp/config.json` (applies to all projects)
- **Project-Local**: `.lcp/config.json` (overrides global for specific project)

### Merge Behavior

When both global and project-local configs exist:
- Project-local values override global values
- Unspecified fields use global values
- Result is merged view of both configs

## Workflow Patterns

### Developer Onboarding

```bash
# 1. Set up global defaults (one-time)
lcp context write --account my-account --team my-team

# 2. Initialize application
lcp app init --moniker my-service

# 3. Add first version
lcp version add --ver v1.0.0 --config v1.0.0.json

# 4. Deploy
lcp version deploy --ver v1.0.0
```

### Multi-Environment Strategy

```bash
# Development (project-local)
cd ~/projects/my-app
lcp context write --local --account dev-account --moniker dev-app

# Staging (project-local)
cd ~/projects/my-app-staging
lcp context write --local --account staging-account --moniker staging-app

# Production (explicit flags for safety)
lcp app init --account prod-account --team production --moniker prod-app
```

### Version Rollback

```bash
# Current: v2.0.0 deployed
lcp version read --ver v2.0.0
# Deployed: Yes

# Rollback to v1.0.0
lcp version deploy --ver v1.0.0

# Verify rollback
lcp version read --ver v1.0.0
# Deployed: Yes

lcp version read --ver v2.0.0
# Deployed: No
```

### CI/CD Integration

```bash
#!/bin/bash
set -e

# Deploy using JSON output for parsing
RESULT=$(lcp version deploy \
  --ver "${VERSION}" \
  --account "${DEPLOY_ACCOUNT}" \
  --team "${DEPLOY_TEAM}" \
  --moniker "${APP_NAME}" \
  --json \
  --quiet)

DEPLOYED=$(echo "$RESULT" | jq -r '.deployed')
EVENT_ID=$(echo "$RESULT" | jq -r '.eventId // empty')

if [ "$DEPLOYED" != "true" ]; then
  echo "Deployment failed"
  exit 1
fi

if [ -n "$EVENT_ID" ]; then
  echo "Tracking deployment: $EVENT_ID"
  # Monitor deployment status...
fi
```

## Error Handling

### Missing Context Values

**Error**:
```
Error: Missing required context values: account, team, moniker.

To fix this, either:
1. Set context values: lcp context write --account <value> --team <value> --moniker <value>
2. Or provide them as command flags: --account <value> --team <value> --moniker <value>
```

**Resolution**:
- Option 1: Set context globally or locally
- Option 2: Provide flags on every command

### Version Not Found

**Error**:
```
Error: Version not found: v99.9.9

Available versions: v1.0.0, v2.0.0
To add a new version, use: lcp version add --ver v99.9.9 --config <file>
```

**Features**:
- Lists available versions
- Provides exact command to fix

### Configuration Validation

**Error**:
```
✗ Configuration is invalid

Errors:
  - Missing required field: name
  - Field "description" must be a string
  - Environment variable "PORT" must be a string, got number
```

**Features**:
- Field-level error messages
- Type validation
- All errors shown at once (not fail-fast)

## Output Formats

### Human-Readable (Default)

Optimized for terminal viewing with clear formatting:

```
✓ Deployment successful
  Version: v1.0.0
  Application: my-service
  Scope: all
```

### JSON Format (`--json`)

Machine-readable for scripting:

```json
{
  "id": "deployment-123",
  "version": "v1.0.0",
  "deployed": true,
  "scope": "all"
}
```

### Quiet Mode (`--quiet`)

Minimal output, suitable for scripts where only errors matter:

```bash
lcp version deploy --ver v1.0.0 --quiet
# No output on success, errors go to stderr
```

## Integration Patterns

### GitHub Actions

```yaml
- name: Deploy to Production
  run: |
    lcp version deploy \
      --ver ${{ github.event.release.tag_name }} \
      --account ${{ secrets.PROD_ACCOUNT }} \
      --team production \
      --moniker ${{ secrets.APP_NAME }} \
      --json > deployment.json

    cat deployment.json | jq '.'
```

### Pre-Deployment Validation

```bash
# Validate configuration
lcp app validate --config new-config.json || exit 1

# Dry-run deployment
lcp version deploy --ver v2.0.0 --dry-run

# Actual deployment
lcp version deploy --ver v2.0.0
```

### Multi-Stage Pipeline

```bash
# Stage 1: Add version
lcp version add --ver "${CI_COMMIT_TAG}" --config version.json

# Stage 2: Deploy to staging
lcp version deploy --ver "${CI_COMMIT_TAG}" \
  --account staging-account \
  --quiet

# Stage 3: Validate deployment
# (via core library integration)

# Stage 4: Deploy to production
lcp version deploy --ver "${CI_COMMIT_TAG}" \
  --account prod-account \
  --platform-tooling
```
