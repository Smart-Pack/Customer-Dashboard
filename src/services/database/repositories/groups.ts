import { getDatabase } from '../database'
import { paginate } from '../pagination'

import type { Group, GroupQueryParams } from '@/api/modules/groups'
import type { PaginatedResponse, PaginationQueryParams } from '@/api/types'
import type { UserGroup } from '@/api/modules/users'

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

/**
 * Retrieves cached groups, applies user-specific filters, and paginates
 * the resulting records.
 *
 * @param params - Group filters and pagination parameters.
 * @param userGroups - Groups associated with the authenticated user.
 * @returns Locally filtered and paginated groups.
 */
async function getPaginated(
  params: GroupQueryParams & PaginationQueryParams,
  userGroups: UserGroup[],
): Promise<PaginatedResponse<CachedGroup>> {
  const groups = await getAll()

  let filteredGroups = groups

  if (params.has_admin_access === true) {
    const adminGroupIds = new Set(
      userGroups
        .filter((group) => ['owner', 'admin'].includes(group.role))
        .map((group) => group.id),
    )

    filteredGroups = groups.filter((group) => adminGroupIds.has(group.id))
  } else if (params.role) {
    const matchingGroupIds = new Set(
      userGroups.filter((group) => group.role === params.role).map((group) => group.id),
    )

    filteredGroups = groups.filter((group) => matchingGroupIds.has(group.id))
  }

  return paginate(filteredGroups, params.page ?? 1, params.page_size ?? 10)
}

export { save, saveList, getAll, get, getPaginated, clear, deleteById }
