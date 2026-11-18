import type { SyncModule } from '../repositories/syncMetadata'

import repositories from '../repositories'
import {
  syncGroups,
  syncGroupMembers,
  syncNotifications,
  syncNotificationPreferences,
  syncSmartPackSensorMeasurements,
  syncSmartPacks,
  syncUser,
} from './modules'

/**
 * Represents a synchronization function for a module.
 */
type SyncFunction = () => Promise<number | void>

/**
 * Modules that currently support backend pull synchronization.
 */
const syncFunctions = {
  users: syncUser,
  groups: syncGroups,
  group_members: syncGroupMembers,
  smartpacks: syncSmartPacks,
  smartpack_sensor_measurements: syncSmartPackSensorMeasurements,
  notifications: syncNotifications,
  notification_preferences: syncNotificationPreferences,
} satisfies Partial<Record<SyncModule, SyncFunction>>

/**
 * Modules supported by the synchronization manager.
 */
export type SyncableModule = keyof typeof syncFunctions

/**
 * Tracks currently running synchronization operations.
 *
 * Prevents multiple callers from starting the same module
 * synchronization concurrently.
 */
const inFlight = new Map<SyncableModule, Promise<number | void>>()

/**
 * Executes synchronization for a single module and updates
 * its synchronization metadata.
 *
 * @param module - Module to synchronize.
 * @returns Number of synchronized records, when applicable.
 */
async function executeSync(module: SyncableModule): Promise<number | void> {
  const now = new Date().toISOString()

  await repositories.syncMetadata.save({
    module,
    sync_status: 'syncing',
    last_attempted_at: now,
    last_error: null,
  })

  try {
    const result = await syncFunctions[module]()

    await repositories.syncMetadata.save({
      module,
      sync_status: 'success',
      last_synced_at: new Date().toISOString(),
      last_error: null,
    })

    return result
  } catch (error) {
    await repositories.syncMetadata.save({
      module,
      sync_status: 'failed',
      last_error: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}

/**
 * Synchronizes a single module.
 *
 * If synchronization for the same module is already running,
 * returns the existing operation instead of starting another.
 *
 * @param module - Module to synchronize.
 * @returns Number of synchronized records, when applicable.
 */
function syncModule(module: SyncableModule): Promise<number | void> {
  const existingSync = inFlight.get(module)

  if (existingSync) {
    return existingSync
  }

  const operation = executeSync(module).finally(() => {
    inFlight.delete(module)
  })

  inFlight.set(module, operation)

  return operation
}

/**
 * Synchronizes all supported modules sequentially.
 *
 * Sequential execution ensures that dependent data is available
 * before its related modules are synchronized.
 *
 * For example, groups are synchronized before group members,
 * and SmartPacks before their sensor measurements.
 */
async function syncAll(): Promise<void> {
  const modules = Object.keys(syncFunctions) as SyncableModule[]

  for (const module of modules) {
    await syncModule(module)
  }
}

export { syncModule, syncAll }
