import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockUser } from '@/tests/constants'

import { getDatabase } from '../../database'
import { clear, get, save } from '../users'

vi.mock('../../database', () => ({
  getDatabase: vi.fn<typeof import('../../database').getDatabase>(),
}))

/**
 * Mock SQLite database connection.
 */
const mockDatabase = {
  beginTransaction: vi.fn<() => Promise<void>>(),
  commitTransaction: vi.fn<() => Promise<void>>(),
  rollbackTransaction: vi.fn<() => Promise<void>>(),

  run: vi.fn<(statement: string, values?: unknown[], transaction?: boolean) => Promise<unknown>>(),

  query: vi.fn<
    (
      statement: string,
      values?: unknown[],
    ) => Promise<{
      values?: Record<string, unknown>[]
    }>
  >(),
}

/**
 * Sample SQLite user row.
 */
const mockCachedUserRow = {
  ...mockUser,
  changed_password_after_initial_login: 1,
  two_factor_enabled: 1,
  is_active: 1,
  groups: JSON.stringify(mockUser.groups),
  cached_at: '2026-11-11T10:00:00.000Z',
}

describe('UserRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockDatabase.beginTransaction.mockResolvedValue(undefined)
    mockDatabase.commitTransaction.mockResolvedValue(undefined)
    mockDatabase.rollbackTransaction.mockResolvedValue(undefined)
    mockDatabase.run.mockResolvedValue(undefined)
    mockDatabase.query.mockResolvedValue({ values: [] })

    vi.mocked(getDatabase).mockResolvedValue(mockDatabase as never)
  })

  // ---------------------------------------------------------
  // save()
  // ---------------------------------------------------------

  describe('save()', () => {
    it('should save the user profile inside a transaction', async () => {
      await save(mockUser)

      expect(getDatabase).toHaveBeenCalledOnce()
      expect(mockDatabase.beginTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.run).toHaveBeenCalledTimes(2)
      expect(mockDatabase.commitTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('should delete the previous cached profile before inserting', async () => {
      await save(mockUser)

      expect(mockDatabase.run).toHaveBeenNthCalledWith(1, 'DELETE FROM cached_user', [], false)

      expect(mockDatabase.run).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO cached_user'),
        expect.any(Array),
        false,
      )
    })

    it('should insert the correct user profile fields', async () => {
      await save(mockUser)

      const insertValues = mockDatabase.run.mock.calls[1]?.[1] as unknown[]

      expect(insertValues).toEqual([
        mockUser.id,
        mockUser.unique_id,
        mockUser.first_name,
        mockUser.last_name,
        mockUser.full_name,
        mockUser.email,
        mockUser.phone,
        mockUser.profile_pic,
        mockUser.account_type,
        mockUser.role,
        mockUser.date_of_birth,
        mockUser.gender,
        1,
        1,
        1,
        mockUser.created_at,
        mockUser.updated_at,
        mockUser.status,
        JSON.stringify(mockUser.groups),
        expect.any(String),
      ])
    })

    it('should convert boolean fields into SQLite integers', async () => {
      const user = {
        ...mockUser,
        changed_password_after_initial_login: false,
        two_factor_enabled: false,
        is_active: false,
      }

      await save(user)

      const insertValues = mockDatabase.run.mock.calls[1]?.[1] as unknown[]

      expect(insertValues?.[12]).toBe(0)
      expect(insertValues?.[13]).toBe(0)
      expect(insertValues?.[14]).toBe(0)
    })

    it('should serialize groups into JSON', async () => {
      await save(mockUser)

      const insertValues = mockDatabase.run.mock.calls[1]?.[1] as unknown[]

      expect(insertValues?.[18]).toBe(JSON.stringify(mockUser.groups))
    })

    it('should store null for nullable profile fields', async () => {
      const user = {
        ...mockUser,
        profile_pic: null,
        date_of_birth: null,
      }

      await save(user)

      const insertValues = mockDatabase.run.mock.calls[1]?.[1] as unknown[]

      expect(insertValues?.[7]).toBeNull()
      expect(insertValues?.[10]).toBeNull()
    })

    it('should generate a cached_at timestamp', async () => {
      await save(mockUser)

      const insertValues = mockDatabase.run.mock.calls[1]?.[1] as unknown[]
      const cachedAt = insertValues?.[19] as string

      expect(cachedAt).toEqual(expect.any(String))
      expect(new Date(cachedAt).toISOString()).toBe(cachedAt)
    })

    it('should rollback the transaction when saving fails', async () => {
      const error = new Error('Failed to insert user')

      mockDatabase.run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(error)

      await expect(save(mockUser)).rejects.toThrow(error)

      expect(mockDatabase.beginTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.commitTransaction).not.toHaveBeenCalled()
    })

    it('should preserve the original error if rollback also fails', async () => {
      const saveError = new Error('Failed to insert user')
      const rollbackError = new Error('Rollback failed')

      mockDatabase.run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(saveError)

      mockDatabase.rollbackTransaction.mockRejectedValueOnce(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(save(mockUser)).rejects.toThrow(saveError)

      expect(mockDatabase.rollbackTransaction).toHaveBeenCalledOnce()

      consoleSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------
  // get()
  // ---------------------------------------------------------

  describe('get()', () => {
    it('should return the cached user profile', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [mockCachedUserRow],
      })

      const result = await get()

      expect(result).toEqual(mockUser)
    })

    it('should return null when no cached user exists', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [],
      })

      const result = await get()

      expect(result).toBeNull()
    })

    it('should retrieve the cached profile from cached_user', async () => {
      await get()

      expect(mockDatabase.query).toHaveBeenCalledWith('SELECT * FROM cached_user LIMIT 1')
    })

    it('should convert SQLite integer values into booleans', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [
          {
            ...mockCachedUserRow,
            changed_password_after_initial_login: 0,
            two_factor_enabled: 0,
            is_active: 0,
          },
        ],
      })

      const result = await get()

      expect(result?.changed_password_after_initial_login).toBe(false)
      expect(result?.two_factor_enabled).toBe(false)
      expect(result?.is_active).toBe(false)
    })

    it('should deserialize groups from JSON', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [mockCachedUserRow],
      })

      const result = await get()

      expect(result?.groups).toEqual(mockUser.groups)
      expect(result?.groups).toHaveLength(1)
      expect(result?.groups[0]).toEqual({
        id: 1,
        name: 'SmartPack Family',
        role: 'owner',
      })
    })

    it('should return an empty array when cached groups JSON is invalid', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [
          {
            ...mockCachedUserRow,
            groups: 'invalid-json',
          },
        ],
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await get()

      expect(result?.groups).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------
  // clear()
  // ---------------------------------------------------------

  describe('clear()', () => {
    it('should delete the cached user profile', async () => {
      await clear()

      expect(getDatabase).toHaveBeenCalledOnce()

      expect(mockDatabase.run).toHaveBeenCalledWith('DELETE FROM cached_user', [], false)
    })

    it('should not start a transaction when clearing the profile', async () => {
      await clear()

      expect(mockDatabase.beginTransaction).not.toHaveBeenCalled()
      expect(mockDatabase.commitTransaction).not.toHaveBeenCalled()
    })
  })
})
