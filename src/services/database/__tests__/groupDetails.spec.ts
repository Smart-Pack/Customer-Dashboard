import { beforeEach, describe, expect, it, vi } from 'vitest'

import repositories from '../repositories'
import { get, save } from '../groupDetails'

vi.mock('../repositories', () => ({
  default: {
    groups: {
      get: vi.fn<typeof import('../repositories').default.groups.get>(),
      save: vi.fn<typeof import('../repositories').default.groups.save>(),
    },
    smartpacks: {
      getByGroupId: vi.fn<typeof import('../repositories').default.smartpacks.getByGroupId>(),
    },
    groupMembers: {
      getByGroupId: vi.fn<typeof import('../repositories').default.groupMembers.getByGroupId>(),
      replaceList: vi.fn<typeof import('../repositories').default.groupMembers.replaceList>(),
    },
  },
}))

describe('groupDetails', () => {
  const groupId = 1

  const mockGroup = {
    id: groupId,
    name: 'Test Group',
    created: '2026-11-13T10:00:00Z',
    updated: '2026-11-13T11:00:00Z',
  }

  const mockCachedSmartPacks = [
    {
      id: 10,
      cached_at: '2026-11-13T12:00:00Z',
    },
    {
      id: 11,
      cached_at: '2026-11-13T12:00:00Z',
    },
  ]

  const mockCachedMembers = [
    {
      id: 20,
      group_id: groupId,
      user: {
        id: 100,
        uuid: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700000001',
      },
      role: 'owner' as const,
      created: '2026-11-13T10:00:00Z',
      updated: '2026-11-13T11:00:00Z',
      cached_at: '2026-11-13T12:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(repositories.groups.get).mockResolvedValue(mockGroup as never)

    vi.mocked(repositories.smartpacks.getByGroupId).mockResolvedValue(mockCachedSmartPacks as never)

    vi.mocked(repositories.groupMembers.getByGroupId).mockResolvedValue(mockCachedMembers as never)
  })

  describe('get', () => {
    it('returns null when the group does not exist', async () => {
      vi.mocked(repositories.groups.get).mockResolvedValue(null)

      const result = await get(groupId)

      expect(result).toBeNull()

      expect(repositories.groups.get).toHaveBeenCalledWith(groupId)
      expect(repositories.smartpacks.getByGroupId).not.toHaveBeenCalled()
      expect(repositories.groupMembers.getByGroupId).not.toHaveBeenCalled()
    })

    it('retrieves the group, SmartPacks, and members', async () => {
      await get(groupId)

      expect(repositories.groups.get).toHaveBeenCalledWith(groupId)
      expect(repositories.smartpacks.getByGroupId).toHaveBeenCalledWith(groupId)
      expect(repositories.groupMembers.getByGroupId).toHaveBeenCalledWith(groupId)
    })

    it('returns the group details with SmartPacks and members', async () => {
      const result = await get(groupId)

      expect(result).toEqual({
        id: mockGroup.id,
        name: mockGroup.name,
        smartpacks: [
          {
            id: 10,
          },
          {
            id: 11,
          },
        ],
        members: [
          {
            id: 20,
            user: {
              id: 100,
              uuid: 'user-uuid-1',
              full_name: 'John Doe',
              email: 'john@example.com',
              phone: '+254700000001',
            },
            role: 'owner',
            created: '2026-11-13T10:00:00Z',
            updated: '2026-11-13T11:00:00Z',
          },
        ],
        created: mockGroup.created,
        updated: mockGroup.updated,
      })
    })

    it('removes cache-specific fields from SmartPacks', async () => {
      const result = await get(groupId)

      expect(result?.smartpacks).toEqual([{ id: 10 }, { id: 11 }])

      expect(result?.smartpacks[0]).not.toHaveProperty('cached_at')
    })

    it('removes cache-specific fields from group members', async () => {
      const result = await get(groupId)

      expect(result?.members[0]).not.toHaveProperty('group_id')
      expect(result?.members[0]).not.toHaveProperty('cached_at')
    })

    it('preserves nested user details for group members', async () => {
      const result = await get(groupId)

      expect(result?.members[0]?.user).toEqual({
        id: 100,
        uuid: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700000001',
      })
    })

    it('returns empty SmartPacks and members when none are cached', async () => {
      vi.mocked(repositories.smartpacks.getByGroupId).mockResolvedValue([] as never)

      vi.mocked(repositories.groupMembers.getByGroupId).mockResolvedValue([] as never)

      const result = await get(groupId)

      expect(result).toEqual({
        id: mockGroup.id,
        name: mockGroup.name,
        smartpacks: [],
        members: [],
        created: mockGroup.created,
        updated: mockGroup.updated,
      })
    })
  })
  describe('save', () => {
    const groupDetail = {
      id: groupId,
      name: 'Test Group',
      smartpacks: [{ id: 10 }, { id: 11 }],
      members: [
        {
          id: 20,
          user: {
            id: 100,
            uuid: 'user-uuid-1',
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+254700000001',
          },
          role: 'owner' as const,
          created: '2026-11-13T10:00:00Z',
          updated: '2026-11-13T11:00:00Z',
        },
      ],
      created: mockGroup.created,
      updated: mockGroup.updated,
    }

    it('saves the group with the correct details and totals', async () => {
      await save(groupDetail as never)

      expect(repositories.groups.save).toHaveBeenCalledWith({
        id: groupId,
        name: 'Test Group',
        total_smartpacks: 2,
        total_users: 1,
        created: mockGroup.created,
        updated: mockGroup.updated,
      })
    })

    it('replaces the cached group members', async () => {
      await save(groupDetail as never)

      expect(repositories.groupMembers.replaceList).toHaveBeenCalledWith(
        groupId,
        groupDetail.members,
      )
    })

    it('saves the group before replacing its members', async () => {
      await save(groupDetail as never)

      expect(vi.mocked(repositories.groups.save)).toHaveBeenCalledBefore(
        vi.mocked(repositories.groupMembers.replaceList),
      )
    })

    it('handles a group with no SmartPacks or members', async () => {
      const emptyGroup = {
        ...groupDetail,
        smartpacks: [],
        members: [],
      }

      await save(emptyGroup as never)

      expect(repositories.groups.save).toHaveBeenCalledWith({
        id: groupId,
        name: 'Test Group',
        total_smartpacks: 0,
        total_users: 0,
        created: mockGroup.created,
        updated: mockGroup.updated,
      })

      expect(repositories.groupMembers.replaceList).toHaveBeenCalledWith(groupId, [])
    })
  })
})
