import { beforeEach, describe, expect, it, vi } from 'vitest'

import repositories from '../../repositories'
import { syncAll, syncModule } from '../syncManager'
import {
  syncGroups,
  syncGroupMembers,
  syncNotifications,
  syncNotificationPreferences,
  syncSmartPackSensorMeasurements,
  syncSmartPacks,
  syncUser,
} from '../modules'

vi.mock('../../repositories', () => ({
  default: {
    syncMetadata: {
      save: vi.fn<typeof import('../../repositories').default.syncMetadata.save>(),
    },
  },
}))

vi.mock('../modules', () => ({
  syncUser: vi.fn<typeof import('../modules').syncUser>(),
  syncGroups: vi.fn<typeof import('../modules').syncGroups>(),
  syncGroupMembers: vi.fn<typeof import('../modules').syncGroupMembers>(),
  syncSmartPacks: vi.fn<typeof import('../modules').syncSmartPacks>(),
  syncSmartPackSensorMeasurements:
    vi.fn<typeof import('../modules').syncSmartPackSensorMeasurements>(),
  syncNotifications: vi.fn<typeof import('../modules').syncNotifications>(),
  syncNotificationPreferences: vi.fn<typeof import('../modules').syncNotificationPreferences>(),
}))

describe('syncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncModule', () => {
    it('marks a module as syncing before executing it', async () => {
      vi.mocked(syncNotifications).mockResolvedValue(5)

      await syncModule('notifications')

      expect(repositories.syncMetadata.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          module: 'notifications',
          sync_status: 'syncing',
          last_attempted_at: expect.any(String),
          last_error: null,
        }),
      )

      expect(syncNotifications).toHaveBeenCalledOnce()
    })

    it('marks a module as successful after synchronization', async () => {
      vi.mocked(syncNotifications).mockResolvedValue(5)

      const result = await syncModule('notifications')

      expect(result).toBe(5)

      expect(repositories.syncMetadata.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          module: 'notifications',
          sync_status: 'success',
          last_synced_at: expect.any(String),
          last_error: null,
        }),
      )
    })

    it('returns the synchronized record count', async () => {
      vi.mocked(syncGroups).mockResolvedValue(3)

      const result = await syncModule('groups')

      expect(result).toBe(3)
    })

    it('supports synchronization functions that return void', async () => {
      vi.mocked(syncUser).mockResolvedValue(undefined)

      const result = await syncModule('users')

      expect(result).toBeUndefined()

      expect(repositories.syncMetadata.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          module: 'users',
          sync_status: 'success',
        }),
      )
    })

    it('records synchronization failures', async () => {
      const error = new Error('Network unavailable')

      vi.mocked(syncNotifications).mockRejectedValue(error)

      await expect(syncModule('notifications')).rejects.toThrow(error)

      expect(repositories.syncMetadata.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          module: 'notifications',
          sync_status: 'failed',
          last_error: 'Network unavailable',
        }),
      )
    })

    it('preserves the previous successful synchronization timestamp on failure', async () => {
      const error = new Error('Network unavailable')

      vi.mocked(syncNotifications).mockRejectedValue(error)

      await expect(syncModule('notifications')).rejects.toThrow(error)

      const failureMetadata = vi.mocked(repositories.syncMetadata.save).mock.calls[1]?.[0]

      expect(failureMetadata).not.toHaveProperty('last_synced_at')
    })

    it('converts non-Error failures to strings', async () => {
      vi.mocked(syncNotifications).mockRejectedValue('Connection lost')

      await expect(syncModule('notifications')).rejects.toBe('Connection lost')

      expect(repositories.syncMetadata.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          module: 'notifications',
          sync_status: 'failed',
          last_error: 'Connection lost',
        }),
      )
    })

    it('does not execute the same module more than once concurrently', async () => {
      let resolveSync!: (value: number) => void

      vi.mocked(syncNotifications).mockImplementation(
        () =>
          new Promise<number>((resolve) => {
            resolveSync = resolve
          }),
      )

      const firstSync = syncModule('notifications')
      const secondSync = syncModule('notifications')

      // Wait until the asynchronous metadata update completes
      // and the actual synchronization function is called.
      await vi.waitFor(() => {
        expect(syncNotifications).toHaveBeenCalledOnce()
      })

      expect(repositories.syncMetadata.save).toHaveBeenCalledOnce()

      resolveSync(5)

      await expect(Promise.all([firstSync, secondSync])).resolves.toEqual([5, 5])

      expect(repositories.syncMetadata.save).toHaveBeenCalledTimes(2)
    })

    it('allows different modules to synchronize concurrently', async () => {
      vi.mocked(syncGroups).mockResolvedValue(2)
      vi.mocked(syncNotifications).mockResolvedValue(5)

      const [groupsResult, notificationsResult] = await Promise.all([
        syncModule('groups'),
        syncModule('notifications'),
      ])

      expect(groupsResult).toBe(2)
      expect(notificationsResult).toBe(5)

      expect(syncGroups).toHaveBeenCalledOnce()
      expect(syncNotifications).toHaveBeenCalledOnce()
    })

    it('allows a module to synchronize again after completion', async () => {
      vi.mocked(syncNotifications).mockResolvedValue(5)

      await syncModule('notifications')
      await syncModule('notifications')

      expect(syncNotifications).toHaveBeenCalledTimes(2)
      expect(repositories.syncMetadata.save).toHaveBeenCalledTimes(4)
    })
  })

  describe('syncAll', () => {
    it('synchronizes all supported modules', async () => {
      await syncAll()

      expect(syncUser).toHaveBeenCalledOnce()
      expect(syncGroups).toHaveBeenCalledOnce()
      expect(syncGroupMembers).toHaveBeenCalledOnce()
      expect(syncSmartPacks).toHaveBeenCalledOnce()
      expect(syncSmartPackSensorMeasurements).toHaveBeenCalledOnce()
      expect(syncNotifications).toHaveBeenCalledOnce()
      expect(syncNotificationPreferences).toHaveBeenCalledOnce()
    })

    it('synchronizes modules in dependency order', async () => {
      const executionOrder: string[] = []

      vi.mocked(syncUser).mockImplementation(async () => {
        executionOrder.push('users')
      })

      vi.mocked(syncGroups).mockImplementation(async () => {
        executionOrder.push('groups')
        return 0
      })

      vi.mocked(syncGroupMembers).mockImplementation(async () => {
        executionOrder.push('group_members')
        return 0
      })

      vi.mocked(syncSmartPacks).mockImplementation(async () => {
        executionOrder.push('smartpacks')
        return 0
      })

      vi.mocked(syncSmartPackSensorMeasurements).mockImplementation(async () => {
        executionOrder.push('smartpack_sensor_measurements')
        return 0
      })

      vi.mocked(syncNotifications).mockImplementation(async () => {
        executionOrder.push('notifications')
        return 0
      })

      vi.mocked(syncNotificationPreferences).mockImplementation(async () => {
        executionOrder.push('notification_preferences')
      })

      await syncAll()

      expect(executionOrder).toEqual([
        'users',
        'groups',
        'group_members',
        'smartpacks',
        'smartpack_sensor_measurements',
        'notifications',
        'notification_preferences',
      ])
    })

    it('stops synchronization when a module fails', async () => {
      const error = new Error('Group synchronization failed')

      vi.mocked(syncUser).mockResolvedValue(undefined)
      vi.mocked(syncGroups).mockRejectedValue(error)

      await expect(syncAll()).rejects.toThrow(error)

      expect(syncUser).toHaveBeenCalledOnce()
      expect(syncGroups).toHaveBeenCalledOnce()

      expect(syncGroupMembers).not.toHaveBeenCalled()
      expect(syncSmartPacks).not.toHaveBeenCalled()
      expect(syncSmartPackSensorMeasurements).not.toHaveBeenCalled()
      expect(syncNotifications).not.toHaveBeenCalled()
      expect(syncNotificationPreferences).not.toHaveBeenCalled()
    })
  })
})
