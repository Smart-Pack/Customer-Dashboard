# SQLite Database

SmartPack uses [`@capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite) to provide native SQLite database functionality for its Android and iOS applications.

The database layer is responsible for managing the local database connection and providing a foundation for persistent data storage and future offline-first functionality.

## 1. Database Initialization

### Overview

The SQLite database is initialized during application startup in mobile mode. Initialization happens before the Vue application is mounted, ensuring that the database connection is available before database-dependent functionality is used.

SQLite initialization is restricted to native platforms. Browser builds skip native database initialization.

### Configuration

The database configuration is defined in:

`src/services/database/database.ts`

| Constant | Value | Description |
|---|---|---|
| `DATABASE_NAME` | `smartpack` | Database identifier. |
| `DATABASE_VERSION` | `1` | Initial database version. |
| `DATABASE_ENCRYPTED` | `false` | Disables database encryption for the initial implementation. |
| `DATABASE_MODE` | `no-encryption` | Specifies the database encryption mode. |
| `DATABASE_READ_ONLY` | `false` | Allows database modifications. |

On Android, the database is stored in the application's private internal storage.

Database location:

```text
/data/user/0/com.razaoul.smartpack/databases/smartpackSQLite.db
```

### Initialization Process

The `initializeDatabase()` function performs the following operations:

1. **Platform detection:** Checks whether the application is running on a native platform using Capacitor. Initialization is skipped on web platforms.
2. **Connection reuse:** Returns the existing database connection if it has already been initialized.
3. **Concurrent initialization protection:** Uses a shared initialization promise to prevent multiple simultaneous initialization requests.
4. **Connection consistency:** Calls `checkConnectionsConsistency()` to verify the state of existing database connections.
5. **Connection retrieval or creation:** Retrieves an existing connection when available or creates a new database connection otherwise.
6. **Database opening:** Checks whether the database is open and opens it when necessary.
7. **Error handling:** Logs initialization errors and propagates them to the caller.

### Database Service Structure

```text
src/
└── services/
    └── database/
        ├── database.ts
        └── index.ts
```

- `database.ts`: Implements database initialization, connection retrieval, and connection closing.
- `index.ts`: Exposes the database service functions through a public module interface.

### Available Functions

| Function | Description |
|---|---|
| `initializeDatabase()` | Initializes the database and returns the database connection. Returns `null` on web platforms. |
| `getDatabase()` | Returns the initialized database connection. Throws an error if initialization has not occurred. |
| `closeDatabase()` | Closes the database connection and resets the local connection reference. |

### Application Startup Integration

Database initialization is integrated into `src/main.ts`.

It runs only when:

```typescript
import.meta.env.MODE === 'mobile'
```

Initialization errors are caught so that database failures do not prevent the application from starting. The application can continue operating through its existing API functionality when local database initialization fails.

### 2. Database Schema

The initial database schema is defined in:

`src/services/database/schema.ts`

The schema establishes the structure required to cache SmartPack application data locally and support future offline-first functionality.

The initial schema includes the following tables:

| Table | Description |
|---|---|
| `cached_user` | Stores the authenticated user's profile and group summaries. |
| `cached_groups` | Stores cached group information. |
| `cached_group_members` | Stores group membership and member details. |
| `cached_smartpacks` | Stores SmartPack device information, assignments, and group associations. |
| `cached_smartpack_sensor_measurements` | Stores cached device sensor measurements. |
| `cached_notifications` | Stores notification history and notification states. |
| `cached_notification_preferences` | Stores notification delivery preferences. |
| `cached_admin_general_analysis` | Stores cached administrative dashboard statistics. |

**Schema design considerations:**

- Primary keys and unique constraints maintain record integrity.
- Foreign keys define relationships between related records.
- `CHECK` constraints validate supported values and boolean fields.
- Indexes improve query performance for commonly accessed data.
- Nested API objects are represented using appropriate columns or serialized JSON.

The database assumes a single active user account per installation. User-specific cached information must be cleared when the user logs out.

### 3. Database Migrations

Database migrations manage schema creation and future structural changes.

Migration files are located in:

`src/services/database/migrations/`

The migration infrastructure consists of:

- `001_initial_schema.ts`: Creates the initial database tables and indexes.
- `index.ts`: Registers migrations, validates their versions, and executes pending migrations.

**Migration strategy**

The application uses SQLite's `PRAGMA user_version` to track the currently applied schema version.

Each migration has a unique, sequential version number and a descriptive name.

During database initialization:

1. The migration runner retrieves the current database version.
2. Registered migrations are validated for uniqueness, ordering, and consecutive version numbers.
3. Pending migrations are identified.
4. Each pending migration executes inside its own transaction.
5. Successful migrations are committed and the database version is updated.
6. Failed migrations are rolled back, preventing partially applied schema changes.

**Migration guidelines**

- Never modify a migration that has already been applied.
- Create a new migration whenever the database schema changes.
- Increment the migration version sequentially.
- Keep each migration focused on a specific schema change.
- Ensure migrations can be safely executed on existing installations.

Database migrations are automatically executed during SQLite initialization, before the database is made available to the application.

## 4. Database Repositories

The repository layer provides an abstraction for accessing and managing locally cached application data.

Repositories separate database queries and persistence operations from application business logic. They use the database service to interact with SQLite.

### Repository Structure

Repositories are located in:

`src/services/database/repositories/`

```text
src/
└── services/
    └── database/
        ├── database.ts
        ├── index.ts
        ├── schema.ts
        ├── migrations/
        │   ├── 001_initial_schema.ts
        │   └── index.ts
        └── repositories/
            ├── index.ts
            ├── users.ts
            └── __tests__/
                └── users.spec.ts
```

- `repositories/index.ts`: Registers and exposes available repository modules.
- `repositories/users.ts`: Implements SQLite persistence operations for authenticated user profiles.
- `repositories/__tests__/users.spec.ts`: Contains unit tests for user repository operations.

### Repository Exports

The repository modules are exposed through the database service's public interface.

```typescript
export * as repositories from './repositories'
```

Repositories can be accessed using:

```typescript
import { repositories } from '@/services/database'
```

This provides a centralized interface for accessing local data without importing individual repository implementations throughout the application.

### User Repository

The user repository is implemented in:

`src/services/database/repositories/users.ts`

It manages the locally cached authenticated user profile using the `cached_user` table.

The application currently assumes a single active user account per installation. Saving a user therefore replaces the previously cached profile.

#### Available Operations

| Function | Description |
|---|---|
| `save(user)` | Saves or replaces the cached user profile. |
| `get()` | Retrieves the cached user profile or returns `null` when no profile exists. |
| `clear()` | Deletes the cached user profile. |

#### Data Handling

The repository handles differences between API data types and SQLite storage:

- **Boolean conversion:** Converts boolean fields into SQLite integers (`0` or `1`) when saving and restores them when retrieving.
- **JSON serialization:** Serializes the user's groups into JSON before storing them.
- **JSON deserialization:** Parses the stored groups when retrieving the profile. Invalid JSON results in an empty array.
- **Nullable fields:** Stores optional profile fields as SQL `NULL` when their values are absent.
- **Cache timestamps:** Records the time a profile is saved using the `cached_at` column.

#### Transaction Management

The `save()` operation uses a SQLite transaction to ensure that replacing the cached profile is atomic.

1. Begins a transaction.
2. Deletes the previously cached user profile.
3. Inserts the updated user profile.
4. Commits the transaction when successful.
5. Rolls back the transaction if an operation fails.

If rollback itself fails, the original persistence error is preserved and propagated to the caller.

The `get()` operation retrieves the cached profile, while `clear()` removes it using a single SQL DELETE statement.

### Application Integration

Repositories are consumed by application services and stores through the database service interface.

For example, the authentication store can use the user repository to retrieve a locally cached profile when an API request fails because of a network error.

```typescript
import { repositories } from '@/services/database'

// Save the authenticated user.
await repositories.users.save(user)

// Retrieve the cached user.
const cachedUser = await repositories.users.get()

// Clear the cached user during logout.
await repositories.users.clear()
```

This allows authentication-related functionality to retain access to previously retrieved user information when the application cannot reach the backend.

### Repository Testing

Repository functionality is tested using Vitest.

The user repository tests cover:

- Successful profile persistence.
- Replacement of previously cached profiles.
- Correct mapping of API fields to SQLite values.
- Boolean conversion.
- Groups JSON serialization and deserialization.
- Handling of nullable fields.
- Cache timestamp generation.
- Transaction rollback on persistence failures.
- Preservation of original errors when rollback fails.
- Retrieval when no cached profile exists.
- Clearing cached profiles.

Run the user repository tests with:

```bash
pnpm vitest --run src/services/database/repositories/__tests__/users.spec.ts
```

The current user repository implementation has 17 passing tests.

### Future Extensions

The repository structure supports adding dedicated modules for other cached application resources, such as:

- Groups and group members.
- SmartPack devices.
- Sensor measurements.
- Notifications.
- Notification preferences.
- Administrative dashboard statistics.

Each repository should encapsulate its own database operations and expose a consistent interface through `repositories/index.ts`.

## Logging and Troubleshooting

The database service provides console messages for initialization events.

Successful initialization:

```text
[Database] SQLite initialized successfully.
```

Initialization failure:

```text
[Database] Failed to initialize SQLite:
```

To inspect Android logs:

```bash
adb logcat | grep -iE 'Database|SQLite|CapacitorSQLite'
```

To clear previous logs before testing:

```bash
adb logcat -c
```

### Current Implementation Notes

- SQLite initialization is currently supported on native platforms.
- Database encryption is disabled in the initial implementation.
- The database connection is reused during the application's runtime.
- Database initialization is optional and does not block application startup when it fails.
- Database schema and versioned migrations are implemented.
- Repository services and offline synchronization are planned for subsequent development.
