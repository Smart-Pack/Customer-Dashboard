/**
 * @module database/repositories
 * @description Barrel export for SQLite repositories used by the dashboard.
 */

import * as users from './users'
import * as groups from './groups'
import * as groupMembers from './groupMembers'
import * as smartpacks from './smartpacks'
import * as smartpackSensorMeasurements from './smartpackSensorMeasurements'
import * as notificationPreferences from './notificationPreferences'

/**
 * Clears all account-specific cached data.
 *
 * Register each new account-specific repository here
 * when adding its clear operation.
 */
async function clearAll(): Promise<void> {
  await users.clear()
  await notificationPreferences.clear()
  await smartpackSensorMeasurements.clear()
  await smartpacks.clear()
  await groupMembers.clear()
  await groups.clear()
}

const repositories = {
  users,
  notificationPreferences,
  groups,
  groupMembers,
  smartpackSensorMeasurements,
  smartpacks,
  clearAll,
}

export {
  users,
  notificationPreferences,
  groupMembers,
  groups,
  smartpackSensorMeasurements,
  smartpacks,
  clearAll,
}

export default repositories
