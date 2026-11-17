import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  deleteByGroupId,
  deleteById,
  get,
  getAll,
  getByGroupId,
  getPaginated,
  save,
  saveList,
  replaceList,
  type CachedGroupMember,
} from '../groupMembers'

import type { GroupMember } from '@/api/modules/groups'

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

const mockGroupMember: GroupMember = {
  id: 1,
  user: {
    id: 10,
    uuid: 'user-uuid-1',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+254700000001',
  },
  role: 'member',
  created: '2026-11-13T10:00:00Z',
  updated: '2026-11-13T11:00:00Z',
}

const mockCachedGroupMember = {
  ...mockGroupMember,
  group_id: 1,
  cached_at: '2026-11-13T12:00:00.000Z',
}

const mockGroupMemberRow = {
  id: mockGroupMember.id,
  group_id: 1,

  user_id: mockGroupMember.user.id,
  user_uuid: mockGroupMember.user.uuid,
  user_full_name: mockGroupMember.user.full_name,
  user_email: mockGroupMember.user.email,
  user_phone: mockGroupMember.user.phone,

  role: mockGroupMember.role,
  created: mockGroupMember.created,
  updated: mockGroupMember.updated,
  cached_at: mockCachedGroupMember.cached_at,
}

describe('Group Members Repository', () => {
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
    it('saves a group member to the database', async () => {
      await save(1, mockGroupMember)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO cached_group_members'),
        [
          mockGroupMember.id,
          1,
          mockGroupMember.user.id,
          mockGroupMember.user.uuid,
          mockGroupMember.user.full_name,
          mockGroupMember.user.email,
          mockGroupMember.user.phone,
          mockGroupMember.role,
          mockGroupMember.created,
          mockGroupMember.updated,
          expect.any(String),
        ],
        false,
      )
    })

    it('updates an existing group member when its group ID and member ID already exist', async () => {
      await save(1, mockGroupMember)

      const [query] = mocks.db.run.mock.calls[0]!

      expect(query).toContain('ON CONFLICT(group_id, id) DO UPDATE')
      expect(query).toContain('user_id = excluded.user_id')
      expect(query).toContain('user_uuid = excluded.user_uuid')
      expect(query).toContain('user_full_name = excluded.user_full_name')
      expect(query).toContain('user_email = excluded.user_email')
      expect(query).toContain('user_phone = excluded.user_phone')
      expect(query).toContain('role = excluded.role')
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(save(1, mockGroupMember)).rejects.toThrow(error)
    })
  })

  describe('saveList', () => {
    it('saves all group members within a transaction', async () => {
      const members = [
        mockGroupMember,
        {
          ...mockGroupMember,
          id: 2,
          user: {
            ...mockGroupMember.user,
            id: 11,
            uuid: 'user-uuid-2',
            full_name: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
      ]

      await saveList(1, members)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).toHaveBeenCalledTimes(2)
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('commits an empty list without saving any members', async () => {
      await saveList(1, [])

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).not.toHaveBeenCalled()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('rolls back the transaction when saving a member fails', async () => {
      const error = new Error('Failed to save group member')

      mocks.db.run.mockResolvedValueOnce({}).mockRejectedValueOnce(error)

      const members = [mockGroupMember, { ...mockGroupMember, id: 2 }]

      await expect(saveList(1, members)).rejects.toThrow(error)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
    })

    it('preserves the original error when rollback also fails', async () => {
      const error = new Error('Failed to save group member')
      const rollbackError = new Error('Failed to roll back')

      mocks.db.run.mockRejectedValue(error)
      mocks.db.rollbackTransaction.mockRejectedValue(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(saveList(1, [mockGroupMember])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('replaceList', () => {
    it('inserts and updates members and removes members absent from the supplied list', async () => {
      const members: GroupMember[] = [
        mockGroupMember,
        {
          ...mockGroupMember,
          id: 2,
          user: {
            ...mockGroupMember.user,
            id: 11,
            uuid: 'user-uuid-2',
            full_name: 'Jane Doe',
            email: 'jane@example.com',
          },
          role: 'admin',
        },
      ]

      await replaceList(1, members)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cached_group_members'),
        [1, 1, 2],
        true,
      )

      expect(mocks.db.run).toHaveBeenCalledTimes(3)
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('deletes all existing members when the supplied list is empty', async () => {
      await replaceList(1, [])

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('DELETE FROM cached_group_members WHERE group_id = ?'),
        [1],
        true,
      )

      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('commits the transaction after successfully replacing members', async () => {
      await replaceList(1, [mockGroupMember])

      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('rolls back the transaction when deleting existing members fails', async () => {
      const error = new Error('Failed to delete existing members')

      mocks.db.run.mockRejectedValueOnce(error)

      await expect(replaceList(1, [mockGroupMember])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
    })

    it('rolls back the transaction when saving a member fails', async () => {
      const error = new Error('Failed to save group member')

      // First run is DELETE; second run is the INSERT/UPDATE from save().
      mocks.db.run.mockResolvedValueOnce({}).mockRejectedValueOnce(error)

      await expect(replaceList(1, [mockGroupMember])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
    })

    it('preserves the original error when rollback also fails', async () => {
      const error = new Error('Failed to replace group members')

      mocks.db.run.mockRejectedValueOnce(error)
      mocks.db.rollbackTransaction.mockRejectedValueOnce(new Error('Rollback failed'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(replaceList(1, [mockGroupMember])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getAll', () => {
    it('returns all cached group members in the API structure', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockGroupMemberRow],
      })

      const result = await getAll()

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('ORDER BY id ASC'),
      )

      expect(result).toEqual([mockCachedGroupMember])
    })

    it('returns an empty array when no group members are cached', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getAll()

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('returns a cached group member by group ID and member ID in the API structure', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockGroupMemberRow],
      })

      const result = await get(1, mockGroupMember.id)

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE group_id = ? AND id = ?'),
        [1, mockGroupMember.id],
      )

      expect(result).toEqual(mockCachedGroupMember)
    })

    it('returns null when the group member does not exist', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await get(1, 999)

      expect(result).toBeNull()
    })
  })

  describe('getByGroupId', () => {
    it('returns cached members belonging to a specific group in the API structure', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockGroupMemberRow],
      })

      const result = await getByGroupId(1)

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE group_id = ?'),
        [1],
      )

      expect(result).toEqual([mockCachedGroupMember])
    })

    it('returns an empty array when the group has no cached members', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getByGroupId(1)

      expect(result).toEqual([])
    })
  })

  describe('getPaginated', () => {
    const cachedMembers: CachedGroupMember[] = [
      mockCachedGroupMember,
      {
        ...mockCachedGroupMember,
        id: 2,
        user: {
          id: 11,
          uuid: 'user-uuid-2',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+254700000002',
        },
        role: 'admin',
      },
      {
        ...mockCachedGroupMember,
        id: 3,
        user: {
          id: 12,
          uuid: 'user-uuid-3',
          full_name: 'Peter Doe',
          email: 'peter@example.com',
          phone: '+254700000003',
        },
        role: 'owner',
      },
      {
        ...mockCachedGroupMember,
        id: 4,
        group_id: 2,
        user: {
          id: 13,
          uuid: 'user-uuid-4',
          full_name: 'Mary Doe',
          email: 'mary@example.com',
          phone: '+254700000004',
        },
        role: 'member',
      },
    ]

    const cachedMemberRows = [
      {
        id: 1,
        group_id: 1,
        user_id: 10,
        user_uuid: 'user-uuid-1',
        user_full_name: 'John Doe',
        user_email: 'john@example.com',
        user_phone: '+254700000001',
        role: 'member',
        created: mockGroupMember.created,
        updated: mockGroupMember.updated,
        cached_at: mockCachedGroupMember.cached_at,
      },
      {
        id: 2,
        group_id: 1,
        user_id: 11,
        user_uuid: 'user-uuid-2',
        user_full_name: 'Jane Doe',
        user_email: 'jane@example.com',
        user_phone: '+254700000002',
        role: 'admin',
        created: mockGroupMember.created,
        updated: mockGroupMember.updated,
        cached_at: mockCachedGroupMember.cached_at,
      },
      {
        id: 3,
        group_id: 1,
        user_id: 12,
        user_uuid: 'user-uuid-3',
        user_full_name: 'Peter Doe',
        user_email: 'peter@example.com',
        user_phone: '+254700000003',
        role: 'owner',
        created: mockGroupMember.created,
        updated: mockGroupMember.updated,
        cached_at: mockCachedGroupMember.cached_at,
      },
      {
        id: 4,
        group_id: 2,
        user_id: 13,
        user_uuid: 'user-uuid-4',
        user_full_name: 'Mary Doe',
        user_email: 'mary@example.com',
        user_phone: '+254700000004',
        role: 'member',
        created: mockGroupMember.created,
        updated: mockGroupMember.updated,
        cached_at: mockCachedGroupMember.cached_at,
      },
    ]

    beforeEach(() => {
      mocks.db.query.mockImplementation(async (statement, values) => {
        if (statement.includes('WHERE group_id = ?')) {
          return {
            values: cachedMemberRows.filter((member) => member.group_id === values?.[0]),
          }
        }

        return {
          values: cachedMemberRows,
        }
      })
    })

    it('returns all cached group members when no filters are provided', async () => {
      const result = await getPaginated({ page: 1, page_size: 10 })

      expect(result).toEqual({
        count: 4,
        next: null,
        previous: null,
        results: cachedMembers,
      })
    })

    it('returns only members belonging to the requested group', async () => {
      const result = await getPaginated({
        group: 1,
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual(cachedMembers.slice(0, 3))
      expect(result.count).toBe(3)
    })

    it('returns only members matching the requested role', async () => {
      const result = await getPaginated({
        role: 'member',
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual([cachedMembers[0], cachedMembers[3]])
      expect(result.count).toBe(2)
    })

    it('supports filtering by owner role', async () => {
      const result = await getPaginated({
        role: 'owner',
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual([cachedMembers[2]])
      expect(result.count).toBe(1)
    })

    it('supports filtering by admin role', async () => {
      const result = await getPaginated({
        role: 'admin',
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual([cachedMembers[1]])
      expect(result.count).toBe(1)
    })

    it('returns only owners and admins when has_admin_access is true', async () => {
      const result = await getPaginated({
        has_admin_access: true,
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual([cachedMembers[1], cachedMembers[2]])
      expect(result.count).toBe(2)
    })

    it('applies group and role filters together', async () => {
      const result = await getPaginated({
        group: 1,
        role: 'member',
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual([cachedMembers[0]])
      expect(result.count).toBe(1)
    })

    it('applies group and admin access filters together', async () => {
      const result = await getPaginated({
        group: 1,
        has_admin_access: true,
        page: 1,
        page_size: 10,
      })

      expect(result.results).toEqual([cachedMembers[1], cachedMembers[2]])
      expect(result.count).toBe(2)
    })

    it('returns an empty result when no members match the filters', async () => {
      const result = await getPaginated({
        group: 999,
        page: 1,
        page_size: 10,
      })

      expect(result).toEqual({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
    })

    it('paginates filtered group members', async () => {
      const result = await getPaginated({
        group: 1,
        page: 2,
        page_size: 1,
      })

      expect(result).toEqual({
        count: 3,
        next: '3',
        previous: '1',
        results: [cachedMembers[1]],
      })
    })

    it('returns an empty result when the requested page exceeds the available pages', async () => {
      const result = await getPaginated({
        group: 1,
        page: 5,
        page_size: 1,
      })

      expect(result).toEqual({
        count: 3,
        next: null,
        previous: null,
        results: [],
      })
    })

    it('retrieves cached group members from the database', async () => {
      await getPaginated({ group: 1, page: 1, page_size: 10 })

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('FROM cached_group_members'),
        [1],
      )
    })

    it('retrieves all cached group members when no group filter is provided', async () => {
      await getPaginated({ page: 1, page_size: 10 })

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('FROM cached_group_members'),
      )
    })
  })

  describe('clear', () => {
    it('deletes all cached group members', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith('DELETE FROM cached_group_members')
    })
  })

  describe('deleteByGroupId', () => {
    it('deletes all cached members belonging to a specific group', async () => {
      await deleteByGroupId(1)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_group_members WHERE group_id = ?',
        [1],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteByGroupId(1)).rejects.toThrow(error)
    })
  })

  describe('deleteById', () => {
    it('deletes a cached group member by group ID and member ID', async () => {
      await deleteById(1, mockGroupMember.id)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_group_members WHERE group_id = ? AND id = ?',
        [1, mockGroupMember.id],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteById(1, mockGroupMember.id)).rejects.toThrow(error)
    })
  })
})
