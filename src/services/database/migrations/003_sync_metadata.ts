import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

/**
 * Creates the module synchronization metadata table.
 *
 * Tracks synchronization status, the last successful synchronization
 * timestamp, the most recent attempt, and any synchronization error
 * independently for each cached module.
 *
 * @param database - Active SQLite database connection.
 */
export async function up(database: SQLiteDBConnection): Promise<void> {
  await database.execute(
    `
      CREATE TABLE IF NOT EXISTS sync_metadata (
        module TEXT PRIMARY KEY NOT NULL,

        last_synced_at TEXT,

        sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (
          sync_status IN ('idle', 'syncing', 'success', 'failed')
        ),

        last_attempted_at TEXT,

        last_error TEXT
      );
    `,
    false,
  )
}

/**
 * Removes the module synchronization metadata table.
 *
 * @param database - Active SQLite database connection.
 */
export async function down(database: SQLiteDBConnection): Promise<void> {
  await database.execute(`DROP TABLE IF EXISTS sync_metadata;`, false)
}
