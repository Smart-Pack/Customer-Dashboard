import { getDatabase } from '../database'
import { withTransaction } from '../transaction'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { paginate } from '../pagination'

import type { PaginatedResponse } from '@/api/types'
import type { SmartPackSensorRecord } from '@/types/bluetooth'

/**
 * Represents a cached Bluetooth sensor measurement.
 */
export interface CachedBluetoothSensorMeasurement extends SmartPackSensorRecord {
  smartpack_id: number
}

/**
 * Inserts or updates a Bluetooth sensor measurement.
 *
 * A measurement is uniquely identified by its SmartPack ID and timestamp.
 *
 * @param db - Active SQLite database connection.
 * @param smartpackId - ID of the associated SmartPack.
 * @param measurement - Bluetooth sensor reading to persist.
 */
async function upsert(
  db: SQLiteDBConnection,
  smartpackId: number,
  measurement: SmartPackSensorRecord,
): Promise<void> {
  await db.run(
    `INSERT INTO cached_bluetooth_sensor_measurements (
      smartpack_id,
      timestamp,
      weight,
      steps
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT(smartpack_id, timestamp) DO UPDATE SET
      weight = excluded.weight,
      steps = excluded.steps`,
    [smartpackId, measurement.timestamp, measurement.weight, measurement.steps],
    false,
  )
}

/**
 * Saves a Bluetooth sensor measurement to the local SQLite database.
 *
 * Inserts a new measurement or updates an existing record when its
 * SmartPack ID and timestamp already exist.
 *
 * @param smartpackId - ID of the associated SmartPack.
 * @param measurement - Sensor reading received over Bluetooth.
 */
async function save(smartpackId: number, measurement: SmartPackSensorRecord): Promise<void> {
  await withTransaction((db) => upsert(db, smartpackId, measurement))
}

/**
 * Saves a list of Bluetooth sensor measurements to the local SQLite database.
 *
 * Uses a transaction to ensure all measurements are persisted together.
 *
 * @param smartpackId - ID of the associated SmartPack.
 * @param measurements - Bluetooth sensor readings to persist.
 */
async function saveList(smartpackId: number, measurements: SmartPackSensorRecord[]): Promise<void> {
  try {
    await withTransaction(async (db) => {
      for (const measurement of measurements) {
        await upsert(db, smartpackId, measurement)
      }
    })
  } catch (error) {
    console.error('[Database] Failed to save Bluetooth sensor measurements:', error)
    throw error
  }
}

/**
 * Retrieves all cached Bluetooth sensor measurements.
 *
 * @returns Bluetooth measurements ordered by timestamp, or an empty array.
 */
async function getAll(): Promise<CachedBluetoothSensorMeasurement[]> {
  const db = await getDatabase()

  const result = await db.query(`
    SELECT *
    FROM cached_bluetooth_sensor_measurements
    ORDER BY timestamp DESC
  `)

  return (result.values ?? []) as CachedBluetoothSensorMeasurement[]
}

/**
 * Retrieves Bluetooth sensor measurements belonging to a SmartPack.
 *
 * @param smartpackId - ID of the associated SmartPack.
 * @returns Matching Bluetooth measurements ordered by timestamp.
 */
async function getBySmartPackId(smartpackId: number): Promise<CachedBluetoothSensorMeasurement[]> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_bluetooth_sensor_measurements
      WHERE smartpack_id = ?
      ORDER BY timestamp DESC
    `,
    [smartpackId],
  )

  return (result.values ?? []) as CachedBluetoothSensorMeasurement[]
}

/**
 * Retrieves cached Bluetooth sensor measurements and paginates the results.
 *
 * @param smartpackId - ID of the associated SmartPack.
 * @param params - Pagination parameters.
 * @returns Locally paginated Bluetooth sensor measurements.
 */
async function getPaginated(
  smartpackId: number,
  params: { page?: number; page_size?: number },
): Promise<PaginatedResponse<CachedBluetoothSensorMeasurement>> {
  const measurements = await getBySmartPackId(smartpackId)

  return paginate(measurements, params.page ?? 1, params.page_size ?? 10)
}

/**
 * Clears all cached Bluetooth sensor measurements.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_bluetooth_sensor_measurements')
}

/**
 * Deletes Bluetooth sensor measurements belonging to a SmartPack.
 *
 * @param smartpackId - ID of the SmartPack whose measurements should be deleted.
 */
async function deleteBySmartPackId(smartpackId: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_bluetooth_sensor_measurements WHERE smartpack_id = ?', [
    smartpackId,
  ])
}

/**
 * Deletes a Bluetooth sensor measurement by its SmartPack ID and timestamp.
 *
 * @param smartpackId - ID of the associated SmartPack.
 * @param timestamp - Timestamp identifying the measurement.
 */
async function deleteByTimestamp(smartpackId: number, timestamp: string): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `DELETE FROM cached_bluetooth_sensor_measurements
     WHERE smartpack_id = ? AND timestamp = ?`,
    [smartpackId, timestamp],
  )
}

export {
  save,
  saveList,
  getAll,
  getBySmartPackId,
  getPaginated,
  clear,
  deleteBySmartPackId,
  deleteByTimestamp,
}
