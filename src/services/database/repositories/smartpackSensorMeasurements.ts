import { getDatabase } from '../database'
import { paginate } from '../pagination'

import type {
  SmartPackSensorMeasurement,
  SmartPackSensorMeasurementQueryParams,
} from '@/api/modules/smartpacks'
import type { PaginatedResponse } from '@/api/types'

/**
 * Represents a cached SmartPack sensor measurement with its local cache timestamp.
 */
export interface CachedSmartPackSensorMeasurement extends SmartPackSensorMeasurement {
  smartpack_id: number
  cached_at: string
}

/**
 * Saves a SmartPack sensor measurement to the local SQLite database.
 *
 * Inserts a new measurement or updates an existing record when its ID already exists.
 *
 * @param smartpackId - ID of the SmartPack associated with the measurement.
 * @param measurement - Sensor measurement retrieved from the API.
 */
async function save(smartpackId: number, measurement: SmartPackSensorMeasurement): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `INSERT INTO cached_smartpack_sensor_measurements (
      id,
      smartpack_id,
      steps,
      weight,
      timestamp,
      created,
      updated,
      cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      smartpack_id = excluded.smartpack_id,
      steps = excluded.steps,
      weight = excluded.weight,
      timestamp = excluded.timestamp,
      created = excluded.created,
      updated = excluded.updated,
      cached_at = excluded.cached_at`,
    [
      measurement.id,
      smartpackId,
      measurement.steps,
      measurement.weight,
      measurement.timestamp,
      measurement.created,
      measurement.updated,
      new Date().toISOString(),
    ],
    false,
  )
}

/**
 * Saves a list of SmartPack sensor measurements to the local SQLite database.
 *
 * Uses a transaction to ensure all measurements are persisted together.
 * Delegates individual measurement persistence to save().
 *
 * @param smartpackId - ID of the SmartPack associated with the measurements.
 * @param measurements - Sensor measurements retrieved from the API.
 */
async function saveList(
  smartpackId: number,
  measurements: SmartPackSensorMeasurement[],
): Promise<void> {
  const db = await getDatabase()

  try {
    await db.beginTransaction()

    for (const measurement of measurements) {
      await save(smartpackId, measurement)
    }

    await db.commitTransaction()
  } catch (error) {
    try {
      await db.rollbackTransaction()
    } catch (rollbackError) {
      console.error(
        '[Database] Failed to roll back sensor measurement cache transaction:',
        rollbackError,
      )
    }

    console.error('[Database] Failed to save SmartPack sensor measurements:', error)
    throw error
  }
}

/**
 * Retrieves all cached SmartPack sensor measurements.
 *
 * @returns Cached measurements ordered by timestamp, or an empty array.
 */
async function getAll(): Promise<CachedSmartPackSensorMeasurement[]> {
  const db = await getDatabase()

  const result = await db.query(`
    SELECT *
    FROM cached_smartpack_sensor_measurements
    ORDER BY timestamp DESC
  `)

  return (result.values ?? []) as CachedSmartPackSensorMeasurement[]
}

/**
 * Retrieves a cached sensor measurement by its ID.
 *
 * @param id - Sensor measurement ID.
 * @returns Cached measurement or null when not found.
 */
async function get(id: number): Promise<CachedSmartPackSensorMeasurement | null> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_smartpack_sensor_measurements
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  const row = result.values?.[0]

  return row ? (row as CachedSmartPackSensorMeasurement) : null
}

/**
 * Retrieves cached sensor measurements, applies filters, and paginates the results.
 *
 * @param params - SmartPack sensor measurement filters and pagination parameters.
 * @returns Locally filtered and paginated sensor measurements.
 */
async function getPaginated(
  params: SmartPackSensorMeasurementQueryParams,
): Promise<PaginatedResponse<CachedSmartPackSensorMeasurement>> {
  const db = await getDatabase()

  let query = `
    SELECT *
    FROM cached_smartpack_sensor_measurements
    WHERE 1 = 1
  `
  const values: (number | string)[] = []

  if (params.smartpack !== undefined) {
    query += ' AND smartpack_id = ?'
    values.push(params.smartpack)
  }

  if (params.timestamp_gte !== undefined) {
    query += ' AND timestamp >= ?'
    values.push(params.timestamp_gte)
  }

  if (params.timestamp_lte !== undefined) {
    query += ' AND timestamp <= ?'
    values.push(params.timestamp_lte)
  }

  query += ' ORDER BY timestamp DESC'

  const result = await db.query(query, values)

  const measurements = (result.values ?? []) as CachedSmartPackSensorMeasurement[]

  return paginate(measurements, params.page ?? 1, params.page_size ?? 10)
}

/**
 * Clears all cached SmartPack sensor measurements.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_smartpack_sensor_measurements')
}

/**
 * Deletes cached sensor measurements belonging to a SmartPack.
 *
 * @param smartpackId - ID of the SmartPack whose measurements should be deleted.
 */
async function deleteBySmartPackId(smartpackId: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_smartpack_sensor_measurements WHERE smartpack_id = ?', [
    smartpackId,
  ])
}

/**
 * Deletes a cached sensor measurement by its ID.
 *
 * @param id - ID of the sensor measurement to delete.
 */
async function deleteById(id: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_smartpack_sensor_measurements WHERE id = ?', [id])
}

export { save, saveList, getAll, get, getPaginated, clear, deleteBySmartPackId, deleteById }
