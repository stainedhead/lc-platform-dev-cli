# Data Model: Context Management and Core Commands

**Feature**: 001-menu-framework
**Date**: 2025-12-22

## Overview

This feature introduces persistent configuration storage and application/version lifecycle management. The data model consists of local JSON files for CLI context and platform-managed entities for applications and versions.

---

## Entities

### 1. CLI Context (Local Storage)

**Storage Location**:
- Global: `~/.lcp/config.json`
- Project-local: `.lcp/config.json` (nearest parent directory)

**Purpose**: Store default values for CLI flags to reduce repetitive flag usage

**Schema**:

```typescript
interface CliContext {
  account?: string;      // Cloud provider account identifier
  team?: string;         // Team/organization identifier
  moniker?: string;      // Application moniker (unique name)
  provider?: string;     // Cloud provider (aws, azure, mock)
  region?: string;       // Cloud region
}
```

**Validation Rules**:
- All fields are optional (allows partial configuration)
- `provider` must be one of: "aws", "azure", "mock" (if present)
- `region` format depends on provider (validated by core library)
- `account`, `team`, `moniker` are free-form strings

**Relationships**:
- Context values flow into Application identification (account + team + moniker)
- Context provider/region flow into core library configuration

**Lifecycle**:
1. **Creation**: `lcp context write` creates file if doesn't exist
2. **Update**: `lcp context write` merges values (partial updates)
3. **Read**: `lcp context read` displays merged global + project-local values
4. **Deletion**: `lcp context clear` removes file
5. **Loading**: Automatic on every CLI invocation, project-local overrides global

**State Transitions**: N/A (simple CRUD, no state machine)

---

### 2. Application (Platform-Managed)

**Storage Location**: Platform storage (via core library)

**Purpose**: Represents a deployed application with configuration

**Identity**: Composite key of (account, team, moniker)

**Schema**:

```typescript
interface Application {
  account: string;       // Cloud provider account
  team: string;          // Team/organization name
  moniker: string;       // Application unique identifier
  configuration: object; // Application-specific configuration (schema TBD by platform)
  createdAt: Date;       // Creation timestamp
  updatedAt: Date;       // Last update timestamp
}
```

**Validation Rules**:
- `account`, `team`, `moniker` are required (from context or flags)
- Composite key (account, team, moniker) must be unique
- `configuration` must validate against platform schema (FR-015)
- Cannot re-initialize existing application (FR-010, acceptance scenario 3)

**Relationships**:
- Has many Versions (1:N relationship)
- Identified by CliContext values

**Lifecycle**:
1. **Init**: `lcp app init` creates application with optional config file
2. **Read**: `lcp app read` retrieves current configuration
3. **Validate**: `lcp app validate --config <file>` checks config without modifying
4. **Update**: `lcp app update --config <file>` applies validated configuration
5. **Implicit**: Applications are not explicitly deleted (platform lifecycle)

**State Transitions**: N/A (configuration updates don't change application state)

---

### 3. Version (Platform-Managed)

**Storage Location**: Platform storage (via core library)

**Purpose**: Represents a specific version of an application with its own configuration and optional cached file

**Identity**: Composite key of (account, team, moniker, version)

**Schema**:

```typescript
interface Version {
  account: string;           // From application identity
  team: string;              // From application identity
  moniker: string;           // From application identity
  version: string;           // Version identifier (e.g., "v1.0.0")
  configuration: object;     // Version-specific configuration
  cachedFile?: {             // Optional cached file for deployment
    path: string;            // Platform storage path
    uploadedAt: Date;        // Upload timestamp
    size: number;            // File size in bytes
  };
  createdAt: Date;           // Creation timestamp
  updatedAt: Date;           // Last update timestamp
  isDeployed: boolean;       // Whether this version is currently active
}
```

**Validation Rules**:
- `account`, `team`, `moniker`, `version` are required
- Composite key must be unique
- `version` is free-form string (semantic versioning recommended but not enforced)
- `configuration` must validate against platform schema
- Only one cached file per version (replace on subsequent cache operations) (FR-021b)
- Only one version can have `isDeployed: true` per application at a time

**Relationships**:
- Belongs to Application (N:1 relationship via account/team/moniker)
- Has optional CachedFile (1:0..1 relationship)

**Lifecycle**:
1. **Add**: `lcp version add --version <v> --config <file>` creates version
2. **Read**: `lcp version read --version <v>` retrieves version config
3. **Update**: `lcp version update --version <v> --config <file>` modifies config
4. **Cache**: `lcp version cache --version <v> --file <path>` uploads file (replaces previous)
5. **Deploy**: `lcp version deploy --version <v>` activates version (sets isDeployed=true)
6. **Delete**: `lcp version delete --version <v>` removes version and cached file

**State Transitions**:

```
[Not Deployed] --deploy--> [Deployed]
[Deployed] --deploy other version--> [Not Deployed]
```

**Constraints**:
- Cannot delete deployed version without deploying another first
- Cached file is optional (deployment may work without cached file depending on platform)

---

### 4. Deployment (Ephemeral Operation)

**Storage Location**: Not persisted (operation state only)

**Purpose**: Represents the process of activating a specific version

**Schema**:

```typescript
interface DeploymentOperation {
  version: string;           // Target version
  scope: 'all' | 'app-only' | 'dependencies-only'; // Deployment scope
  mode: 'local' | 'platform-tooling'; // Execution mode
  startedAt: Date;           // Operation start time
  status: 'in-progress' | 'succeeded' | 'failed'; // Current status
  progress?: number;         // Progress percentage (0-100, local mode only)
  logs?: string[];           // Deployment logs (local mode only)
  eventId?: string;          // Platform event ID (platform mode only)
}
```

**Validation Rules**:
- Exactly one of `all`, `app-only`, `dependencies-only` must be true (FR-029)
- `mode` defaults to 'local' unless `--platform-tooling` specified
- Concurrent deployments are allowed (last-write-wins) but warned (FR-033a, FR-033b)

**Relationships**:
- Targets a Version (N:1 operation to version)
- Updates Version.isDeployed on success

**Lifecycle**:
1. **Initiate**: `lcp version deploy` starts deployment
2. **Progress**: Local mode shows real-time feedback, platform mode returns event ID
3. **Complete**: Version marked as deployed, previous deployed version unmarked
4. **Conflict**: Warning displayed if concurrent deployment detected

**State Transitions**:

```
[in-progress] --success--> [succeeded]
[in-progress] --error--> [failed]
```

---

## Data Flow

### Context Loading (Every CLI Invocation)

```
1. Check for project-local config (.lcp/config.json) in current dir and parents
2. Load global config (~/.lcp/config.json)
3. Merge: project-local overrides global (FR-004c)
4. Override: command-line flags override merged config (FR-003)
5. Validate: ensure required values present for command (FR-038)
```

### Application Initialization

```
1. Load context (account, team, moniker)
2. Optional: load config file (--config flag)
3. Validate config against schema
4. Call core library to create application
5. Return success/error with exit code
```

### Version Deployment

```
1. Load context to identify application
2. Resolve version from --version flag
3. Check if version exists
4. Determine scope (--app-only, --dependencies-only, --all)
5. Determine mode (--platform-tooling or default local)
6. If local: Execute deployment with progress feedback
7. If platform: Send event to platform, return event ID
8. On success: Mark version as deployed, unmark previous
9. Check for concurrent deployments: warn if detected (FR-033b)
```

---

## Storage Considerations

**Local Files** (CliContext):
- UTF-8 JSON format
- Atomic writes (temp file + rename pattern)
- Graceful degradation on permission errors
- No locking needed (single-user, merge semantics)

**Platform Storage** (Application, Version):
- Managed by `@stainedhead/lc-platform-dev-accelerators` core library
- Abstracted behind platform interfaces
- No direct storage access from CLI code

**Cached Files**:
- Uploaded via core library interfaces
- Platform-specific storage (S3, Azure Blob, etc.)
- CLI only provides file path, core library handles upload

---

## Volume Estimates

- **CLI Contexts**: 1-10 per developer (1 global, 0-9 projects)
- **Applications**: 1-100 per team
- **Versions per Application**: 1-50 active versions
- **Config File Size**: 1-10 KB typical
- **Cached Files**: 1 MB - 500 MB typical (application bundles)

---

## Migration Considerations

**None required** - This is a greenfield feature. No existing data to migrate.

**Future Compatibility**:
- Config file format uses optional fields (backwards compatible additions)
- Version history allows multiple versions (rollback capability)
- Platform storage managed by core library (handles migrations)
