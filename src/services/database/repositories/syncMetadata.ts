import { getDatabase } from '../database'

/**
 * Identifies a locally cached module that supports synchronization.
 */
export type SyncModule =
  | 'users'
  | 'groups'
  | 'group_members'
  | 'smartpacks'
  | 'smartpack_sensor_measurements'
  | 'bluetooth_sensor_measurements'
  | 'notifications'
  | 'notification_preferences'
  | 'admin_general_analysis'

/**
 * Represents synchronization metadata for a cached module.
 */
export interface SyncMetadata {
  module: SyncModule
  last_synced_at: string | null
  sync_status: 'idle' | 'syncing' | 'success' | 'failed'
  last_attempted_at: string | null
  last_error: string | null
}

/**
 * Parameters for updating module synchronization metadata.
 */
export interface SyncMetadataUpdate {
  module: SyncModule
  last_synced_at?: string | null
  sync_status?: SyncMetadata['sync_status']
  last_attempted_at?: string | null
  last_error?: string | null
}

/**
 * Retrieves synchronization metadata for a module.
 *
 * @param module - Module identifier.
 * @returns Synchronization metadata or null if no record exists.
 */
async function get(module: SyncModule): Promise<SyncMetadata | null> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM sync_metadata
      WHERE module = ?
      LIMIT 1
    `,
    [module],
  )

  const row = result.values?.[0]

  return row ? (row as SyncMetadata) : null
}

/**
 * Retrieves synchronization metadata for all cached modules.
 *
 * @returns Synchronization metadata ordered by module name.
 */
async function getAll(): Promise<SyncMetadata[]> {
  const db = await getDatabase()

  const result = await db.query(`
    SELECT *
    FROM sync_metadata
    ORDER BY module ASC
  `)

  return (result.values ?? []) as SyncMetadata[]
}

/**
 * Creates or updates synchronization metadata for a module.
 *
 * Only fields explicitly provided in the update are changed.
 * Explicitly provided null values clear existing values.
 *
 * @param metadata - Synchronization metadata to persist.
 */
async function save(metadata: SyncMetadataUpdate): Promise<void> {
  const db = await getDatabase()

  const existing = await get(metadata.module)

  const record: SyncMetadata = {
    module: metadata.module,
    last_synced_at:
      metadata.last_synced_at !== undefined
        ? metadata.last_synced_at
        : (existing?.last_synced_at ?? null),
    sync_status: metadata.sync_status ?? existing?.sync_status ?? 'idle',
    last_attempted_at:
      metadata.last_attempted_at !== undefined
        ? metadata.last_attempted_at
        : (existing?.last_attempted_at ?? null),
    last_error:
      metadata.last_error !== undefined ? metadata.last_error : (existing?.last_error ?? null),
  }

  await db.run(
    `
      INSERT INTO sync_metadata (
        module,
        last_synced_at,
        sync_status,
        last_attempted_at,
        last_error
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(module) DO UPDATE SET
        last_synced_at = excluded.last_synced_at,
        sync_status = excluded.sync_status,
        last_attempted_at = excluded.last_attempted_at,
        last_error = excluded.last_error
    `,
    [
      record.module,
      record.last_synced_at,
      record.sync_status,
      record.last_attempted_at,
      record.last_error,
    ],
    false,
  )
}

/**
 * Deletes synchronization metadata for a module.
 *
 * @param module - Module identifier.
 */
async function deleteByModule(module: SyncModule): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `
      DELETE FROM sync_metadata
      WHERE module = ?
    `,
    [module],
    false,
  )
}

/**
 * Removes all synchronization metadata.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM sync_metadata', [], false)
}

/**
 * Retrieves the most recent successful synchronization timestamp.
 *
 * Uses the last successful timestamp of each module, regardless of its
 * current synchronization status.
 *
 * @returns The latest successful synchronization timestamp, or null
 *          if no module has successfully synchronized.
 */
async function getLastSyncedAt(): Promise<string | null> {
  const metadata = await getAll()

  const timestamps = metadata
    .map((record) => record.last_synced_at)
    .filter((timestamp): timestamp is string => timestamp !== null)

  if (timestamps.length === 0) return null

  return timestamps.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  )
}

/**
 * Checks whether all registered synchronization modules have
 * successfully synchronized.
 *
 * @returns True when all metadata records have a successful status.
 */
async function isFullySynced(): Promise<boolean> {
  const metadata = await getAll()

  return metadata.length > 0 && metadata.every((record) => record.sync_status === 'success')
}

export { get, getAll, save, deleteByModule, clear, getLastSyncedAt, isFullySynced }
