import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clear, get, getAll, save, deleteById, saveList } from '../groups'

import type { Group } from '@/api/modules/groups'

const mocks = vi.hoisted(() => {
  const db = {
    run: vi.fn<
      (statement: string, values?: unknown[], transaction?: boolean) => Promise<unknown>
    >(),
    query: vi.fn<(statement: string, values?: unknown[]) => Promise<{ values?: unknown[] }>>(),
    beginTransaction: vi.fn<() => Promise<void>>(),
    commitTransaction: vi.fn<() => Promise<void>>(),
    rollbackTransaction: vi.fn<() => Promise<void>>(),
  }

  return {
    getDatabase: vi.fn<() => Promise<typeof db>>(),
    db,
  }
})

vi.mock('../../database', () => ({
  getDatabase: mocks.getDatabase,
}))

const mockGroup: Group = {
  id: 1,
  name: 'Test Group',
  total_users: 5,
  total_smartpacks: 3,
  created: '2026-11-13T10:00:00Z',
  updated: '2026-11-13T11:00:00Z',
}

const mockCachedGroup = {
  ...mockGroup,
  cached_at: '2026-11-13T12:00:00.000Z',
}

describe('Groups Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getDatabase.mockResolvedValue(mocks.db)

    mocks.db.run.mockResolvedValue({})
    mocks.db.query.mockResolvedValue({ values: [] })
    mocks.db.beginTransaction.mockResolvedValue(undefined)
    mocks.db.commitTransaction.mockResolvedValue(undefined)
    mocks.db.rollbackTransaction.mockResolvedValue(undefined)
  })

  describe('save', () => {
    it('saves a group summary to the database', async () => {
      await save(mockGroup)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO cached_groups'),
        [
          mockGroup.id,
          mockGroup.name,
          mockGroup.total_users,
          mockGroup.total_smartpacks,
          mockGroup.created,
          mockGroup.updated,
          expect.any(String),
        ],
        false,
      )
    })

    it('updates an existing group when its ID already exists', async () => {
      await save(mockGroup)

      const [query] = mocks.db.run.mock.calls[0]!

      expect(query).toContain('ON CONFLICT(id) DO UPDATE')
      expect(query).toContain('name = excluded.name')
      expect(query).toContain('total_users = excluded.total_users')
      expect(query).toContain('total_smartpacks = excluded.total_smartpacks')
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(save(mockGroup)).rejects.toThrow(error)
    })
  })

  describe('saveList', () => {
    it('saves all groups within a transaction', async () => {
      const groups = [mockGroup, { ...mockGroup, id: 2, name: 'Another Group' }]

      await saveList(groups)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).toHaveBeenCalledTimes(2)
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('commits an empty list without saving any groups', async () => {
      await saveList([])

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).not.toHaveBeenCalled()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('rolls back the transaction when saving a group fails', async () => {
      const error = new Error('Failed to save group')

      mocks.db.run.mockResolvedValueOnce({}).mockRejectedValueOnce(error)

      const groups = [mockGroup, { ...mockGroup, id: 2 }]

      await expect(saveList(groups)).rejects.toThrow(error)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
    })

    it('preserves the original error when rollback also fails', async () => {
      const error = new Error('Failed to save group')
      const rollbackError = new Error('Failed to roll back')

      mocks.db.run.mockRejectedValue(error)
      mocks.db.rollbackTransaction.mockRejectedValue(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(saveList([mockGroup])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getAll', () => {
    it('returns all cached groups', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockCachedGroup],
      })

      const result = await getAll()

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('ORDER BY id ASC'),
      )

      expect(result).toEqual([mockCachedGroup])
    })

    it('returns an empty array when no groups are cached', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getAll()

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('returns a cached group by ID', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockCachedGroup],
      })

      const result = await get(mockGroup.id)

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE id = ?'),
        [mockGroup.id],
      )

      expect(result).toEqual(mockCachedGroup)
    })

    it('returns null when the group does not exist', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await get(999)

      expect(result).toBeNull()
    })
  })

  describe('clear', () => {
    it('deletes all cached groups', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith('DELETE FROM cached_groups')
    })
  })
  describe('deleteById', () => {
    it('deletes a cached group by its ID', async () => {
      await deleteById(mockGroup.id)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_groups WHERE id = ?',
        [mockGroup.id],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteById(mockGroup.id)).rejects.toThrow(error)
    })
  })
})
