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
        ├── transaction.ts
        └── index.ts
```

- `database.ts`: Implements database initialization, connection retrieval, and connection closing.
- `transaction.ts`: Provides `withTransaction()` for executing database operations within a transaction. Serializes transaction execution through a queue to prevent concurrent transactions on the shared SQLite connection.
- `index.ts`: Exposes the database service functions and transaction utilities through a public module interface.

### Available Functions

| Function               | Description                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initializeDatabase()` | Initializes the database and returns the database connection. Returns `null` on web platforms.                                                                |
| `getDatabase()`        | Returns the initialized database connection. Throws an error if initialization has not occurred.                                                              |
| `closeDatabase()`      | Closes the database connection and resets the local connection reference.                                                                                     |
| `withTransaction()`    | Executes an asynchronous database operation within a transaction. Queues transaction operations to prevent overlapping transactions on the shared connection. |

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
| `cached_bluetooth_sensor_measurements` | Stores locally received Bluetooth sensor measurements, including weight, steps, timestamp, and associated SmartPack ID. |
| `cached_notifications`                 | Stores notification history and notification states.                      |
| `cached_notification_preferences`      | Stores notification delivery preferences.                                 |
| `cached_admin_general_analysis`        | Stores cached administrative dashboard statistics.                        |
| `sync_metadata` | Tracks synchronization status, last successful synchronization time, and errors for each cached module. |

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
- `002_bluetooth_sensor_measurements.ts`: Creates the Bluetooth sensor measurements table and its index.
- `003_sync_metadata.ts`: Creates the module synchronization metadata table for tracking synchronization status, timestamps, and errors.
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

#### 4.6.3 Groups Repository

The groups repository is implemented in:

`src/services/database/repositories/groups.ts`

It manages locally cached group summaries using the `cached_groups` table.

Group summaries are cached to support offline access to the user's groups, including their names and associated user and SmartPack counts.

**Available Operations**

| Function                           | Description                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `save(group)`                      | Saves or updates a cached group summary.                                                                                                |
| `saveList(groups)`                 | Saves multiple group summaries within a single transaction.                                                                             |
| `getAll()`                         | Retrieves all cached group summaries, ordered by ID.                                                                                    |
| `getPaginated(params, userGroups)` | Retrieves cached group summaries, filters them by the authenticated user's group roles, and returns the results using local pagination. |
| `get(id)`                          | Retrieves a cached group by its ID or returns `null` when it does not exist.                                                            |
| `deleteById(id)`                   | Deletes a cached group by its ID.                                                                                                       |
| `clear()`                          | Deletes all cached group summaries.                                                                                                     |

**Data Handling**

- **Group identification:** Uses the API-provided group ID as the primary key.
- **Group details:** Stores the group name, total users, total SmartPacks, creation timestamp, and last update timestamp.
- **Cache timestamps:** Records when each group summary was last saved using the `cached_at` column.
- **Conflict handling:** Uses SQLite `ON CONFLICT(id) DO UPDATE` to update existing records instead of creating duplicates.
- **Ordering:** Retrieves all cached groups in ascending order of their IDs.

**Transaction Management**

The `save()` operation inserts or updates a group summary using a single SQL statement.

The `saveList()` operation uses a SQLite transaction to ensure that all group summaries are persisted atomically.

1. Begins a transaction.
2. Saves each group summary by delegating to `save()`.
3. Commits the transaction when all groups are saved successfully.
4. Rolls back the transaction if any group fails to save.
5. Logs rollback failures while preserving the original database error.

Individual `save()` calls disable automatic transaction handling so that they can execute within the transaction managed by `saveList()`.

The `getAll()` and `get()` operations retrieve cached group summaries, while `deleteById()` and `clear()` remove individual or all cached group summaries, respectively.

#### 4.6.4 SmartPacks Repository

The SmartPacks repository is implemented in:

`src/services/database/repositories/smartpacks.ts`

It manages locally cached SmartPack device records using the `cached_smartpacks` table.

SmartPacks are cached to support offline access to device information, including their hardware details, assignment status, associated groups, and connection status.

**Available Operations**

| Function                | Description                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `save(smartPack)`       | Saves or updates a cached SmartPack record.                                                                        |
| `saveList(smartPacks)`  | Saves multiple SmartPack records within a single transaction.                                                      |
| `getAll()`              | Retrieves all cached SmartPacks, ordered by ID.                                                                    |
| `getPaginated(params)`  | Retrieves cached SmartPacks, applies assignment and group filters, and returns the results using local pagination. |
| `get(id)`               | Retrieves a cached SmartPack by its ID or returns `null` when it does not exist.                                   |
| `getByGroupId(groupId)` | Retrieves cached SmartPacks belonging to the specified group ID.                                                   |
| `deleteById(id)`        | Deletes a cached SmartPack by its ID.                                                                              |
| `clear()`               | Deletes all cached SmartPack records.                                                                              |

**Data Handling**

- **Device identification:** Uses the API-provided SmartPack ID as the primary key and stores the unique device UUID.
- **Hardware details:** Stores the hardware model, IMEI, firmware version, and Bluetooth MAC address.
- **Connection status:** Stores the device's last-seen timestamp and online status. Boolean online values are converted to integers (`1` or `0`) for SQLite storage and reconstructed as booleans when retrieved.
- **User assignment:** Stores assigned user details, including their ID, UUID, full name, email, and phone number. These fields are nullable when a SmartPack is unassigned.
- **Group association:** Stores the associated group ID and name. Both fields are nullable when a SmartPack does not belong to a group.
- **Child information:** Stores the name of the child associated with the SmartPack.
- **Cache timestamps:** Records when each SmartPack was last saved using the `cached_at` column.
- **Conflict handling:** Uses SQLite `ON CONFLICT(id) DO UPDATE` to update existing records instead of creating duplicates.
- **Ordering:** Retrieves all cached SmartPacks in ascending order of their IDs.
- **Data reconstruction:** Converts flattened SQLite records into the API's nested SmartPack structure, reconstructing the `assigned_to` and `group` objects when their corresponding records are available.

**Filtering and Pagination**

The `getPaginated()` operation retrieves cached SmartPacks, applies the requested filters, and paginates the resulting records locally.

Supported filters include:

| Parameter     | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `assigned_to` | Filters SmartPacks by the ID of their assigned user.             |
| `group`       | Filters SmartPacks by their associated group ID.                 |
| `is_assigned` | Filters SmartPacks based on whether they are assigned to a user. |
| `has_group`   | Filters SmartPacks based on whether they belong to a group.      |

Multiple filters can be combined. Filtering is performed before pagination to ensure that the returned results and total count reflect the matching records.

**Transaction Management**

The `save()` operation inserts or updates a SmartPack using a single SQL statement.

The `saveList()` operation uses a SQLite transaction to ensure that all SmartPack records are persisted atomically.

1. Begins a transaction.
2. Saves each SmartPack by delegating to `save()`.
3. Commits the transaction when all SmartPacks are saved successfully.
4. Rolls back the transaction if any SmartPack fails to save.
5. Logs rollback failures while preserving the original database error.

Individual `save()` calls disable automatic transaction handling so that they can execute within the transaction managed by `saveList()`.

The `getAll()` and `get()` operations retrieve cached SmartPack records and reconstruct their nested data structures, while `deleteById()` and `clear()` remove individual or all cached SmartPack records, respectively.

#### 4.6.5 Group Members Repository

The Group Members repository is implemented in:

`src/services/database/repositories/groupMembers.ts`

It manages locally cached group membership records using the `cached_group_members` table.

Group members are cached to support offline access to group membership information, including member details, assigned roles, and group associations.

**Available Operations**

| Function                        | Description                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `save(groupId, member)`         | Saves or updates a cached group member.                                                                                                                |
| `saveList(groupId, members)`    | Saves multiple group members within a single transaction without removing existing records.                                                            |
| `replaceList(groupId, members)` | Synchronizes cached group members with the supplied list, inserting new records, updating existing records, and deleting records absent from the list. |
| `getAll()`                      | Retrieves all cached group members.                                                                                                                    |
| `get(groupId, id)`              | Retrieves a cached group member using its group ID and member ID, or returns `null` when it does not exist.                                            |
| `getByGroupId(groupId)`         | Retrieves all cached members belonging to a specific group.                                                                                            |
| `getPaginated(params)`          | Retrieves cached group members, applies group membership and role filters, and returns the results using local pagination.                             |
| `deleteByGroupId(groupId)`      | Deletes all cached members belonging to a specific group.                                                                                              |
| `deleteById(id)` | Deletes a specific cached group member by its ID. |
| `clear()`                       | Deletes all cached group member records.                                                                                                               |

**Data Handling**

- **Record identification:** Uses a composite primary key consisting of the group ID and member ID, allowing member records to be uniquely identified within their respective groups.
- **Group association:** Stores the associated group ID to link each cached member to its group.
- **User details:** Stores the member's user ID, UUID, full name, email, and phone number as flattened fields.
- **Membership roles:** Stores the member's role, which can be `owner`, `admin`, or `member`.
- **Timestamps:** Stores the membership creation and last-update timestamps.
- **Cache timestamps:** Records when each group member was last saved using the `cached_at` column.
- **Conflict handling:** Uses SQLite `ON CONFLICT(group_id, id) DO UPDATE` to update existing records instead of creating duplicates.
- **Data representation:** Stores user information as flattened columns rather than nested objects, matching the SQLite schema.
- **Group deletion:** Uses a foreign key with `ON DELETE CASCADE` to automatically remove cached group members when their associated cached group is deleted.

**Filtering and Pagination**

The `getPaginated()` operation retrieves cached group members, applies the requested filters, and paginates the resulting records locally.

Supported filters include:

| Parameter          | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `group`            | Filters members by their associated group ID.                             |
| `role`             | Filters members by their membership role (`owner`, `admin`, or `member`). |
| `has_admin_access` | Filters members to include only owners and admins when set to `true`.     |

Multiple filters can be combined. Filtering is performed before pagination to ensure that the returned results and total count reflect the matching records.

**Transaction Management**

The `save()` operation inserts or updates a group member using a single SQL statement.

The `saveList()` operation uses a SQLite transaction to persist multiple group members atomically.

1. Begins a transaction.
2. Saves each group member by delegating to `save()`.
3. Commits the transaction when all members are saved successfully.
4. Rolls back the transaction if any member fails to save.
5. Logs rollback failures while preserving the original database error.

The `replaceList()` operation uses a transaction to synchronize the cached membership records with a complete list retrieved from the API.

1. Begins a transaction.
2. Deletes existing cached members that are absent from the supplied list.
3. Saves each supplied member by delegating to `save()`, inserting new records or updating existing ones.
4. Commits the transaction when synchronization succeeds.
5. Rolls back the transaction if deletion or saving fails.
6. Logs rollback failures while preserving the original database error.

When `replaceList()` receives an empty list, all cached members belonging to the specified group are deleted.

Individual `save()` calls disable automatic transaction handling so that they can execute within the transaction managed by `saveList()` or `replaceList()`.

The retrieval operations provide access to cached membership records, while `deleteByGroupId()`, `deleteById()`, and `clear()` support removing cached membership data at different levels.

#### 4.6.6 Group Details Service

The Group Details service is implemented in:

`src/services/database/groupDetails.ts`

It provides a higher-level interface for retrieving and caching complete group details using the local SQLite repositories.

The service combines cached group summaries, SmartPacks, and group members into a single `GroupDetail` object matching the backend API response structure.

It supports offline access to previously cached group details, allowing the application to display group information when the API is unavailable.

**Available Operations**

| Function | Description |
|---|---|
| `get(id)` | Retrieves a group's cached summary, SmartPacks, and members, returning them as a `GroupDetail` object or `null` if the group does not exist. |
| `save(group)` | Saves a group summary and replaces its cached group members with the latest members supplied in the group details. |

**Data Retrieval**

The `get()` operation retrieves the group summary first. If the group does not exist in the local cache, it returns `null` without querying the associated SmartPacks or members.

When the group exists, the service retrieves its cached SmartPacks and group members concurrently using `Promise.all()`.

The resulting data is mapped into the `GroupDetail` API structure.

**Data Handling**

- **Group summary:** Retrieves the group's ID, name, creation timestamp, and last-update timestamp from the groups repository.
- **SmartPacks:** Retrieves cached SmartPacks associated with the group using `getByGroupId()`.
- **Group members:** Retrieves cached members associated with the group using `getByGroupId()`.
- **Cache metadata:** Removes repository-specific fields such as `cached_at` and `group_id` from the returned SmartPack and member objects.
- **Nested user details:** Preserves the nested user structure in group member records.
- **API compatibility:** Returns a `GroupDetail` object without exposing SQLite-specific cache metadata.

**Data Persistence**

The `save()` operation persists group details by delegating to the relevant repositories.

1. Saves the group summary using `repositories.groups.save()`.
2. Calculates the total number of SmartPacks and members from the supplied group details.
3. Updates the group's `total_smartpacks` and `total_users` summary fields.
4. Replaces the cached group members using `repositories.groupMembers.replaceList()`.

The operation ensures that the cached group summary reflects the totals supplied in the latest API response and that cached membership records are synchronized with the supplied members.

**Repository Dependencies**

The service delegates database operations to the following repositories:

| Repository | Responsibility |
|---|---|
| `repositories.groups` | Retrieves and saves group summaries. |
| `repositories.smartpacks` | Retrieves SmartPacks associated with a group. |
| `repositories.groupMembers` | Retrieves and replaces group membership records. |

The Group Details service is exported through `src/services/database/index.ts` as `groupDetails`, allowing consumers to access its operations through the database service module.

### 4.6.7 Sensor Measurements Service

The Sensor Measurements service is implemented in:

`src/services/database/smartpackSensorMeasurements.ts`

It provides a higher-level interface for retrieving and managing cached SmartPack sensor measurements using the local SQLite repositories.

The service supports offline access to previously cached sensor measurements, allowing the application to display measurement history when the API is unavailable.

**Available Operations**

| Function | Description |
|---|---|
| `get(id)` | Retrieves a cached sensor measurement by its ID, returning the measurement or `null` if it does not exist. |
| `getAll()` | Retrieves all cached sensor measurements. |
| `getPaginated(params)` | Retrieves cached sensor measurements with optional SmartPack and timestamp filters, returning paginated results. |
| `save(smartpackId, measurement)` | Saves a sensor measurement and associates it with the specified SmartPack. |
| `saveList(smartpackId, measurements)` | Saves multiple sensor measurements for the specified SmartPack. |
| `deleteById(id)` | Deletes a cached sensor measurement by its ID. |
| `deleteBySmartPackId(smartpackId)` | Deletes all cached sensor measurements associated with a specific SmartPack. |
| `clear()` | Removes all cached sensor measurements. |

**Data Retrieval**

The `get()` operation retrieves an individual measurement using its ID.

The `getAll()` operation retrieves all cached measurements, ordered by timestamp in descending order.

The `getPaginated()` operation retrieves measurements using optional query parameters and applies local pagination.

Supported filters include:

- **SmartPack:** Retrieves measurements associated with a specific SmartPack.
- **Start timestamp:** Retrieves measurements recorded at or after `timestamp_gte`.
- **End timestamp:** Retrieves measurements recorded at or before `timestamp_lte`.

Measurements are ordered by timestamp in descending order before pagination is applied.

**Data Handling**

- **SmartPack association:** Each cached measurement is associated with its parent SmartPack through `smartpack_id`.
- **Measurement data:** Preserves sensor readings, including steps, weight, and timestamp.
- **Cache metadata:** Maintains the `cached_at` timestamp to track when a measurement was stored locally.
- **API compatibility:** Keeps SQLite-specific fields separate from the measurement data returned by the service.
- **Filtering:** Applies supported SmartPack and timestamp filters when retrieving paginated results.

**Data Persistence**

The `save()` operation inserts a sensor measurement into the local database. If a measurement with the same ID already exists, its stored values are updated.

The `saveList()` operation saves multiple measurements within a database transaction.

The persistence operations ensure that measurements remain associated with the correct SmartPack and that existing cached records are updated rather than duplicated.

**Data Deletion**

The service provides operations for removing cached measurement records:

1. `deleteById()` removes an individual measurement.
2. `deleteBySmartPackId()` removes all measurements associated with a specified SmartPack.
3. `clear()` removes all cached sensor measurements.

These operations support targeted cache cleanup and complete removal of locally stored measurement data.

### 4.6.8 Bluetooth Sensor Measurements Service

The Bluetooth Sensor Measurements service is implemented in:

`src/services/database/bluetoothSensorMeasurements.ts`

It provides a higher-level interface for retrieving and managing Bluetooth sensor measurements stored in the local SQLite database.

The service supports persistent storage of sensor readings received directly from SmartPack devices over Bluetooth, allowing the application to retain Bluetooth measurement history independently of REST API measurements.

**Available Operations**

| Function | Description |
|---|---|
| `save(smartpackId, measurement)` | Saves a Bluetooth sensor measurement and associates it with the specified SmartPack. |
| `saveList(smartpackId, measurements)` | Saves multiple Bluetooth sensor measurements for the specified SmartPack within a database transaction. |
| `getAll()` | Retrieves all cached Bluetooth sensor measurements. |
| `getBySmartPackId(smartpackId)` | Retrieves Bluetooth sensor measurements associated with a specific SmartPack. |
| `getPaginated(smartpackId, params)` | Retrieves and locally paginates Bluetooth sensor measurements for a specific SmartPack. |
| `deleteByTimestamp(smartpackId, timestamp)` | Deletes a Bluetooth sensor measurement using its SmartPack ID and timestamp. |
| `deleteBySmartPackId(smartpackId)` | Deletes all Bluetooth sensor measurements associated with a specific SmartPack. |
| `clear()` | Removes all cached Bluetooth sensor measurements. |

**Data Retrieval**

The `getAll()` operation retrieves all cached Bluetooth measurements, ordered by timestamp in descending order.

The `getBySmartPackId()` operation retrieves measurements associated with a particular SmartPack.

The `getPaginated()` operation retrieves measurements for the specified SmartPack and applies local pagination.

Measurements are ordered by timestamp in descending order before pagination is applied.

**Data Handling**

- **SmartPack association:** Each Bluetooth measurement is associated with its parent SmartPack through `smartpack_id`.
- **Measurement data:** Stores sensor readings, including weight, steps, and timestamp.
- **Separate storage:** Maintains Bluetooth measurements independently of REST API sensor measurements.
- **Record identification:** Uses a composite primary key consisting of `smartpack_id` and `timestamp` to uniquely identify each measurement.
- **Duplicate handling:** Updates an existing record when a measurement with the same SmartPack ID and timestamp is saved again.

**Data Persistence**

The `save()` operation inserts a Bluetooth sensor measurement into the local database. If a record with the same SmartPack ID and timestamp already exists, its weight and steps values are updated.

The `saveList()` operation saves multiple Bluetooth measurements within a database transaction. This ensures that the batch is committed together or rolled back if an error occurs.

The persistence operations maintain the association between each measurement and its corresponding SmartPack.

**Data Deletion**

The service provides operations for removing cached Bluetooth measurement records:

1. `deleteByTimestamp()` removes an individual measurement identified by its SmartPack ID and timestamp.
2. `deleteBySmartPackId()` removes all Bluetooth measurements associated with a specified SmartPack.
3. `clear()` removes all cached Bluetooth sensor measurements.

These operations support targeted cache cleanup and complete removal of locally stored Bluetooth measurement data.

### 4.6.9 Notifications Service

The Notifications service is implemented in:

`src/services/database/notifications.ts`

It provides a higher-level interface for retrieving and managing notifications stored in the local SQLite database.

The service supports persistent storage of notifications received from the backend, allowing the application to retain notification history and access previously cached notifications even when offline.

**Available Operations**

| Function | Description |
|---|---|
| `save(notification)` | Saves a notification to the local database. |
| `saveList(notifications)` | Saves multiple notifications within a database transaction. |
| `replaceList(notifications)` | Replaces all cached notifications with the supplied notification list within a database transaction. |
| `getById(id)` | Retrieves a cached notification using its ID. |
| `getAll(params)` | Retrieves cached notifications, optionally applying filters. |
| `getPaginated(params)` | Retrieves and locally paginates cached notifications. |
| `markAsRead(id)` | Marks a notification as read. |
| `markAsUnread(id)` | Marks a notification as unread. |
| `dismiss(id)` | Marks a notification as dismissed. |
| `deleteById(id)` | Deletes a specific notification using its ID. |
| `clear()` | Removes all cached notifications. |

**Data Retrieval**

The `getById()` operation retrieves a notification using its unique identifier.

The `getAll()` operation retrieves cached notifications and supports filtering by notification creation date, read status, dismissed status, notification type, and combined notification status.

The `getPaginated()` operation retrieves notifications matching the supplied filters and applies local pagination.

Notifications are ordered by creation timestamp in descending order, with their IDs used as a secondary ordering criterion to ensure consistent ordering when timestamps are identical.

**Data Handling**

- **Notification identification:** Uses the notification ID as the primary key.
- **Notification details:** Stores notification type, title, body, URL, and associated data.
- **Read status:** Maintains whether a notification has been read, including its `read_at` timestamp.
- **Dismissal status:** Maintains whether a notification has been dismissed, including its `dismissed_at` timestamp.
- **Separate storage:** Maintains notifications independently of other cached application data.
- **Data serialization:** Serializes notification data into JSON before storing it in SQLite and deserializes it when retrieving records.
- **Cache tracking:** Maintains a `cached_at` timestamp indicating when a notification was last saved locally.

**Data Persistence**

The `save()` operation inserts a notification into the local database. If a notification with the same ID already exists, its stored information is updated.

The `saveList()` operation saves multiple notifications within a database transaction. This ensures that the batch is committed together or rolled back if an error occurs.

The `replaceList()` operation removes existing cached notifications and saves the supplied notification list within a single database transaction. This allows the local notification cache to be refreshed consistently.

The persistence operations preserve notification details, read status, dismissal status, and associated data.

**Notification Status Management**

The service provides operations for managing notification states:

1. `markAsRead()` marks a notification as read and updates its read timestamp.
2. `markAsUnread()` marks a notification as unread and clears its read timestamp.
3. `dismiss()` marks a notification as dismissed and updates its dismissal timestamp.

These operations allow notification state changes to be maintained locally, supporting notification management while the application is offline.

**Data Deletion**

The service provides operations for removing cached notification records:

1. `deleteById()` removes an individual notification identified by its ID.
2. `clear()` removes all cached notifications.

These operations support targeted cache cleanup and complete removal of locally stored notification data.

### 4.6.10 Sync Metadata Repository

The Sync Metadata repository is implemented in:

`src/services/database/repositories/syncMetadata.ts`

It provides an interface for tracking synchronization metadata for individual modules whose data is cached in the local SQLite database.

The repository maintains synchronization state independently for each cached module, allowing the application to track when data was last synchronized, monitor synchronization attempts, and record errors encountered during synchronization.

**Available Operations**

| Function | Description |
|---|---|
| `get(module)` | Retrieves synchronization metadata for a specific module. |
| `getAll()` | Retrieves synchronization metadata for all registered modules. |
| `save(metadata)` | Creates or updates synchronization metadata for a module. |
| `deleteByModule(module)` | Deletes synchronization metadata associated with a specific module. |
| `clear()` | Removes all synchronization metadata records. |

**Data Retrieval**

The `get()` operation retrieves synchronization metadata using the module identifier. It returns the corresponding record or `null` if no metadata exists.

The `getAll()` operation retrieves synchronization metadata for all modules, ordered alphabetically by module identifier.

**Data Handling**

- **Module identification:** Uses the module identifier as the primary key, ensuring that each module has its own synchronization record.
- **Last successful synchronization:** Maintains `last_synced_at`, indicating when the module was last successfully synchronized.
- **Synchronization status:** Maintains `sync_status`, which indicates whether synchronization is `idle`, `syncing`, `success`, or `failed`.
- **Attempt tracking:** Maintains `last_attempted_at`, indicating when the most recent synchronization attempt occurred.
- **Error tracking:** Maintains `last_error`, storing details of the most recent synchronization failure.
- **Independent tracking:** Maintains synchronization metadata separately for each cached module.

**Data Persistence**

The `save()` operation creates or updates synchronization metadata for a module using an SQLite upsert operation. If a record with the same module identifier already exists, the supplied values are used to update it.

Only fields explicitly provided in the update are changed. Omitted fields retain their existing values, while explicitly supplied `null` values clear the corresponding fields.

This allows synchronization status and error information to be updated without unintentionally overwriting the timestamp of the last successful synchronization.

**Synchronization Status Management**

The repository supports four synchronization states:

1. `idle` – No synchronization is currently in progress.
2. `syncing` – A synchronization attempt is in progress.
3. `success` – The most recent synchronization completed successfully.
4. `failed` – The most recent synchronization attempt failed.

The metadata fields can be updated independently to record synchronization progress and outcomes. For example, a synchronization attempt can update `sync_status` to `syncing` and set `last_attempted_at`. On successful completion, `sync_status` can be set to `success` and `last_synced_at` updated. If synchronization fails, `sync_status` can be set to `failed` and `last_error` populated while preserving the previous successful synchronization timestamp.

**Data Deletion**

The repository provides operations for removing synchronization metadata:

1. `deleteByModule()` removes the synchronization record associated with a specific module.
2. `clear()` removes all synchronization metadata records.

These operations support targeted synchronization metadata cleanup and complete removal of locally maintained synchronization tracking information.

## 5. Cache Utilities

The database service provides reusable cache utilities for synchronizing API responses with locally stored SQLite data.

These utilities separate caching concerns from application business logic and provide consistent handling of native platform detection, cache persistence, and offline data retrieval.

Cache utilities are implemented in:

`src/services/database/cache.ts`

### 5.1 Available Utilities

| Function                                      | Description                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fetchWithCache(fetcher, repository)`         | Fetches data from an API, saves successful responses to SQLite on native platforms, and falls back to cached data when the request fails due to a network error.                                       |
| `fetchByIdWithCache(fetcher, repository, id)` | Fetches a single record from an API using its ID, saves successful responses to SQLite on native platforms, and falls back to the locally cached record when the request fails due to a network error. |
| `fetchPaginatedWithCache(options)`            | Fetches paginated data from an API, saves successful results to SQLite on native platforms, and falls back to locally cached and paginated data when the request fails due to a network error.         |
| `updateCache(data, repository)`               | Saves an object to SQLite on native platforms without requiring the caller to handle platform detection.                                                                                               |

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
const user = await fetchWithCache(getMe, repositories.users)

// Fetch notification preferences.
const preferences = await fetchWithCache(
    getNotificationPreferences,
    repositories.notificationPreferences
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

| Operation                                  | Web               | Android / iOS                               |
| ------------------------------------------ | ----------------- | ------------------------------------------- |
| API request                                | Executes normally | Executes normally                           |
| Save successful API response               | Skipped           | Performed                                   |
| Retrieve cached data after network failure | Skipped           | Attempted                                   |
| Return cached data when available          | No                | Yes                                         |
| Explicit cache update                      | Skipped           | Performed                                   |
| Cache persistence failure                  | Not applicable    | Logged without affecting the main operation |

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

## 6. Synchronization Utilities

The database service provides reusable synchronization utilities for retrieving data from the backend and keeping locally cached SQLite records up to date.

These utilities separate synchronization logic from application business logic and provide consistent handling of paginated API responses, local persistence, synchronization metadata, and periodic background synchronization.

Synchronization utilities are implemented in:

`src/services/database/sync/`

### 6.1 Available Utilities

| Function | Description |
|---|---|
| `syncPaginated(fetcher, repository, options?)` | Retrieves paginated API responses, saves each page locally, and reconciles stale cached records after successful synchronization. Supports synchronization across multiple scope values, such as groups or SmartPacks. |
| `syncSingle(fetcher, repository)` | Retrieves a single resource from the backend and saves it to the corresponding local repository. |
| `syncModule(module)` | Synchronizes a specific module, updates its synchronization metadata, and prevents duplicate concurrent synchronization of the same module. |
| `syncAll()` | Synchronizes all supported modules sequentially, respecting their dependency order. |
| `startSyncScheduler(options?)` | Starts periodic synchronization with configurable intervals, optional immediate synchronization, and error handling. |
| `stopSyncScheduler()` | Stops the periodic synchronization scheduler. |
| `triggerSync()` | Manually triggers synchronization using the scheduler's synchronization operation. |
| `isSyncSchedulerRunning()` | Checks whether the periodic synchronization scheduler is running. |

### 6.2 Synchronizing a Single Module

The `syncModule()` utility synchronizes an individual module without requiring the application to manage API requests, repository persistence, or synchronization metadata.

**Behaviour**

1. Checks whether the module is already being synchronized.
2. Returns the existing synchronization promise if an operation is already in progress.
3. Updates the module's synchronization status to `syncing`.
4. Executes the corresponding synchronization function.
5. Updates the synchronization status to `success` when synchronization completes.
6. Records the last successful synchronization timestamp.
7. Records synchronization errors and marks the module as `failed` when synchronization fails.

**Usage**

```typescript
import { syncModule } from '@/services/database/sync'

// Synchronize notifications.
const count = await syncModule('notifications')

// Synchronize SmartPacks.
await syncModule('smartpacks')

// Synchronize notification preferences.
await syncModule('notification_preferences')
```

The supported modules are:

| Module | Description |
|---|---|
| `users` | Synchronizes the authenticated user's information. |
| `groups` | Synchronizes the user's groups. |
| `group_members` | Synchronizes members belonging to locally cached groups. |
| `smartpacks` | Synchronizes assigned SmartPacks. |
| `smartpack_sensor_measurements` | Synchronizes sensor measurements belonging to locally cached SmartPacks. |
| `notifications` | Synchronizes notifications. |
| `notification_preferences` | Synchronizes notification preferences. |

Bluetooth sensor measurements are excluded because they are collected and stored locally.

### 6.3 Synchronizing All Modules

The `syncAll()` utility synchronizes all supported modules sequentially.

It ensures that dependent resources are synchronized after their parent resources have been retrieved.

**Synchronization order**

1. Users
2. Groups
3. Group members
4. SmartPacks
5. SmartPack sensor measurements
6. Notifications
7. Notification preferences

**Behaviour**

1. Iterates through all supported synchronization modules.
2. Synchronizes each module using `syncModule()`.
3. Waits for the current module to complete before proceeding.
4. Stops synchronization when a module fails.

**Usage**

```typescript
import { syncAll } from '@/services/database/sync'

// Synchronize all supported modules.
await syncAll()
```

This utility is suitable for initial synchronization after authentication and manual full synchronization requests.

### 6.4 Periodic Synchronization

The synchronization scheduler provides periodic synchronization without requiring individual components to manage timers or repeatedly invoke synchronization functions.

It is implemented in:

`src/services/database/sync/syncScheduler.ts`

**Behaviour**

1. Starts a periodic timer using the configured synchronization interval.
2. Optionally triggers synchronization immediately when started.
3. Invokes `syncAll()` at each scheduled interval.
4. Prevents overlapping synchronization operations.
5. Passes synchronization errors to the configured error handler.
6. Continues scheduling subsequent synchronization attempts after failures.
7. Allows the scheduler to be stopped and restarted.

**Usage**

```typescript
import {
    startSyncScheduler,
    stopSyncScheduler,
} from '@/services/database/sync'

// Start periodic synchronization.
startSyncScheduler({
    intervalMs: 5 * 60 * 1000,
    syncOnStart: true,
    onError: (error) => {
        console.error('Background synchronization failed:', error)
    },
})

// Stop periodic synchronization.
stopSyncScheduler()
```

The scheduler accepts the following configuration:

| Option | Description | Default |
|---|---|---|
| `intervalMs` | Time between synchronization attempts, in milliseconds. | `300000` (5 minutes) |
| `syncOnStart` | Whether to synchronize immediately after starting the scheduler. | `true` |
| `onError` | Callback invoked when a scheduled synchronization fails. | No callback |

### 6.5 Manually Triggering Synchronization

The `triggerSync()` utility allows synchronization to be initiated independently of the scheduler's timer.

This is useful when the user manually requests a refresh or when the application regains network connectivity.

**Usage**

```typescript
import { triggerSync } from '@/services/database/sync'

// Trigger synchronization immediately.
await triggerSync()
```

The scheduler's synchronization operation prevents overlapping executions, including when synchronization is triggered manually while another operation is in progress.

### 6.6 Synchronization Metadata

Synchronization metadata tracks the synchronization state of individual modules.

It is stored in the local SQLite database using the `sync_metadata` table.

| Field | Description |
|---|---|
| `module` | Identifies the synchronized module. |
| `last_synced_at` | Timestamp of the last successful synchronization. |
| `sync_status` | Current synchronization status: `idle`, `syncing`, `success`, or `failed`. |
| `last_attempted_at` | Timestamp of the most recent synchronization attempt. |
| `last_error` | Error message from the most recent failed synchronization. |

When synchronization fails, the previous successful synchronization timestamp is preserved.

This allows the application to distinguish between modules that have never synchronized successfully and modules that previously synchronized but encountered a subsequent failure.

### 6.7 Application Integration

The scheduler should be initialized after successful authentication and database initialization.

For example:

```typescript
import {
    startSyncScheduler,
    stopSyncScheduler,
} from '@/services/database/sync'

async function initializeAuthenticatedApp() {
    await initializeDatabase()

    startSyncScheduler({
        intervalMs: 5 * 60 * 1000,
        syncOnStart: true,
        onError: (error) => {
            console.error('Synchronization failed:', error)
        },
    })
}

function handleLogout() {
    stopSyncScheduler()
}
```

`initializeDatabase()` represents the application's existing database initialization function.

The scheduler should be stopped when the authenticated session ends to prevent synchronization from continuing after logout.

### 6.8 Error Handling

Synchronization utilities propagate errors to their callers while recording module synchronization failures through synchronization metadata.

- **API errors:** Propagated when a backend request fails.
- **Persistence errors:** Propagated when saving or reconciling local records fails.
- **Synchronization failures:** Recorded with a `failed` status and the corresponding error message.
- **Concurrent synchronization:** Duplicate requests for the same module reuse the existing synchronization promise.
- **Scheduled synchronization errors:** Forwarded to the configured `onError` callback.
- **Subsequent attempts:** The scheduler continues attempting synchronization after a failed scheduled operation.

### 6.9 Testing

Synchronization utilities are tested using Vitest with mocked API functions, repositories, synchronization metadata, and fake timers.

The test suites cover:

- Paginated synchronization and page-by-page persistence.
- Scoped synchronization across groups and SmartPacks.
- Removal of stale cached records.
- Single-resource synchronization.
- Synchronization metadata updates and error handling.
- Concurrent synchronization prevention.
- Sequential synchronization and dependency ordering.
- Scheduler initialization, stopping, and restarting.
- Configurable synchronization intervals.
- Manual synchronization triggers.
- Prevention of overlapping scheduled and manual operations.
- Scheduler error handling and subsequent synchronization attempts.

Run the synchronization tests individually:

```bash
pnpm vitest --run src/services/database/sync/__tests__/utils.spec.ts

pnpm vitest --run src/services/database/sync/__tests__/modules.spec.ts

pnpm vitest --run src/services/database/sync/__tests__/syncManager.spec.ts

pnpm vitest --run src/services/database/sync/__tests__/syncScheduler.spec.ts
```

Run all synchronization tests together:

```bash
pnpm vitest --run src/services/database/sync
```

**Current test results:** All four test suites pass, with **65 tests passing** (16 utility tests, 18 module tests, 13 manager tests, and 18 scheduler tests).

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
