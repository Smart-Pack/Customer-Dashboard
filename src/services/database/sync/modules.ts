// @/services/database/sync/modules.ts
import api from '@/api/modules'

import repositories from '../repositories'
import { syncPaginated, syncSingle } from './utils'

/**
 * Synchronizes groups from the backend with the local SQLite database.
 *
 * Fetches all available pages and saves each page locally before
 * requesting the next one.
 *
 * @returns Total number of groups synchronized.
 */
async function syncGroups(): Promise<number> {
  return syncPaginated(api.groups.list, repositories.groups)
}

/**
 * Synchronizes SmartPacks from the backend with the local SQLite database.
 *
 * Fetches all available pages and saves each page locally before
 * requesting the next one.
 *
 * @returns Total number of SmartPacks synchronized.
 */
async function syncSmartPacks(): Promise<number> {
  return syncPaginated(api.smartpacks.list, repositories.smartpacks)
}

/**
 * Synchronizes notifications from the backend with the local SQLite database.
 *
 * Fetches all available pages and saves each page locally before
 * requesting the next one.
 *
 * @returns Total number of notifications synchronized.
 */
async function syncNotifications(): Promise<number> {
  return syncPaginated(api.notifications.list, repositories.notifications)
}

/**
 * Synchronizes group members for all locally cached groups.
 *
 * Retrieves cached groups and synchronizes their members
 * using their respective group IDs.
 *
 * @returns Total number of group members synchronized.
 */
async function syncGroupMembers(): Promise<number> {
  const groups = await repositories.groups.getAll()

  return syncPaginated(api.groupMembers.list, repositories.groupMembers, {
    key: 'group',
    values: groups.map((group) => group.id),
  })
}

/**
 * Synchronizes sensor measurements for all locally cached SmartPacks.
 *
 * Fetches all available pages for each SmartPack using its ID
 * as the `smartpack` API filter and repository save parameter.
 *
 * @returns Total number of sensor measurements synchronized.
 */
async function syncSmartPackSensorMeasurements(): Promise<number> {
  const smartpacks = await repositories.smartpacks.getAll()

  return syncPaginated(
    api.smartpacks.listSensorMeasurements,
    repositories.smartpackSensorMeasurements,
    {
      key: 'smartpack',
      values: smartpacks.map((smartpack) => smartpack.id),
    },
  )
}

/**
 * Synchronizes the current user's notification preferences.
 *
 * Fetches the complete preferences object and saves it locally.
 */
async function syncNotificationPreferences(): Promise<void> {
  await syncSingle(api.notificationPreferences.get, repositories.notificationPreferences)
}

/**
 * Synchronizes the current user's profile.
 *
 * Fetches the authenticated user's complete profile and saves it locally.
 */
async function syncUser(): Promise<void> {
  await syncSingle(api.users.getMe, repositories.users)
}

export {
  syncUser,
  syncGroups,
  syncGroupMembers,
  syncSmartPacks,
  syncSmartPackSensorMeasurements,
  syncNotifications,
  syncNotificationPreferences,
}
