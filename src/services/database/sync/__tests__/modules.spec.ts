import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/api/modules'
import { mockGroup, mockSmartPack } from '@/tests/constants'

import repositories from '../../repositories'
import {
  syncGroups,
  syncGroupMembers,
  syncNotifications,
  syncNotificationPreferences,
  syncSmartPackSensorMeasurements,
  syncSmartPacks,
  syncUser,
} from '../modules'
import { syncPaginated, syncSingle } from '../utils'

vi.mock('@/api/modules', () => ({
  default: {
    groups: {
      list: vi.fn<typeof import('@/api/modules').default.groups.list>(),
    },
    groupMembers: {
      list: vi.fn<typeof import('@/api/modules').default.groupMembers.list>(),
    },
    smartpacks: {
      list: vi.fn<typeof import('@/api/modules').default.smartpacks.list>(),
      listSensorMeasurements:
        vi.fn<typeof import('@/api/modules').default.smartpacks.listSensorMeasurements>(),
    },
    notifications: {
      list: vi.fn<typeof import('@/api/modules').default.notifications.list>(),
    },
    notificationPreferences: {
      get: vi.fn<typeof import('@/api/modules').default.notificationPreferences.get>(),
    },
    users: {
      getMe: vi.fn<typeof import('@/api/modules').default.users.getMe>(),
    },
  },
}))

vi.mock('../../repositories', () => ({
  default: {
    groups: {
      getAll: vi.fn<typeof import('../../repositories').default.groups.getAll>(),
    },
    groupMembers: {},
    smartpacks: {
      getAll: vi.fn<typeof import('../../repositories').default.smartpacks.getAll>(),
    },
    smartpackSensorMeasurements: {},
    notifications: {},
    notificationPreferences: {},
    users: {},
  },
}))

vi.mock('../utils', () => ({
  syncPaginated: vi.fn<typeof import('../utils').syncPaginated>(),
  syncSingle: vi.fn<typeof import('../utils').syncSingle>(),
}))

describe('sync modules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncGroups', () => {
    it('synchronizes groups using the groups API and repository', async () => {
      vi.mocked(syncPaginated).mockResolvedValue(2)

      const result = await syncGroups()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(api.groups.list, repositories.groups)
      expect(result).toBe(2)
    })

    it('propagates synchronization errors', async () => {
      const error = new Error('Group synchronization failed')
      vi.mocked(syncPaginated).mockRejectedValue(error)

      await expect(syncGroups()).rejects.toThrow(error)
    })
  })

  describe('syncSmartPacks', () => {
    it('synchronizes SmartPacks using the SmartPacks API and repository', async () => {
      vi.mocked(syncPaginated).mockResolvedValue(3)

      const result = await syncSmartPacks()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(
        api.smartpacks.list,
        repositories.smartpacks,
      )
      expect(result).toBe(3)
    })

    it('propagates synchronization errors', async () => {
      const error = new Error('SmartPack synchronization failed')
      vi.mocked(syncPaginated).mockRejectedValue(error)

      await expect(syncSmartPacks()).rejects.toThrow(error)
    })
  })

  describe('syncNotifications', () => {
    it('synchronizes notifications using the notifications API and repository', async () => {
      vi.mocked(syncPaginated).mockResolvedValue(5)

      const result = await syncNotifications()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(
        api.notifications.list,
        repositories.notifications,
      )
      expect(result).toBe(5)
    })

    it('propagates synchronization errors', async () => {
      const error = new Error('Notification synchronization failed')
      vi.mocked(syncPaginated).mockRejectedValue(error)

      await expect(syncNotifications()).rejects.toThrow(error)
    })
  })

  describe('syncGroupMembers', () => {
    it('synchronizes members for all locally cached groups', async () => {
      const groups = [
        { ...mockGroup, cached_at: '2026-11-18T10:00:00Z' },
        {
          ...mockGroup,
          id: 2,
          name: 'Another Group',
          cached_at: '2026-11-18T10:00:00Z',
        },
      ]

      vi.mocked(repositories.groups.getAll).mockResolvedValue(groups)
      vi.mocked(syncPaginated).mockResolvedValue(4)

      const result = await syncGroupMembers()

      expect(repositories.groups.getAll).toHaveBeenCalledOnce()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(
        api.groupMembers.list,
        repositories.groupMembers,
        {
          key: 'group',
          values: [1, 2],
        },
      )

      expect(result).toBe(4)
    })

    it('passes an empty list when no groups are cached', async () => {
      vi.mocked(repositories.groups.getAll).mockResolvedValue([])
      vi.mocked(syncPaginated).mockResolvedValue(0)

      const result = await syncGroupMembers()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(
        api.groupMembers.list,
        repositories.groupMembers,
        {
          key: 'group',
          values: [],
        },
      )

      expect(result).toBe(0)
    })

    it('propagates errors when retrieving cached groups', async () => {
      const error = new Error('Failed to retrieve groups')

      vi.mocked(repositories.groups.getAll).mockRejectedValue(error)

      await expect(syncGroupMembers()).rejects.toThrow(error)

      expect(syncPaginated).not.toHaveBeenCalled()
    })

    it('propagates synchronization errors', async () => {
      vi.mocked(repositories.groups.getAll).mockResolvedValue([
        { ...mockGroup, cached_at: '2026-11-18T10:00:00Z' },
      ])

      const error = new Error('Group member synchronization failed')
      vi.mocked(syncPaginated).mockRejectedValue(error)

      await expect(syncGroupMembers()).rejects.toThrow(error)
    })
  })

  describe('syncSmartPackSensorMeasurements', () => {
    it('synchronizes measurements for all locally cached SmartPacks', async () => {
      const smartpacks = [
        { ...mockSmartPack, cached_at: '2026-11-18T10:00:00Z' },
        {
          ...mockSmartPack,
          id: 2,
          device_uid: 'SP-002',
          cached_at: '2026-11-18T10:00:00Z',
        },
      ]

      vi.mocked(repositories.smartpacks.getAll).mockResolvedValue(smartpacks)
      vi.mocked(syncPaginated).mockResolvedValue(10)

      const result = await syncSmartPackSensorMeasurements()

      expect(repositories.smartpacks.getAll).toHaveBeenCalledOnce()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(
        api.smartpacks.listSensorMeasurements,
        repositories.smartpackSensorMeasurements,
        {
          key: 'smartpack',
          values: [1, 2],
        },
      )

      expect(result).toBe(10)
    })

    it('passes an empty list when no SmartPacks are cached', async () => {
      vi.mocked(repositories.smartpacks.getAll).mockResolvedValue([])
      vi.mocked(syncPaginated).mockResolvedValue(0)

      const result = await syncSmartPackSensorMeasurements()

      expect(syncPaginated).toHaveBeenCalledExactlyOnceWith(
        api.smartpacks.listSensorMeasurements,
        repositories.smartpackSensorMeasurements,
        {
          key: 'smartpack',
          values: [],
        },
      )

      expect(result).toBe(0)
    })

    it('propagates errors when retrieving cached SmartPacks', async () => {
      const error = new Error('Failed to retrieve SmartPacks')

      vi.mocked(repositories.smartpacks.getAll).mockRejectedValue(error)

      await expect(syncSmartPackSensorMeasurements()).rejects.toThrow(error)

      expect(syncPaginated).not.toHaveBeenCalled()
    })

    it('propagates synchronization errors', async () => {
      vi.mocked(repositories.smartpacks.getAll).mockResolvedValue([
        { ...mockSmartPack, cached_at: '2026-11-18T10:00:00Z' },
      ])

      const error = new Error('Measurement synchronization failed')
      vi.mocked(syncPaginated).mockRejectedValue(error)

      await expect(syncSmartPackSensorMeasurements()).rejects.toThrow(error)
    })
  })

  describe('syncNotificationPreferences', () => {
    it('synchronizes notification preferences using the correct API and repository', async () => {
      vi.mocked(syncSingle).mockResolvedValue({} as never)

      await syncNotificationPreferences()

      expect(syncSingle).toHaveBeenCalledExactlyOnceWith(
        api.notificationPreferences.get,
        repositories.notificationPreferences,
      )
    })

    it('propagates synchronization errors', async () => {
      const error = new Error('Notification preferences synchronization failed')
      vi.mocked(syncSingle).mockRejectedValue(error)

      await expect(syncNotificationPreferences()).rejects.toThrow(error)
    })
  })

  describe('syncUser', () => {
    it('synchronizes the current user using the correct API and repository', async () => {
      vi.mocked(syncSingle).mockResolvedValue({} as never)

      await syncUser()

      expect(syncSingle).toHaveBeenCalledExactlyOnceWith(api.users.getMe, repositories.users)
    })

    it('propagates synchronization errors', async () => {
      const error = new Error('User synchronization failed')
      vi.mocked(syncSingle).mockRejectedValue(error)

      await expect(syncUser()).rejects.toThrow(error)
    })
  })
})
