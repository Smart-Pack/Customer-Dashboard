import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { up as initialSchema } from './001_initial_schema'
import { up as bluetoothSensorMeasurements } from './002_bluetooth_sensor_measurements'
import { up as syncMetadata } from './003_sync_metadata'

interface Migration {
  version: number
  name: string
  up: (database: SQLiteDBConnection) => Promise<void>
}

/**
 * Register database migrations in ascending version order.
 *
 * Never modify an already-applied migration.
 * Create a new migration whenever the schema changes.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: initialSchema,
  },
  {
    version: 2,
    name: 'bluetooth_sensor_measurements',
    up: bluetoothSensorMeasurements,
  },
  {
    version: 3,
    name: 'sync_metadata',
    up: syncMetadata,
  },
]

/**
 * Retrieves the current SQLite schema version.
 */
async function getCurrentVersion(database: SQLiteDBConnection): Promise<number> {
  const result = await database.query('PRAGMA user_version')

  return Number(result.values?.[0]?.user_version ?? 0)
}

/**
 * Validates registered migrations.
 */
function validateMigrations(): void {
  const versions = MIGRATIONS.map((migration) => migration.version)

  if (versions.some((version) => !Number.isInteger(version) || version < 1)) {
    throw new Error('[Database] Migration versions must be positive integers.')
  }

  if (new Set(versions).size !== versions.length) {
    throw new Error('[Database] Duplicate migration versions detected.')
  }

  const sortedVersions = [...versions].sort((a, b) => a - b)

  if (versions.some((version, index) => version !== sortedVersions[index])) {
    throw new Error('[Database] Migrations must be registered in ascending order.')
  }

  for (let index = 0; index < sortedVersions.length; index++) {
    if (sortedVersions[index] !== index + 1) {
      throw new Error('[Database] Migration versions must be consecutive.')
    }
  }
}

/**
 * Runs all pending database migrations.
 *
 * Each migration is executed inside its own transaction.
 * The database version advances only after the migration succeeds.
 */
export async function runMigrations(database: SQLiteDBConnection): Promise<void> {
  validateMigrations()

  const currentVersion = await getCurrentVersion(database)
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0

  if (currentVersion > latestVersion) {
    throw new Error(
      `[Database] Database version ${currentVersion} is newer than the ` +
        `application migration version ${latestVersion}.`,
    )
  }

  const pendingMigrations = MIGRATIONS.filter((migration) => migration.version > currentVersion)

  if (pendingMigrations.length === 0) {
    return
  }

  console.info(`[Database] Applying ${pendingMigrations.length} pending migration(s).`)

  for (const migration of pendingMigrations) {
    console.info(`[Database] Applying migration ${migration.version}: ${migration.name}`)

    let transactionStarted = false

    try {
      await database.beginTransaction()
      transactionStarted = true

      // Execute migration statements inside the existing transaction.
      await migration.up(database)

      // Disable automatic transaction management.
      await database.execute(`PRAGMA user_version = ${migration.version}`, false)

      await database.commitTransaction()
      transactionStarted = false

      console.info(`[Database] Migration ${migration.version} completed successfully.`)
    } catch (error) {
      if (transactionStarted) {
        try {
          await database.rollbackTransaction()
        } catch (rollbackError) {
          console.error('[Database] Failed to roll back migration:', rollbackError)
        }
      }

      console.error(`[Database] Migration ${migration.version} failed:`, error)

      const migrationError = new Error(
        `Database migration ${migration.version} (${migration.name}) failed.`,
      )

      Object.defineProperty(migrationError, 'cause', {
        value: error,
        configurable: true,
      })

      throw migrationError
    }
  }

  console.info('[Database] All migrations completed successfully.')
}
