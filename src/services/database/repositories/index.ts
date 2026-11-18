/**
 * @module database/repositories
 * @description Barrel export for SQLite repositories used by the dashboard.
 */

import * as users from './users'
import * as groups from './groups'
import * as groupMembers from './groupMembers'
import * as smartpacks from './smartpacks'
import * as bluetoothSensorMeasurements from './bluetoothSensorMeasurements'
import * as smartpackSensorMeasurements from './smartpackSensorMeasurements'
import * as notifications from './notifications'
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
  await notifications.clear()
  await smartpackSensorMeasurements.clear()
  await bluetoothSensorMeasurements.clear()
  await smartpacks.clear()
  await groupMembers.clear()
  await groups.clear()
}

const repositories = {
  users,
  notificationPreferences,
  notifications,
  groups,
  groupMembers,
  smartpackSensorMeasurements,
  bluetoothSensorMeasurements,
  smartpacks,
  clearAll,
}

export {
  users,
  notificationPreferences,
  notifications,
  groupMembers,
  groups,
  smartpackSensorMeasurements,
  bluetoothSensorMeasurements,
  smartpacks,
  clearAll,
}

export default repositories
