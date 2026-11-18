import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { syncAll } from '../syncManager'
import {
  isSyncSchedulerRunning,
  startSyncScheduler,
  stopSyncScheduler,
  triggerSync,
} from '../syncScheduler'

vi.mock('../syncManager', () => ({
  syncAll: vi.fn<typeof import('../syncManager').syncAll>(),
}))

const DEFAULT_INTERVAL = 5 * 60 * 1000

describe('syncScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
  })

  afterEach(() => {
    stopSyncScheduler()
    vi.useRealTimers()
  })

  describe('startSyncScheduler', () => {
    it('starts the scheduler', () => {
      startSyncScheduler({ syncOnStart: false })

      expect(isSyncSchedulerRunning()).toBe(true)
      expect(vi.getTimerCount()).toBe(1)
    })

    it('runs an immediate sync by default', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler()

      await vi.waitFor(() => {
        expect(syncAll).toHaveBeenCalledOnce()
      })
    })

    it('does not run an immediate sync when syncOnStart is false', () => {
      startSyncScheduler({ syncOnStart: false })

      expect(syncAll).not.toHaveBeenCalled()
    })

    it('uses the default interval of five minutes', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler({ syncOnStart: false })

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL - 1)

      expect(syncAll).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)

      expect(syncAll).toHaveBeenCalledOnce()
    })

    it('supports a custom sync interval', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler({
        intervalMs: 10_000,
        syncOnStart: false,
      })

      await vi.advanceTimersByTimeAsync(10_000)

      expect(syncAll).toHaveBeenCalledOnce()
    })

    it('does not start multiple schedulers', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler({ syncOnStart: false })
      startSyncScheduler({ syncOnStart: false })

      expect(isSyncSchedulerRunning()).toBe(true)
      expect(vi.getTimerCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL)

      expect(syncAll).toHaveBeenCalledOnce()
    })

    it('does not run an immediate sync when started with syncOnStart false', () => {
      startSyncScheduler({ syncOnStart: false })

      expect(syncAll).not.toHaveBeenCalled()
    })
  })

  describe('stopSyncScheduler', () => {
    it('stops the scheduler', () => {
      startSyncScheduler({ syncOnStart: false })

      stopSyncScheduler()

      expect(isSyncSchedulerRunning()).toBe(false)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('does not execute scheduled syncs after stopping', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler({ syncOnStart: false })

      stopSyncScheduler()

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL * 2)

      expect(syncAll).not.toHaveBeenCalled()
    })

    it('can be restarted after stopping', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler({ syncOnStart: false })
      stopSyncScheduler()

      startSyncScheduler({ syncOnStart: false })

      expect(isSyncSchedulerRunning()).toBe(true)

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL)

      expect(syncAll).toHaveBeenCalledOnce()
    })

    it('can safely be called when the scheduler is not running', () => {
      expect(() => stopSyncScheduler()).not.toThrow()

      expect(isSyncSchedulerRunning()).toBe(false)
    })
  })

  describe('triggerSync', () => {
    it('manually triggers synchronization', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      await triggerSync()

      expect(syncAll).toHaveBeenCalledOnce()
    })

    it('does not require the scheduler to be running', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      expect(isSyncSchedulerRunning()).toBe(false)

      await triggerSync()

      expect(syncAll).toHaveBeenCalledOnce()
    })

    it('prevents overlapping manual and scheduled syncs', async () => {
      let resolveSync!: () => void

      vi.mocked(syncAll).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSync = resolve
          }),
      )

      const firstSync = triggerSync()
      const secondSync = triggerSync()

      await vi.waitFor(() => {
        expect(syncAll).toHaveBeenCalledOnce()
      })

      resolveSync()

      await Promise.all([firstSync, secondSync])

      expect(syncAll).toHaveBeenCalledOnce()
    })
  })

  describe('overlapping synchronization', () => {
    it('does not start another sync while the previous one is running', async () => {
      let resolveSync!: () => void

      vi.mocked(syncAll).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSync = resolve
          }),
      )

      startSyncScheduler({ syncOnStart: false })

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL)

      expect(syncAll).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL * 2)

      expect(syncAll).toHaveBeenCalledOnce()

      resolveSync()

      await Promise.resolve()

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL)

      expect(syncAll).toHaveBeenCalledTimes(2)

      resolveSync()
    })

    it('allows another sync after the previous sync completes', async () => {
      vi.mocked(syncAll).mockResolvedValue(undefined)

      startSyncScheduler({ syncOnStart: false })

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL)

      expect(syncAll).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL)

      expect(syncAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('passes scheduled sync errors to onError', async () => {
      const error = new Error('Network unavailable')
      const onError = vi.fn<(error: unknown) => void>()

      vi.mocked(syncAll).mockRejectedValue(error)

      startSyncScheduler({
        intervalMs: 10_000,
        syncOnStart: false,
        onError,
      })

      await vi.advanceTimersByTimeAsync(10_000)

      expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    })

    it('continues scheduling after a failed sync', async () => {
      vi.mocked(syncAll)
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValue(undefined)

      const onError = vi.fn<(error: unknown) => void>()

      startSyncScheduler({
        intervalMs: 10_000,
        syncOnStart: false,
        onError,
      })

      await vi.advanceTimersByTimeAsync(10_000)

      expect(syncAll).toHaveBeenCalledOnce()
      expect(onError).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(10_000)

      expect(syncAll).toHaveBeenCalledTimes(2)
    })
  })
})
