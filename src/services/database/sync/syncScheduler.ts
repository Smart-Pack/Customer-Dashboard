import { syncAll } from './syncManager'

const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

export interface SyncSchedulerOptions {
  /**
   * Interval between synchronization attempts, in milliseconds.
   */
  intervalMs?: number

  /**
   * Whether to synchronize immediately when the scheduler starts.
   */
  syncOnStart?: boolean

  /**
   * Callback invoked when a synchronization attempt fails.
   */
  onError?: (error: unknown) => void
}

let intervalId: ReturnType<typeof setInterval> | null = null
let syncInProgress: Promise<void> | null = null

let handleError: (error: unknown) => void = (error) => {
  console.error('Scheduled synchronization failed:', error)
}

/**
 * Executes syncAll while preventing overlapping synchronization runs.
 */
function runSync(): Promise<void> {
  if (syncInProgress) {
    return syncInProgress
  }

  const operation = syncAll().finally(() => {
    syncInProgress = null
  })

  syncInProgress = operation

  return operation
}

/**
 * Executes synchronization and handles errors from scheduled runs.
 */
function runScheduledSync(): void {
  void runSync().catch(handleError)
}

/**
 * Starts periodic synchronization.
 *
 * Calling this function multiple times does not create multiple timers.
 */
function startSyncScheduler(options: SyncSchedulerOptions = {}): void {
  if (intervalId !== null) {
    return
  }

  const { intervalMs = DEFAULT_SYNC_INTERVAL, syncOnStart = true, onError } = options

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('Sync interval must be a positive number.')
  }

  if (onError) {
    handleError = onError
  }

  intervalId = setInterval(runScheduledSync, intervalMs)

  if (syncOnStart) {
    runScheduledSync()
  }
}

/**
 * Stops periodic synchronization.
 *
 * An already-running synchronization is allowed to finish.
 */
function stopSyncScheduler(): void {
  if (intervalId === null) {
    return
  }

  clearInterval(intervalId)
  intervalId = null
}

/**
 * Manually triggers synchronization.
 *
 * Reuses an existing synchronization operation if one is running.
 */
function triggerSync(): Promise<void> {
  return runSync()
}

/**
 * Indicates whether periodic synchronization is active.
 */
function isSyncSchedulerRunning(): boolean {
  return intervalId !== null
}

export { startSyncScheduler, stopSyncScheduler, triggerSync, isSyncSchedulerRunning }
