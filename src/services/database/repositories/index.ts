/**
 * @module database/repositories
 * @description Barrel export for SQLite repositories used by the dashboard.
 */

import * as users from './users'
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
}

const repositories = {
  users,
  notificationPreferences,
  clearAll,
}

export { users, notificationPreferences, clearAll }

export default repositories
