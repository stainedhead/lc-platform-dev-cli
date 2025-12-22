# Feature Specification: Context Management and Core Commands

**Feature Branch**: `001-menu-framework`
**Created**: 2025-12-22
**Status**: Draft
**Input**: User description: "Implement CLI menu framework - specifically: context configuration management, Context commands (read/write/clear), App commands (init/read/update/validate), Version commands (add/update/delete/read/cache/deploy), and Deploy command with platform tooling support"

## Clarifications

### Session 2025-12-22

- Q: When `lcp context write` is called with only some flags (e.g., only `--account`), should it overwrite all values or merge? → A: Merge/update - only specified flags are updated, others remain unchanged
- Q: Which configuration file should `lcp context write` target (global vs project-local)? → A: Target global by default, add `--local` flag for project-specific writes
- Q: What happens if a user caches multiple files for the same version - are they replaced or accumulated? → A: Replace - each cache operation replaces the previous file for that version
- Q: When commands lack required context values, should the system prompt interactively or return an error? → A: Return descriptive error (no prompting) - list missing values and how to provide them
- Q: How should the system handle concurrent deployments (two users deploying different versions simultaneously)? → A: Last-write-wins with warning - allow concurrent deploys, warn user if conflict detected

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure CLI Context (Priority: P1)

A developer needs to set up their local development environment with default values for account, team, and application moniker so they don't have to specify these values with every command invocation.

**Why this priority**: Context configuration is foundational - it reduces repetitive flag usage and enables all subsequent commands. Without it, users must specify account/team/moniker on every command.

**Independent Test**: Can be fully tested by running `lcp context write --account <value> --team <value> --moniker <value>`, then running `lcp context read` to verify persistence, and running any command to verify the stored values are used as defaults.

**Acceptance Scenarios**:

1. **Given** a user has no configuration file, **When** they run `lcp context write --account myacct --team devteam --moniker myapp`, **Then** a configuration file is created with these values stored persistently
2. **Given** a user has stored context values, **When** they run `lcp context read`, **Then** they see all stored configuration values (account, team, moniker, provider, region) displayed clearly
3. **Given** a user has stored context values, **When** they run a command without specifying flags, **Then** the stored context values are used as defaults
4. **Given** a user has stored context values, **When** they run a command with explicit flags (e.g., `--account other`), **Then** the explicit flag values override the stored context values for that invocation only
5. **Given** a user wants to remove all stored configuration, **When** they run `lcp context clear`, **Then** the configuration file is cleared and subsequent commands require explicit flags

---

### User Story 2 - Initialize New Application (Priority: P1)

A developer needs to create a new application within the platform, establishing the initial application configuration.

**Why this priority**: Application initialization is the starting point for all app-related operations. Users cannot manage versions or deploy without first initializing an application.

**Independent Test**: Can be fully tested by running `lcp app init` with required parameters, then verifying the application exists in the platform and can be read back with `lcp app read`.

**Acceptance Scenarios**:

1. **Given** a user has valid context (account, team, moniker), **When** they run `lcp app init`, **Then** a new application is created in the platform with default configuration
2. **Given** a user provides additional flags during init, **When** they run `lcp app init --config <file>`, **Then** the application is created with configuration from the specified file
3. **Given** an application already exists, **When** a user tries to run `lcp app init` for the same moniker, **Then** the system returns a clear error indicating the application already exists
4. **Given** a user lacks required context values, **When** they run `lcp app init`, **Then** the system returns a descriptive error listing the missing values and how to provide them (via `lcp context write` or command flags)

---

### User Story 3 - Manage Application Configuration (Priority: P1)

A developer needs to view, validate, and update application configuration to manage application settings over time.

**Why this priority**: Configuration management is essential for maintaining applications. Developers must be able to safely update configuration and validate changes before applying them.

**Independent Test**: Can be tested independently by creating a config file, running `lcp app validate --config <file>`, then running `lcp app update --config <file>`, and verifying with `lcp app read`.

**Acceptance Scenarios**:

1. **Given** a user has an existing application, **When** they run `lcp app read`, **Then** they see the complete current configuration for their application (using context values for account/team/moniker)
2. **Given** a user has a configuration file, **When** they run `lcp app validate --config <file>`, **Then** the system validates the file against the schema and reports any errors without making changes
3. **Given** a user has a valid configuration file, **When** they run `lcp app update --config <file>`, **Then** the application configuration is updated with the new values
4. **Given** a user provides an invalid configuration, **When** they run `lcp app update --config <file>`, **Then** the update is rejected with detailed validation errors explaining what needs to be fixed

---

### User Story 4 - Manage Application Versions (Priority: P2)

A developer needs to create, update, and manage multiple versions of their application, with the ability to track which version is currently deployed.

**Why this priority**: Version management enables progressive deployments and rollbacks. While not immediately required for initial setup, it's critical for production workflows.

**Independent Test**: Can be tested by running `lcp version add --version v1.0.0 --config <file>`, then `lcp version read --version v1.0.0`, then adding another version, and verifying multiple versions can coexist.

**Acceptance Scenarios**:

1. **Given** a user has an initialized application, **When** they run `lcp version add --version v1.0.0 --config <file>`, **Then** a new version is created and stored with the specified configuration
2. **Given** a user has multiple versions, **When** they run `lcp version read --version v1.0.0`, **Then** they see the configuration for that specific version
3. **Given** a user has an existing version, **When** they run `lcp version update --version v1.0.0 --config <file>`, **Then** the version configuration is updated
4. **Given** a user has a file to cache for a version, **When** they run `lcp version cache --version v1.0.0 --file ./build/app.zip`, **Then** the file is uploaded to the platform and associated with version v1.0.0 for later deployment
5. **Given** a user has an unused version, **When** they run `lcp version delete --version v1.0.0`, **Then** the version is removed from storage
6. **Given** a user has multiple versions, **When** they query the system, **Then** they can see which version is currently deployed/active

---

### User Story 5 - Deploy Application Versions (Priority: P1)

A developer needs to deploy a specific version of their application, with control over whether to deploy the app only, dependencies only, or everything, and whether to use local or platform tooling.

**Why this priority**: Deployment is the primary goal of version management. Users must be able to activate a specific version and control deployment scope.

**Independent Test**: Can be tested by adding multiple versions, running `lcp version deploy --version v1.0.0`, and verifying that version becomes active. Test different deployment scopes (--app-only, --dependencies-only, --all) independently.

**Acceptance Scenarios**:

1. **Given** a user has multiple versions, **When** they run `lcp version deploy --version v1.0.0`, **Then** version v1.0.0 becomes the active deployed version with all components (app + dependencies) deployed
2. **Given** a user wants to deploy only the application code, **When** they run `lcp version deploy --version v1.0.0 --app-only`, **Then** only the application components are deployed, dependencies remain unchanged
3. **Given** a user wants to deploy only dependencies, **When** they run `lcp version deploy --version v1.0.0 --dependencies-only`, **Then** only dependency resources are deployed, application code remains unchanged
4. **Given** a user wants platform-managed deployment, **When** they run `lcp version deploy --version v1.0.0 --platform-tooling`, **Then** an event is sent to the platform to handle deployment asynchronously
5. **Given** a user specifies conflicting flags, **When** they run `lcp version deploy --version v1.0.0 --app-only --dependencies-only`, **Then** the system returns an error indicating only one scope flag can be used at a time
6. **Given** deployment uses local tooling (default), **When** the deployment completes, **Then** the system reports success/failure with detailed output

---

### Edge Cases

- What happens when configuration file is corrupted or contains invalid JSON?
- How does the system behave when a user tries to deploy a version that doesn't exist?
- What if the user specifies `--version` but omits the version value?
- How does `lcp app read` behave when the application doesn't exist yet?
- What happens when `lcp version cache` is called with a file path that doesn't exist or is inaccessible?
- How should the system handle cache file upload failures (network issues, platform storage errors)?
- What happens when platform tooling deployment is requested but the platform is unavailable?
- How should the system handle network timeouts during deployment?
- What if terminal width is very narrow - how should long configuration values be displayed?

## Requirements *(mandatory)*

### Functional Requirements

**Configuration Management**

- **FR-001**: System MUST store configuration values (account, team, moniker, provider, region) in a persistent configuration file
- **FR-002**: System MUST load stored configuration values automatically when the CLI runs
- **FR-003**: System MUST allow explicit flag values to override stored configuration values for individual command invocations
- **FR-004**: System MUST support hybrid configuration with both global (`~/.lcp/config.json`) and project-local (`.lcp/config.json`) files, where project-local settings override global settings
- **FR-004a**: System MUST detect and load global configuration from `~/.lcp/config.json` in the user's home directory
- **FR-004b**: System MUST detect and load project-local configuration from `.lcp/config.json` in the current working directory or nearest parent directory
- **FR-004c**: When both global and project-local configurations exist, project-local values MUST take precedence over global values for any overlapping keys

**Context Commands**

- **FR-005**: System MUST support `lcp context read` to display all stored configuration values in human-readable format
- **FR-006**: System MUST support `lcp context write` with flags (--account, --team, --moniker, --provider, --region) to set configuration values in the global configuration file (`~/.lcp/config.json`) by default
- **FR-006a**: `lcp context write` MUST support `--local` flag to write configuration to project-local file (`.lcp/config.json`) instead of global
- **FR-007**: System MUST support `lcp context clear` to remove all stored configuration values from the global configuration file by default
- **FR-007a**: `lcp context clear` MUST support `--local` flag to clear only the project-local configuration file instead of global
- **FR-008**: `lcp context write` MUST support partial updates using merge behavior - only specified flags are updated, unspecified values remain unchanged in the configuration file
- **FR-009**: `lcp context read` MUST support `--json` flag for machine-readable output

**App Commands**

- **FR-010**: System MUST support `lcp app init` to create a new application in the platform
- **FR-011**: System MUST support `lcp app read` to retrieve and display current application configuration
- **FR-012**: System MUST support `lcp app validate --config <file>` to validate configuration without making changes
- **FR-013**: System MUST support `lcp app update --config <file>` to update application configuration from a file
- **FR-014**: `lcp app init` MUST use context values (account, team, moniker) to identify the application
- **FR-015**: `lcp app validate` MUST check configuration against a schema and report specific validation errors
- **FR-016**: `lcp app update` MUST reject invalid configuration and prevent partial updates

**Version Commands**

- **FR-017**: System MUST support `lcp version add --version <version> --config <file>` to create a new version
- **FR-018**: System MUST support `lcp version read --version <version>` to retrieve version configuration
- **FR-019**: System MUST support `lcp version update --version <version> --config <file>` to modify existing version
- **FR-020**: System MUST support `lcp version delete --version <version>` to remove a version
- **FR-021**: System MUST support `lcp version cache --version <version> --file <path>` to upload a file to the platform where it will be cached until the version is deployed
- **FR-021a**: The `--file` parameter MUST accept a path to a local file that will be uploaded to the platform's cache storage
- **FR-021b**: Each version MUST have exactly one cached file - subsequent cache operations for the same version replace the previously cached file
- **FR-021c**: Cached files MUST remain associated with their specific version and be available during deployment of that version
- **FR-022**: System MUST support `lcp version deploy --version <version>` to activate a specific version
- **FR-023**: System MUST allow multiple versions to be stored simultaneously
- **FR-024**: System MUST track which version is currently deployed/active
- **FR-025**: All version commands MUST require `--version <version>` flag with a value

**Deployment Options**

- **FR-026**: `lcp version deploy` MUST support `--app-only` flag to deploy only application code
- **FR-027**: `lcp version deploy` MUST support `--dependencies-only` flag to deploy only dependencies
- **FR-028**: `lcp version deploy` MUST support `--all` flag (default) to deploy both app and dependencies
- **FR-029**: System MUST enforce mutual exclusivity of `--app-only`, `--dependencies-only`, and `--all` flags
- **FR-030**: `lcp version deploy` MUST support `--platform-tooling` flag to delegate deployment to the platform
- **FR-031**: When `--platform-tooling` is not specified, deployment MUST be processed locally by the CLI
- **FR-032**: Platform tooling deployment MUST send an event to the platform and report event submission status
- **FR-033**: Local deployment MUST provide real-time progress feedback and detailed completion status
- **FR-033a**: System MUST support concurrent deployments using last-write-wins semantics - the most recent deployment becomes active
- **FR-033b**: When a deployment completes and another deployment for the same application was initiated concurrently, the system MUST display a warning indicating potential conflict

**Global Flag Behavior**

- **FR-034**: System MUST support `--account <value>` flag on all commands to override stored account
- **FR-035**: System MUST support `--team <value>` flag on all commands to override stored team
- **FR-036**: System MUST support `--moniker <value>` flag on all commands to override stored moniker
- **FR-037**: All commands MUST continue to support existing global flags (--provider, --region, --json, --verbose, --quiet, --debug, --dry-run)
- **FR-038**: When commands require context values (account, team, moniker) that are not provided via flags or stored configuration, the system MUST return a descriptive error listing the missing values and instructions for providing them (via `lcp context write` or command-line flags)

### Key Entities

- **CLI Context**: Persistent configuration containing account, team, moniker, provider, and region values used as defaults across all commands
- **Application**: A platform-managed application identified by account, team, and moniker, with associated configuration
- **Version**: A specific version of an application (e.g., v1.0.0) with its own configuration, multiple versions can exist simultaneously
- **Deployment**: The process of activating a specific version, which can target app-only, dependencies-only, or all components, executed locally or via platform
- **Configuration File**: A file containing application or version settings, validated against a schema, used for init/update operations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can complete initial setup (context configuration + app initialization) in under 3 minutes
- **SC-002**: Users specify context values once and 95% of subsequent commands work without requiring those flags
- **SC-003**: Configuration validation catches 100% of schema violations before applying updates
- **SC-004**: Developers can switch between versions and deploy in under 60 seconds (local deployment)
- **SC-005**: 90% of users successfully deploy their first version on the first attempt after reading command help
- **SC-006**: All commands complete successfully or fail with actionable error messages 100% of the time (no silent failures)
- **SC-007**: Configuration files are validated and rejected before any partial state changes occur, maintaining consistency
