/**
 * @module database/repositories
 * @description Barrel export for SQLite repositories used by the dashboard.
 */

import * as users from './users'
import * as groups from './groups'
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
  await groups.clear()
}

const repositories = {
  users,
  notificationPreferences,
  groups,
  clearAll,
}

export { users, notificationPreferences, groups, clearAll }

export default repositories
