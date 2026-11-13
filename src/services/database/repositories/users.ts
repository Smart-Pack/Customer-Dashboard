// @/services/database/repositories/users.ts

import { getDatabase } from '../database'
import type { User } from '@/api/modules/users'

/**
 * SQLite representation of a cached user.
 *
 * SQLite stores booleans as INTEGER (0 or 1)
 * and groups as a JSON string.
 */
interface CachedUserRow extends Omit<
  User,
  'changed_password_after_initial_login' | 'two_factor_enabled' | 'is_active' | 'groups'
> {
  changed_password_after_initial_login: number
  two_factor_enabled: number
  is_active: number
  groups: string
  cached_at: string
}

/**
 * Parse cached user groups from their SQLite JSON representation.
 *
 * Returns an empty array if the stored JSON is invalid.
 */
function parseGroups(value: string): User['groups'] {
  try {
    const groups: unknown = JSON.parse(value)

    return Array.isArray(groups) ? (groups as User['groups']) : []
  } catch {
    console.error('[UserRepository] Failed to parse cached user groups.')
    return []
  }
}

/**
 * Save or replace the currently cached user profile.
 *
 * The application assumes one active account per installation,
 * so an existing cached profile is replaced atomically.
 */
export async function save(user: User): Promise<void> {
  const database = await getDatabase()

  let transactionStarted = false

  try {
    await database.beginTransaction()
    transactionStarted = true

    // Remove any previously cached profile.
    await database.run('DELETE FROM cached_user', [], false)

    await database.run(
      `
      INSERT INTO cached_user (
        id,
        unique_id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        profile_pic,
        account_type,
        role,
        date_of_birth,
        gender,
        changed_password_after_initial_login,
        two_factor_enabled,
        is_active,
        created_at,
        updated_at,
        status,
        groups,
        cached_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        user.unique_id,
        user.first_name,
        user.last_name,
        user.full_name,
        user.email,
        user.phone,
        user.profile_pic ?? null,
        user.account_type,
        user.role,
        user.date_of_birth ?? null,
        user.gender,
        user.changed_password_after_initial_login ? 1 : 0,
        user.two_factor_enabled ? 1 : 0,
        user.is_active ? 1 : 0,
        user.created_at,
        user.updated_at,
        user.status,
        JSON.stringify(user.groups ?? []),
        new Date().toISOString(),
      ],
      false,
    )

    await database.commitTransaction()
    transactionStarted = false
  } catch (error) {
    if (transactionStarted) {
      try {
        await database.rollbackTransaction()
      } catch (rollbackError) {
        console.error('[UserRepository] Failed to rollback transaction:', rollbackError)
      }
    }

    console.error('[UserRepository] Failed to save user:', error)
    throw error
  }
}

/**
 * Retrieve the cached user profile.
 *
 * Returns null when no profile has been cached.
 */
export async function get(): Promise<User | null> {
  const database = await getDatabase()

  const result = await database.query('SELECT * FROM cached_user LIMIT 1')

  const row = result.values?.[0] as CachedUserRow | undefined

  if (!row) {
    return null
  }

  return {
    id: row.id,
    unique_id: row.unique_id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    profile_pic: row.profile_pic,
    account_type: row.account_type,
    role: row.role,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    changed_password_after_initial_login: row.changed_password_after_initial_login === 1,
    two_factor_enabled: row.two_factor_enabled === 1,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    groups: parseGroups(row.groups),
  }
}

/**
 * Clear the cached user profile.
 *
 * Call this during logout.
 */
export async function clear(): Promise<void> {
  const database = await getDatabase()

  await database.run('DELETE FROM cached_user', [], false)
}
