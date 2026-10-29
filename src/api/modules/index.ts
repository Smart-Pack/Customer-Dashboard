/**
 * @module api/modules
 * @description Barrel export for API modules used by the dashboard.
 */

import * as analysis from './analysis'
import * as auth from './auth'
import * as groups from './groups'
import * as groupMembers from './groupMembers'
import * as twoFactor from './twoFactor'
import * as mqtt from './mqtt'
import * as notifications from './notifications'
import * as notificationPreferences from './notificationPreferences'
import * as pushSubscriptions from './pushSubscriptions'
import * as users from './users'
import * as smartpacks from './smartpacks'

const api = {
  analysis,
  auth,
  groups,
  groupMembers,
  twoFactor,
  mqtt,
  notifications,
  notificationPreferences,
  pushSubscriptions,
  users,
  smartpacks,
}

export {
  analysis,
  auth,
  groups,
  groupMembers,
  mqtt,
  twoFactor,
  notifications,
  notificationPreferences,
  pushSubscriptions,
  users,
  smartpacks,
}

export default api
