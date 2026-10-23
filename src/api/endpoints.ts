// src/apis/endpoints.js

/**
 * Endpoints for user authentication.
 */
export const AUTH = {
  FORGOT: '/v1/users/reset_password/request/',
  RESET: '/v1/users/reset_password/confirm/',
  GOOGLE_LOGIN: 'v1/users/auth/google-login/',
  LOGIN: 'v1/users/auth/login/',
  LOGOUT: 'v1/users/auth/logout/',
  REFRESH: 'v1/users/auth/refresh/',
  VERIFY: 'v1/users/auth/verify/',
} as const

export const TWO_FACTOR = {
  REQUEST: 'v1/users/2fa/',
  VERIFY: 'v1/users/2fa/verify/',
} as const

export const USERS = {
  INITIAL_PASSWORD: 'v1/users/initial_password/',
  SET_PASSWORD: 'v1/users/set_password/',
  ME: 'v1/users/me/',
  COLLECTION: 'v1/users/',
  REGISTER: 'v1/users/register/',
  collectionWithQuery: (params?: object) => {
    if (!params) return USERS.COLLECTION

    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    )

    return `${USERS.COLLECTION}?${query.toString()}`
  },
  detail: (id: string | number): string => `v1/users/${id}/`,
} as const

export const SMARTPACKS = {
  COLLECTION: 'v1/smartpacks/',
  claim: (deviceUid: string): string => `v1/smartpacks/${deviceUid}/claim/`,
  detail: (id: string | number): string => `v1/smartpacks/${id}/`,
  assign: (id: string | number): string => `v1/smartpacks/${id}/assign/`,
  unassign: (id: string | number): string => `v1/smartpacks/${id}/unassign/`,
  assignGroup: (id: string | number): string => `v1/smartpacks/${id}/group/assign/`,
  unassignGroup: (id: string | number): string => `v1/smartpacks/${id}/group/unassign/`,
} as const

export const ANALYSIS = {
  ADMIN_GENERAL: 'v1/core/analysis/admin-general/',
} as const

export const GROUPS = {
  COLLECTION: 'v1/users/groups/',
  collectionWithQuery: (params?: object) => {
    if (!params) return GROUPS.COLLECTION

    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    )

    return `${GROUPS.COLLECTION}?${query.toString()}`
  },
  detail: (id: string | number): string => `v1/users/groups/${id}/`,
} as const

export const GROUP_MEMBERS = {
  COLLECTION: 'v1/users/groups/members/',
  collectionWithQuery: (params?: object) => {
    if (!params) return GROUP_MEMBERS.COLLECTION

    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    )

    return `${GROUP_MEMBERS.COLLECTION}?${query.toString()}`
  },
  detail: (id: string | number): string => `v1/users/groups/members/${id}/`,
  leave: (id: string | number): string => `v1/users/groups/members/${id}/leave/`,
  sendInvite: (groupId: string | number): string => `v1/users/groups/${groupId}/invite/`,
  verifyInvite: `v1/users/groups/invitations/verify/`,
  joinInvite: `v1/users/groups/invitations/join/`,
} as const

export const PUSH_SUBSCRIPTIONS = {
  COLLECTION: 'v1/core/push-subscriptions/',
  collectionWithQuery: (params?: object) => {
    if (!params) return PUSH_SUBSCRIPTIONS.COLLECTION

    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    )

    return `${PUSH_SUBSCRIPTIONS.COLLECTION}?${query.toString()}`
  },
  detail: (id: string | number): string => `v1/core/push-subscriptions/${id}/`,
} as const

export const NOTIFICATION_PREFERENCES = {
  ME: 'v1/users/me/notification-preferences/',
} as const
