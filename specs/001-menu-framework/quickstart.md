# Quickstart: Context Management and Core Commands

**Feature**: 001-menu-framework
**Target Audience**: Developers using the lcp CLI
**Estimated Time**: 5 minutes

## Prerequisites

- Bun 1.0+ installed
- `lcp` CLI installed and available in PATH
- Cloud provider credentials configured (if deploying to real cloud)

## Quick Setup

### 1. Configure Your Context (30 seconds)

Set up default values to avoid repetitive flag usage:

```bash
# Set global defaults for all projects
lcp context write --account myaccount --team myteam --provider aws --region us-east-1

# Verify configuration
lcp context read
```

Expected output:
```
account:  myaccount
team:     myteam
provider: aws
region:   us-east-1
```

### 2. Initialize an Application (1 minute)

Create your first application:

```bash
# Using context defaults
lcp app init --moniker my-first-app

# Or with explicit flags (overrides context)
lcp app init --account other --team other-team --moniker my-app
```

### 3. Manage Versions (2 minutes)

Add and manage application versions:

```bash
# Add a version with configuration
cat > app-config.json <<EOF
{
  "name": "my-first-app",
  "description": "Initial version",
  "environment": {
    "LOG_LEVEL": "info"
  }
}
EOF

lcp version add --ver v1.0.0 --config app-config.json

# Read version configuration
lcp version read --ver v1.0.0
```

### 4. Deploy a Version (1 minute)

Deploy your version:

```bash
# Deploy with all components (default)
lcp version deploy --ver v1.0.0

# Or deploy only the application code
lcp version deploy --ver v1.0.0 --app-only

# Or use platform tooling for async deployment
lcp version deploy --ver v1.0.0 --platform-tooling
```

## Common Workflows

### Per-Project Configuration

Override global settings for a specific project:

```bash
# In your project directory
lcp context write --local --moniker project-specific-app

# This creates .lcp/config.json with project-local overrides
```

### Multi-Version Workflow

Manage multiple versions:

```bash
# Add multiple versions
lcp version add --ver v1.0.0 --config v1-config.json
lcp version add --ver v1.1.0 --config v1.1-config.json
lcp version add --ver v2.0.0 --config v2-config.json

# Deploy v1.1.0
lcp version deploy --ver v1.1.0

# Rollback to v1.0.0
lcp version deploy --ver v1.0.0
```

### Validate Before Deploying

Test configuration changes safely:

```bash
# Validate config file without making changes
lcp app validate --config new-config.json

# If valid, apply the update
lcp app update --config new-config.json

# Deploy with dry-run first
lcp version deploy --ver v1.2.0 --dry-run
lcp version deploy --ver v1.2.0
```

## Troubleshooting

### Missing Context Values

**Error**: `Missing required context: account. Run 'lcp context write --account <value>' or use --account flag`

**Solution**: Either set context values or provide flags explicitly:

```bash
# Option 1: Set context
lcp context write --account myaccount

# Option 2: Use flags
lcp app init --account myaccount --team myteam --moniker myapp
```

### Corrupted Config File

**Error**: `Failed to parse config file: Invalid JSON`

**Solution**: Manually inspect and fix the config file:

```bash
# Check global config
cat ~/.lcp/config.json

# Check project-local config
cat .lcp/config.json

# Or clear and recreate
lcp context clear
lcp context write --account myaccount --team myteam
```

### Application Already Exists

**Error**: `Application already exists: myaccount/myteam/myapp`

**Solution**: Use a different moniker or update the existing application:

```bash
# Option 1: Different moniker
lcp app init --moniker myapp-v2

# Option 2: Update existing
lcp app update --config new-config.json
```

## Next Steps

- **Read Application Configuration**: `lcp app read --json` to see current state
- **List Versions**: Use platform queries (via core library) to see all versions
- **Monitor Deployments**: Use `--verbose` flag for detailed progress
- **CI/CD Integration**: Use `--json` output for scripting

## Examples by Use Case

### Local Development

```bash
# Set up local mock provider
lcp context write --provider mock --moniker dev-app
lcp app init
lcp version add --ver dev --config dev-config.json
lcp version deploy --ver dev
```

### Staging Environment

```bash
# Project-specific staging config
cd my-project
lcp context write --local --account staging-acct --region us-east-1
lcp app init --config staging-config.json
lcp version add --ver v1.0.0-rc1 --config v1.0.0-rc1.json
lcp version deploy --ver v1.0.0-rc1
```

### Production Deployment

```bash
# Use platform tooling for production
lcp context write --account prod-acct --team production
lcp app init --config prod-config.json
lcp version add --ver v1.0.0 --config v1.0.0.json
lcp version deploy --ver v1.0.0 --platform-tooling
```

## Command Reference

For detailed help on any command:

```bash
lcp --help                  # List all commands
lcp context --help          # Context command group help
lcp app --help              # App command group help
lcp version --help          # Version command group help
lcp version deploy --help   # Specific command help
```

## Tips

- Use `--json` flag for machine-readable output in scripts
- Use `--verbose` to see what the CLI is doing
- Use `--dry-run` before destructive operations
- Store config files in version control (except sensitive values)
- Use project-local config (`.lcp/config.json`) for team-shared settings
