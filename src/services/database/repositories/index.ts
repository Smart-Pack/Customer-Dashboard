/**
 * @module database/repositories
 * @description Barrel export for SQLite repositories used by the dashboard.
 */

import * as users from './users'

const repositories = {
  users,
}

export { users }

export default repositories
