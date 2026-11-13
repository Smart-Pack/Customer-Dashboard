import { getDatabase } from '../database'

import type { Group } from '@/api/modules/groups'

/**
 * Represents a cached group summary.
 */
export interface CachedGroup {
  id: number
  name: string
  total_users: number
  total_smartpacks: number
  created: string
  updated: string
  cached_at: string
}

/**
 * Saves a group summary to the local SQLite database.
 *
 * Inserts a new group or updates an existing record when its ID already exists.
 *
 * @param group - Group summary retrieved from the API.
 */
async function save(group: Group): Promise<void> {
  const db = await getDatabase()

  await db.run(
    `INSERT INTO cached_groups (
      id, name, total_users, total_smartpacks, created, updated, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      total_users = excluded.total_users,
      total_smartpacks = excluded.total_smartpacks,
      created = excluded.created,
      updated = excluded.updated,
      cached_at = excluded.cached_at`,
    [
      group.id,
      group.name,
      group.total_users,
      group.total_smartpacks,
      group.created,
      group.updated,
      new Date().toISOString(),
    ],
    false,
  )
}

/**
 * Saves a list of groups to the local SQLite database.
 *
 * Uses a transaction to ensure all group summaries are persisted together.
 * Delegates individual group persistence to save().
 *
 * @param groups - Groups retrieved from the API.
 */
async function saveList(groups: Group[]): Promise<void> {
  const db = await getDatabase()

  try {
    await db.beginTransaction()

    for (const group of groups) {
      await save(group)
    }

    await db.commitTransaction()
  } catch (error) {
    try {
      await db.rollbackTransaction()
    } catch (rollbackError) {
      console.error('[Database] Failed to roll back group cache transaction:', rollbackError)
    }

    console.error('[Database] Failed to save groups:', error)
    throw error
  }
}

/**
 * Retrieves all cached group summaries.
 *
 * @returns Cached groups ordered by ID, or an empty array.
 */
async function getAll(): Promise<CachedGroup[]> {
  const db = await getDatabase()

  const result = await db.query(`
    SELECT *
    FROM cached_groups
    ORDER BY id ASC
  `)

  return result.values ?? []
}

/**
 * Retrieves a cached group by its ID.
 *
 * @param id - Group ID.
 * @returns Cached group or null when not found.
 */
async function get(id: number): Promise<CachedGroup | null> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_groups
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )

  return result.values?.[0] ?? null
}

/**
 * Clears all cached group summaries.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_groups')
}

/**
 * Deletes a cached group by its ID.
 *
 * @param id - ID of the group to delete.
 */
async function deleteById(id: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_groups WHERE id = ?', [id])
}
export { save, saveList, getAll, get, clear, deleteById }
