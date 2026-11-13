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

| Constant             | Value           | Description                                                  |
| -------------------- | --------------- | ------------------------------------------------------------ |
| `DATABASE_NAME`      | `smartpack`     | Database identifier.                                         |
| `DATABASE_VERSION`   | `1`             | Initial database version.                                    |
| `DATABASE_ENCRYPTED` | `false`         | Disables database encryption for the initial implementation. |
| `DATABASE_MODE`      | `no-encryption` | Specifies the database encryption mode.                      |
| `DATABASE_READ_ONLY` | `false`         | Allows database modifications.                               |

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

| Function               | Description                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `initializeDatabase()` | Initializes the database and returns the database connection. Returns `null` on web platforms.   |
| `getDatabase()`        | Returns the initialized database connection. Throws an error if initialization has not occurred. |
| `closeDatabase()`      | Closes the database connection and resets the local connection reference.                        |

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

| Table                                  | Description                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `cached_user`                          | Stores the authenticated user's profile and group summaries.              |
| `cached_groups`                        | Stores cached group information.                                          |
| `cached_group_members`                 | Stores group membership and member details.                               |
| `cached_smartpacks`                    | Stores SmartPack device information, assignments, and group associations. |
| `cached_smartpack_sensor_measurements` | Stores cached device sensor measurements.                                 |
| `cached_notifications`                 | Stores notification history and notification states.                      |
| `cached_notification_preferences`      | Stores notification delivery preferences.                                 |
| `cached_admin_general_analysis`        | Stores cached administrative dashboard statistics.                        |

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

### 4.1 Repository Structure

Repositories are located in:

`src/services/database/repositories/`

```text
src/
└── services/
    └── database/
        ├── database.ts
        ├── index.ts
        ├── schema.ts
        ├── cache.ts
        ├── migrations/
        │   ├── 001_initial_schema.ts
        │   └── index.ts
        └── repositories/
            ├── index.ts
            ├── users.ts
            ├── notificationPreferences.ts
            └── __tests__/
                ├── users.spec.ts
                └── notificationPreferences.spec.ts
```

- `repositories/index.ts`: Registers and exposes available repository modules and provides centralized cache cleanup.
- `repositories/users.ts`: Implements SQLite persistence operations for authenticated user profiles.
- `repositories/notificationPreferences.ts`: Implements SQLite persistence operations for notification preferences.
- `repositories/__tests__/`: Contains unit tests for repository operations.

### 4.2 Repository Exports

The repository modules are exposed through the database service's public interface.

```typescript
export * as repositories from './repositories'
```

Repositories can be accessed using:

```typescript
import { repositories } from '@/services/database'
```

This provides a centralized interface for accessing local data without importing individual repository implementations throughout the application.

### 4.3 Centralized Cache Cleanup

The repository layer exposes a centralized `clearAll()` function to coordinate the removal of account-specific cached data.

It is implemented in:

`src/services/database/repositories/index.ts`

The function delegates cleanup to individual repositories, providing a single entry point for clearing locally cached application data.

#### Available Operation

| Function     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `clearAll()` | Clears all account-specific cached data managed by registered repositories. |

#### Usage

The centralized cleanup function is exposed through the database service:

```typescript
import { repositories } from '@/services/database'

// Clear all account-specific cached data.
await repositories.clearAll()
```

Alternatively, it can be imported directly:

```typescript
import { clearAll } from '@/services/database/repositories'

await clearAll()
```

#### Authentication Integration

The authentication store uses `repositories.clearAll()` when the authenticated session is invalidated or the user explicitly logs out.

Cache cleanup is restricted to native platforms because SQLite repositories are used for local persistence on Android and iOS.

Cached data is preserved during temporary network failures when an existing refresh token is available, allowing the application to continue supporting offline access.

Cleanup operations are coordinated by the repository layer rather than directly deleting database records from the authentication store. This keeps authentication logic independent of individual database tables and repository implementations.

#### Cleanup Considerations

- Each account-specific repository should expose a `clear()` operation.
- New repositories must be registered in `clearAll()`.
- Cleanup order should account for foreign-key dependencies between tables.
- Cleanup failures should not prevent the authentication store from clearing its in-memory state.
- If cleanup needs to be atomic across multiple repositories, the operations should eventually share a single database transaction.

### 4.4 Cache Update Utility

The database service provides a reusable `updateCache()` helper in:

`src/services/database/cache.ts`

It updates locally cached data on native platforms without requiring application stores or services to handle platform detection themselves.

#### Usage

```typescript
import { updateCache, repositories } from '@/services/database'

// Update the notification preferences cache.
void updateCache(response, repositories.notificationPreferences)
```

The helper:

- Checks whether the application is running on a native platform.
- Saves the supplied object using the provided repository.
- Does nothing on web platforms.
- Handles and logs persistence errors without affecting the successful API operation.

Using `void` allows cache updates to run without blocking the application flow.

### 4.5 Repository Testing

Repository functionality is tested using Vitest with mocked database operations.

Tests verify:

- Successful data persistence and retrieval.
- Correct mapping between API objects and SQLite records.
- Handling of nullable and optional fields.
- Cache timestamp generation.
- Transaction management and rollback on persistence failures.
- Preservation of original errors when rollback fails.
- Correct handling of empty database results.
- Successful deletion of cached records.

Run all repository tests using:

```bash
pnpm vitest --run src/services/database/repositories/__tests__/
```

Individual repository tests can also be executed separately:

```bash
pnpm vitest --run src/services/database/repositories/__tests__/users.spec.ts

pnpm vitest --run src/services/database/repositories/__tests__/notificationPreferences.spec.ts
```

### 4.6 Individual Repositories

The following subsections document the responsibilities, available operations, data handling, and transaction management of each repository.

#### 4.6.1 User Repository

The user repository is implemented in:

`src/services/database/repositories/users.ts`

It manages the locally cached authenticated user profile using the `cached_user` table.

The application currently assumes a single active user account per installation. Saving a user therefore replaces the previously cached profile.

**Available Operations**

| Function     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `save(user)` | Saves or replaces the cached user profile.                                  |
| `get()`      | Retrieves the cached user profile or returns `null` when no profile exists. |
| `clear()`    | Deletes the cached user profile.                                            |

**Data Handling**

- **Boolean conversion:** Converts boolean fields into SQLite integers (`0` or `1`) when saving and restores them when retrieving.
- **JSON serialization:** Serializes the user's groups into JSON before storing them.
- **JSON deserialization:** Parses the stored groups when retrieving the profile. Invalid JSON results in an empty array.
- **Nullable fields:** Stores optional profile fields as SQL `NULL` when their values are absent.
- **Cache timestamps:** Records the time a profile is saved using the `cached_at` column.

**Transaction Management**

The `save()` operation uses a SQLite transaction to ensure that replacing the cached profile is atomic.

1. Begins a transaction.
2. Deletes the previously cached user profile.
3. Inserts the updated user profile.
4. Commits the transaction when successful.
5. Rolls back the transaction if an operation fails.

If rollback itself fails, the original persistence error is preserved and propagated to the caller.

The `get()` operation retrieves the cached profile, while `clear()` removes it using a single SQL DELETE statement.

#### 4.6.2 Notification Preferences Repository

The notification preferences repository is implemented in:

`src/services/database/repositories/notificationPreferences.ts`

It manages locally cached notification preferences using the `cached_notification_preferences` table.

The application maintains a single cached notification preferences record for the active user.

**Available Operations**

| Function            | Description                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| `save(preferences)` | Saves or replaces the cached notification preferences.                             |
| `get()`             | Retrieves cached notification preferences or returns `null` when no record exists. |
| `clear()`           | Deletes the cached notification preferences.                                       |

**Data Handling**

- **Phone numbers:** Stores SMS and WhatsApp phone numbers, including empty strings when no number is configured.
- **Notification channels:** Stores preferred general and SmartPack notification channels (`none`, `sms`, `whatsapp`, or `email`).
- **Cache timestamps:** Records when preferences were last saved using the `cached_at` column.
- **Local record identification:** Uses a fixed local ID of `1` to maintain a single cached preferences record.

**Transaction Management**

The `save()` operation uses a SQLite transaction to ensure that replacing the cached preferences is atomic.

1. Begins a transaction.
2. Inserts or replaces the existing preferences record.
3. Commits the transaction when successful.
4. Rolls back the transaction if an operation fails.

The `get()` operation retrieves the stored preferences, while `clear()` removes the record using a single SQL DELETE statement.

## 5. Cache Utilities

The database service provides reusable cache utilities for synchronizing API responses with locally stored SQLite data.

These utilities separate caching concerns from application business logic and provide consistent handling of native platform detection, cache persistence, and offline data retrieval.

Cache utilities are implemented in:

`src/services/database/cache.ts`

### 5.1 Available Utilities

| Function | Description |
|---|---|
| `fetchWithCache(fetcher, repository)` | Fetches data from an API, saves successful responses to SQLite on native platforms, and falls back to cached data when the request fails due to a network error. |
| `updateCache(data, repository)` | Saves an object to SQLite on native platforms without requiring the caller to handle platform detection. |

### 5.2 Fetching Data with Cache

The `fetchWithCache()` utility combines API requests with local cache management.

**Behaviour**

1. Executes the supplied API function.
2. On success, saves the response to SQLite on native platforms.
3. Returns the API response regardless of whether cache persistence succeeds.
4. If the API request fails due to a network error on a native platform, attempts to retrieve cached data.
5. Returns cached data when available.
6. Rethrows the original API error when no cached data is available or cache retrieval fails.

HTTP errors and other non-network errors are propagated without attempting cache fallback.

**Usage**

```typescript
import { fetchWithCache, repositories } from '@/services/database'

// Fetch the authenticated user.
const user = await fetchWithCache(
  getMe,
  repositories.users,
)

// Fetch notification preferences.
const preferences = await fetchWithCache(
  getNotificationPreferences,
  repositories.notificationPreferences,
)
```

The helper is suitable for resources whose cached representation can be replaced by the latest API response.

### 5.3 Updating Cached Data

The `updateCache()` utility saves an already retrieved or modified object to its corresponding repository.

Unlike `fetchWithCache()`, it does not execute an API request or retrieve cached data.

**Behaviour**

1. Checks whether the application is running on a native platform.
2. Saves the supplied object using the specified repository.
3. Skips persistence on web platforms.
4. Handles and logs persistence errors without propagating them to the caller.

**Usage**

```typescript
import { updateCache, repositories } from '@/services/database'

// Update notification preferences after a successful API request.
const response = await patch(payload)

applyPreferences(response)

// Persist the response without blocking the application flow.
void updateCache(response, repositories.notificationPreferences)
```

Using `void` allows the cache update to run asynchronously without making the application wait for SQLite persistence.

### 5.4 Repository Compatibility

Both utilities accept a repository implementing the following interface:

```typescript
interface CacheRepository<T> {
  get: () => Promise<T | null>
  save: (data: T) => Promise<void>
}
```

`fetchWithCache()` uses both `get()` and `save()`, while `updateCache()` only requires `save()`.

Repositories may expose additional operations, such as `clear()`, without affecting compatibility.

### 5.5 Platform Behaviour

| Operation | Web | Android / iOS |
|---|---|---|
| API request | Executes normally | Executes normally |
| Save successful API response | Skipped | Performed |
| Retrieve cached data after network failure | Skipped | Attempted |
| Return cached data when available | No | Yes |
| Explicit cache update | Skipped | Performed |
| Cache persistence failure | Not applicable | Logged without affecting the main operation |

### 5.6 Error Handling

Cache utilities are designed to prevent local persistence failures from unnecessarily interrupting application functionality.

- **API errors:** Original API errors are propagated when no cached fallback is available.
- **Network errors:** Cached data is used when available on native platforms.
- **Cache save errors:** Logged without affecting successful API responses.
- **Cache retrieval errors:** Logged while preserving the original API error.
- **Web platforms:** SQLite operations are skipped.

### 5.7 Testing

Cache utilities are tested using Vitest with mocked Capacitor platform detection and repository operations.

Tests cover:

- Successful API requests and cache persistence.
- Web and native platform behaviour.
- Offline fallback to cached data.
- API errors and network failures.
- Cache retrieval and persistence failures.
- Preservation of original API errors.
- Explicit cache updates.

Run the cache utility tests with:

```bash
pnpm vitest --run src/services/database/__tests__/cache.spec.ts
```


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
