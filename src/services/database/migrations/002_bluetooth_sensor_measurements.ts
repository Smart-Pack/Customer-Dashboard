import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

/**
 * Creates the Bluetooth sensor measurements table and its index.
 *
 * Stores sensor readings received directly from SmartPack devices
 * over Bluetooth, separately from REST API measurements.
 *
 * @param database - Active SQLite database connection.
 */
export async function up(database: SQLiteDBConnection): Promise<void> {
  await database.execute(
    `
      CREATE TABLE IF NOT EXISTS cached_bluetooth_sensor_measurements (
        smartpack_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        weight INTEGER NOT NULL,
        steps INTEGER NOT NULL,

        PRIMARY KEY (smartpack_id, timestamp),

        FOREIGN KEY (smartpack_id)
          REFERENCES cached_smartpacks(id)
          ON DELETE CASCADE
      );
    `,
    false,
  )

  await database.execute(
    `
      CREATE INDEX IF NOT EXISTS idx_bluetooth_measurements_smartpack_timestamp
      ON cached_bluetooth_sensor_measurements(smartpack_id, timestamp DESC);
    `,
    false,
  )
}

/**
 * Removes the Bluetooth sensor measurements table.
 *
 * @param database - Active SQLite database connection.
 */
export async function down(database: SQLiteDBConnection): Promise<void> {
  await database.execute(`DROP TABLE IF EXISTS cached_bluetooth_sensor_measurements;`, false)
}
