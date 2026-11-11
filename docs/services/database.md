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
