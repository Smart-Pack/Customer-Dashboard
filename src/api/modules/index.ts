/**
 * @module api/modules
 * @description Barrel export for API modules used by the dashboard.
 */

import * as analysis from './analysis'
import * as auth from './auth'
import * as groups from './groups'
import * as groupMembers from './groupMembers'
import * as twoFactor from './twoFactor'
import * as users from './users'
import * as smartpacks from './smartpacks'

const api = {
  analysis,
  auth,
  groups,
  groupMembers,
  twoFactor,
  users,
  smartpacks,
}

export { analysis, auth, groups, groupMembers, twoFactor, users, smartpacks }

export default api
