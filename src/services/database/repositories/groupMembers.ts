import { getDatabase } from '../database'
import { withTransaction } from '../transaction'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { paginate } from '../pagination'

import type { GroupMember } from '@/api/modules/groups'
import type { GroupMemberQueryParams } from '@/api/modules/groupMembers'
import type { PaginatedResponse } from '@/api/types'

/**
 * Represents a cached group member.
 */
export interface CachedGroupMember extends Omit<GroupMember, 'user'> {
  user: GroupMember['user']
  group_id: number
  cached_at: string
}

/**
 * Represents a raw cached group member database row.
 */
interface CachedGroupMemberRow extends Omit<GroupMember, 'user'> {
  group_id: number
  user_id: number
  user_uuid: string
  user_full_name: string
  user_email: string
  user_phone: string
  cached_at: string
}

/**
 * Converts a flattened SQLite group member record into the API GroupMember structure.
 *
 * @param row - Flattened group member record retrieved from SQLite.
 * @returns Group member with its nested user object.
 */
function mapRow(row: CachedGroupMemberRow): CachedGroupMember {
  return {
    id: row.id,
    user: {
      id: row.user_id,
      uuid: row.user_uuid,
      full_name: row.user_full_name,
      email: row.user_email,
      phone: row.user_phone,
    },
    role: row.role,
    created: row.created,
    updated: row.updated,
    group_id: row.group_id,
    cached_at: row.cached_at,
  }
}

async function upsert(db: SQLiteDBConnection, groupId: number, member: GroupMember): Promise<void> {
  await db.run(
    `INSERT INTO cached_group_members (
      id, group_id, user_id, user_uuid, user_full_name,
      user_email, user_phone, role, created, updated, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(group_id, id) DO UPDATE SET
      user_id = excluded.user_id,
      user_uuid = excluded.user_uuid,
      user_full_name = excluded.user_full_name,
      user_email = excluded.user_email,
      user_phone = excluded.user_phone,
      role = excluded.role,
      created = excluded.created,
      updated = excluded.updated,
      cached_at = excluded.cached_at`,
    [
      member.id,
      groupId,
      member.user.id,
      member.user.uuid,
      member.user.full_name,
      member.user.email,
      member.user.phone,
      member.role,
      member.created,
      member.updated,
      new Date().toISOString(),
    ],
    false,
  )
}

/**
 * Saves a group member to the local SQLite database.
 *
 * Inserts a new member or updates an existing record when its
 * group ID and member ID already exist.
 *
 * @param groupId - ID of the group the member belongs to.
 * @param member - Group member retrieved from the API.
 */
async function save(groupId: number, member: GroupMember): Promise<void> {
  await withTransaction((db) => upsert(db, groupId, member))
}

/**
 * Saves a list of group members to the local SQLite database.
 *
 * Uses a transaction to ensure all members are persisted together.
 * Delegates individual member persistence to save().
 *
 * @param groupId - ID of the group the members belong to.
 * @param members - Group members retrieved from the API.
 */
async function saveList(groupId: number, members: GroupMember[]): Promise<void> {
  try {
    await withTransaction(async (db) => {
      for (const member of members) {
        await upsert(db, groupId, member)
      }
    })
  } catch (error) {
    console.error('[Database] Failed to save group members:', error)
    throw error
  }
}

/**
 * Replaces cached group members with the supplied list.
 *
 * Inserts new members, updates existing members, and deletes
 * cached members that are no longer present in the supplied list.
 *
 * Uses a transaction to ensure the replacement is atomic.
 *
 * @param groupId - ID of the group the members belong to.
 * @param members - Latest group members retrieved from the API.
 */
async function replaceList(groupId: number, members: GroupMember[]): Promise<void> {
  try {
    await withTransaction(async (db) => {
      if (members.length > 0) {
        const placeholders = members.map(() => '?').join(', ')
        await db.run(
          `DELETE FROM cached_group_members
           WHERE group_id = ? AND id NOT IN (${placeholders})`,
          [groupId, ...members.map((m) => m.id)],
          false,
        )
      } else {
        await db.run('DELETE FROM cached_group_members WHERE group_id = ?', [groupId], false)
      }

      for (const member of members) {
        await upsert(db, groupId, member)
      }
    })
  } catch (error) {
    console.error('[Database] Failed to replace group members:', error)
    throw error
  }
}

/**
 * Retrieves all cached group members.
 *
 * @returns Cached group members ordered by ID, or an empty array.
 */
async function getAll(): Promise<CachedGroupMember[]> {
  const db = await getDatabase()

  const result = await db.query(`
    SELECT *
    FROM cached_group_members
    ORDER BY id ASC
  `)

  return (result.values ?? []).map((row) => mapRow(row as unknown as CachedGroupMemberRow))
}

/**
 * Retrieves a cached group member by its group ID and member ID.
 *
 * @param groupId - ID of the group.
 * @param id - Group member ID.
 * @returns Cached group member or null when not found.
 */
async function get(groupId: number, id: number): Promise<CachedGroupMember | null> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_group_members
      WHERE group_id = ? AND id = ?
      LIMIT 1
    `,
    [groupId, id],
  )

  const row = result.values?.[0]

  return row ? mapRow(row as unknown as CachedGroupMemberRow) : null
}

/**
 * Retrieves all cached members belonging to a specific group.
 *
 * @param groupId - ID of the group.
 * @returns Cached group members.
 */
async function getByGroupId(groupId: number): Promise<CachedGroupMember[]> {
  const db = await getDatabase()

  const result = await db.query(
    `
      SELECT *
      FROM cached_group_members
      WHERE group_id = ?
      ORDER BY id ASC
    `,
    [groupId],
  )

  return (result.values ?? []).map((row) => mapRow(row as unknown as CachedGroupMemberRow))
}

/**
 * Retrieves cached group members, applies filters, and paginates
 * the resulting records.
 *
 * @param params - Group member filters and pagination parameters.
 * @returns Locally filtered and paginated group members.
 */
async function getPaginated(
  params: GroupMemberQueryParams,
): Promise<PaginatedResponse<CachedGroupMember>> {
  let members = params.group !== undefined ? await getByGroupId(params.group) : await getAll()

  if (params.has_admin_access === true) {
    members = members.filter((member) => ['owner', 'admin'].includes(member.role))
  }

  if (params.role) {
    members = members.filter((member) => member.role === params.role)
  }

  return paginate(members, params.page ?? 1, params.page_size ?? 10)
}
/**
 * Clears all cached group members.
 */
async function clear(): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_group_members')
}

/**
 * Deletes all cached members belonging to a specific group.
 *
 * @param groupId - ID of the group.
 */
async function deleteByGroupId(groupId: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_group_members WHERE group_id = ?', [groupId])
}

/**
 * Deletes a cached group member by its group ID and member ID.
 *
 * @param groupId - ID of the group.
 * @param id - ID of the member to delete.
 */
async function deleteById(groupId: number, id: number): Promise<void> {
  const db = await getDatabase()

  await db.run('DELETE FROM cached_group_members WHERE group_id = ? AND id = ?', [groupId, id])
}

export {
  save,
  saveList,
  replaceList,
  getAll,
  get,
  getByGroupId,
  getPaginated,
  clear,
  deleteByGroupId,
  deleteById,
}
