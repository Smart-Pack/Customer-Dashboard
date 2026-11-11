import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { runMigrations } from './migrations'

const DATABASE_NAME = 'smartpack'
const DATABASE_VERSION = 1
const DATABASE_ENCRYPTED = false
const DATABASE_MODE = 'no-encryption'
const DATABASE_READ_ONLY = false

const sqlite = new SQLiteConnection(CapacitorSQLite)

let database: SQLiteDBConnection | null = null

let initializationPromise: Promise<SQLiteDBConnection | null> | null = null

/**
 * Initializes the SmartPack SQLite database.
 *
 * Creates the database if it does not exist and reuses an
 * existing connection when possible.
 *
 * SQLite initialization is currently restricted to native
 * platforms (Android/iOS).
 */
export async function initializeDatabase(): Promise<SQLiteDBConnection | null> {
  if (!Capacitor.isNativePlatform()) {
    console.info('[Database] SQLite initialization skipped on web.')
    return null
  }

  if (database) {
    return database
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      await sqlite.checkConnectionsConsistency()

      const connectionExists = await sqlite.isConnection(DATABASE_NAME, DATABASE_READ_ONLY)

      if (connectionExists.result) {
        database = await sqlite.retrieveConnection(DATABASE_NAME, DATABASE_READ_ONLY)
      } else {
        database = await sqlite.createConnection(
          DATABASE_NAME,
          DATABASE_ENCRYPTED,
          DATABASE_MODE,
          DATABASE_VERSION,
          DATABASE_READ_ONLY,
        )
      }

      const isOpen = await database.isDBOpen()

      if (!isOpen.result) {
        await database.open()
      }

      await database.execute('PRAGMA foreign_keys = ON;')
      await runMigrations(database)
      console.info('[Database] SQLite initialized successfully.')

      return database
    } catch (error) {
      database = null

      console.error('[Database] Failed to initialize SQLite:', error)

      throw error
    }
  })()

  try {
    return await initializationPromise
  } finally {
    initializationPromise = null
  }
}

/**
 * Returns the initialized database connection.
 */
export function getDatabase(): SQLiteDBConnection {
  if (!database) {
    throw new Error('SQLite database is not initialized. Call initializeDatabase() first.')
  }

  return database
}

/**
 * Closes the SmartPack database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (!database) {
    return
  }

  await sqlite.closeConnection(DATABASE_NAME, DATABASE_READ_ONLY)

  database = null

  console.info('[Database] SQLite connection closed.')
}
