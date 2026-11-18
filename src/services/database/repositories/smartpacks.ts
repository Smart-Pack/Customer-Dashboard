import { getDatabase } from '../database'
import { paginate } from '../pagination'

import type { SmartPack, SmartPackQueryParams } from '@/api/modules/smartpacks'
import type { PaginatedResponse } from '@/api/types'

/**
 * Represents a cached SmartPack with its local cache timestamp.
 */
export interface CachedSmartPack extends SmartPack {
  cached_at: string
}

/**
 * Represents a flattened SmartPack record retrieved from SQLite.
 */
interface CachedSmartPackRow extends Omit<SmartPack, 'is_online' | 'assigned_to' | 'group'> {
  is_online: number

  assigned_user_id: number | null
  assigned_user_uuid: string | null
  assigned_user_full_name: string | null
  assigned_user_email: string | null
  assigned_user_phone: string | null

  group_id: number | null
  group_name: string | null

  cached_at: string
}

/**
 * Converts a flattened SQLite SmartPack record into the API SmartPack structure.
 *
 * @param row - Flattened SmartPack record retrieved from SQLite.
 * @returns SmartPack with nested assigned user and group objects.
 */
function mapRow(row: CachedSmartPackRow): CachedSmartPack {
  return {
    id: row.id,
    device_uid: row.device_uid,
    hardware_model: row.hardware_model,
    imei: row.imei,
    firmware_version: row.firmware_version,
    bluetooth_mac_address: row.bluetooth_mac_address,
    last_seen: row.last_seen,
    is_online: Boolean(row.is_online),

    assigned_to:
      row.assigned_user_id !== null
        ? {
            id: row.assigned_user_id,
            uuid: row.assigned_user_uuid!,
            full_name: row.assigned_user_full_name!,
            email: row.assigned_user_email!,
            phone: row.assigned_user_phone!,
          }
        : null,

    child_name: row.child_name,

    group:
      row.group_id !== null
        ? {
            id: row.group_id,
            name: row.group_name!,
          }
        : null,

    created: row.created,
    updated: row.updated,
    cached_at: row.cached_at,
  }
}

/**
 * Saves a SmartPack to the local SQLite database.
 *
 * Inserts a new SmartPack or updates an existing record when its ID already exists.
 *
 * @param smartPack - SmartPack retrieved from the API.
 */
async function save(smartPack: SmartPack): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `INSERT INTO cached_smartpacks (
      id,
      device_uid,
      hardware_model,
      imei,
      firmware_version,
      bluetooth_mac_address,
      last_seen,
      is_online,
      assigned_user_id,
      assigned_user_uuid,
      assigned_user_full_name,
      assigned_user_email,
      assigned_user_phone,
      child_name,
      group_id,
      group_name,
      created,
      updated,
      cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      device_uid = excluded.device_uid,
      hardware_model = excluded.hardware_model,
      imei = excluded.imei,
      firmware_version = excluded.firmware_version,
      bluetooth_mac_address = excluded.bluetooth_mac_address,
      last_seen = excluded.last_seen,
      is_online = excluded.is_online,
      assigned_user_id = excluded.assigned_user_id,
      assigned_user_uuid = excluded.assigned_user_uuid,
      assigned_user_full_name = excluded.assigned_user_full_name,
      assigned_user_email = excluded.assigned_user_email,
      assigned_user_phone = excluded.assigned_user_phone,
      child_name = excluded.child_name,
      group_id = excluded.group_id,
      group_name = excluded.group_name,
      created = excluded.created,
      updated = excluded.updated,
      cached_at = excluded.cached_at`,
    [
      smartPack.id,
      smartPack.device_uid,
      smartPack.hardware_model,
      smartPack.imei,
      smartPack.firmware_version,
      smartPack.bluetooth_mac_address,
      smartPack.last_seen,
      Number(smartPack.is_online),

      smartPack.assigned_to?.id ?? null,
      smartPack.assigned_to?.uuid ?? null,
      smartPack.assigned_to?.full_name ?? null,
      smartPack.assigned_to?.email ?? null,
      smartPack.assigned_to?.phone ?? null,

      smartPack.child_name,

      smartPack.group?.id ?? null,
      smartPack.group?.name ?? null,

      smartPack.created,
      smartPack.updated,
      new Date().toISOString(),
    ],
    false,
  )
}

/**
 * Saves a list of SmartPacks to the local SQLite database.
 *
 * Uses a transaction to ensure all SmartPacks are persisted together.
 * Delegates individual SmartPack persistence to save().
 *
 * @param smartPacks - SmartPacks retrieved from the API.
 */
async function saveList(smartPacks: SmartPack[]): Promise<void> {
  const db = await getDatabase()

  try {
    await db.beginTransaction()

    for (const smartPack of smartPacks) {
      await save(smartPack)
    }

    await db.commitTransaction()
  } catch (error) {
    try {
      await db.rollbackTransaction()
    } catch (rollbackError) {
      console.error('[Database] Failed to roll back SmartPack cache transaction:', rollbackError)
    }

    console.error('[Database] Failed to save SmartPacks:', error)
    throw error
  }
}

/**
 * Retrieves all cached SmartPacks.
 *
 * @returns Cached SmartPacks ordered by ID, or an empty array.
 */
async function getAll(): Promise<CachedSmartPack[]> {
  const db = await getDatabase()

  const result = await db.query(`
    SELECT *
    FROM cached_smartpacks
    ORDER BY id ASC
  `)

  return (result.values ?? []).map((row) => mapRow(row as unknown as CachedSmartPackRow))
}

/**
 * Retrieves a cached SmartPack by its ID.
 *
 * @param id - SmartPack ID.
 * @returns Cached SmartPack or null when not found.
 */
async function get(id: number): Promise<CachedSmartPack | null> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_smartpacks
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  const row = result.values?.[0]

  return row ? mapRow(row as unknown as CachedSmartPackRow) : null
}

/**
 * Retrieves all cached SmartPacks belonging to a group.
 *
 * @param groupId - Group ID.
 * @returns Cached SmartPacks belonging to the group.
 */
async function getByGroupId(groupId: number): Promise<CachedSmartPack[]> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_smartpacks
      WHERE group_id = ?
    `,
    [groupId],
  )

  return (result.values ?? []).map((row) => mapRow(row as unknown as CachedSmartPackRow))
}

/**
 * Retrieves cached SmartPacks, applies filters, and paginates the resulting records.
 *
 * @param params - SmartPack filters and pagination parameters.
 * @returns Locally filtered and paginated SmartPacks.
 */
async function getPaginated(
  params: SmartPackQueryParams,
): Promise<PaginatedResponse<CachedSmartPack>> {
  let smartPacks = await getAll()

  if (params.assigned_to !== undefined) {
    smartPacks = smartPacks.filter((smartPack) => smartPack.assigned_to?.id === params.assigned_to)
  }

  if (params.group !== undefined) {
    smartPacks = smartPacks.filter((smartPack) => smartPack.group?.id === params.group)
  }

  if (params.is_assigned !== undefined) {
    smartPacks = smartPacks.filter(
      (smartPack) => (smartPack.assigned_to !== null) === params.is_assigned,
    )
  }

  if (params.has_group !== undefined) {
    smartPacks = smartPacks.filter((smartPack) => (smartPack.group !== null) === params.has_group)
  }

  return paginate(smartPacks, params.page ?? 1, params.page_size ?? 10)
}

/**
 * Clears all cached SmartPacks.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_smartpacks')
}

/**
 * Deletes a cached SmartPack by its ID.
 *
 * @param id - ID of the SmartPack to delete.
 */
async function deleteById(id: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_smartpacks WHERE id = ?', [id])
}

export { save, saveList, getAll, get, getPaginated, getByGroupId, clear, deleteById }
