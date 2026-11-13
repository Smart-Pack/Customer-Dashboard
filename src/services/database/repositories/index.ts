/**
 * @module database/repositories
 * @description Barrel export for SQLite repositories used by the dashboard.
 */

import * as users from './users'

/**
 * Clears all account-specific cached data.
 *
 * Register each new account-specific repository here
 * when adding its clear operation.
 */
async function clearAll(): Promise<void> {
  await users.clear()
}

const repositories = {
  users,
  clearAll,
}

export { users, clearAll }

export default repositories
