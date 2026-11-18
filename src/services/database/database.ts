import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'

import { secureTokenStorage } from '../secureTokenStorage'
import { runMigrations } from './migrations'

const DATABASE_NAME = 'smartpack'
const DATABASE_VERSION = 1
const DATABASE_ENCRYPTED = true
const DATABASE_MODE = 'secret'
const DATABASE_READ_ONLY = false

const sqlite = new SQLiteConnection(CapacitorSQLite)

let database: SQLiteDBConnection | null = null
let initializationPromise: Promise<SQLiteDBConnection | null> | null = null

/**
 * Generates a cryptographically secure 256-bit SQLite passphrase.
 */
function generateSqlitePassphrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Ensures that the SQLite encryption passphrase exists in both
 * application secure storage and the SQLite plugin's secret store.
 */
async function initializeEncryptionSecret(): Promise<void> {
  let passphrase = await secureTokenStorage.getSqlitePassphrase()

  // Generate and persist a passphrase if this is the first launch.
  if (!passphrase) {
    passphrase = generateSqlitePassphrase()

    await secureTokenStorage.setSqlitePassphrase(passphrase)
  }

  // Check whether the SQLite plugin already has an encryption secret.
  const { result: isSecretStored } = await sqlite.isSecretStored()

  if (!isSecretStored) {
    await sqlite.setEncryptionSecret(passphrase)
    return
  }

  // Verify that the plugin's existing secret matches our stored passphrase.
  const { result: isValid } = await sqlite.checkEncryptionSecret(passphrase)

  if (!isValid) {
    throw new Error('The stored SQLite passphrase does not match the SQLite encryption secret.')
  }
}

/**
 * Initializes the SmartPack SQLite database.
 *
 * Creates the database if it does not exist and reuses an
 * existing connection when possible.
 *
 * SQLite initialization is restricted to native platforms.
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
      // Register and validate the encryption secret before opening the DB.
      await initializeEncryptionSecret()

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

      console.info('[Database] Encrypted SQLite database initialized successfully.')

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
