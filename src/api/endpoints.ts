// src/apis/endpoints.js

/**
 * Endpoints for user authentication.
 */
export const AUTH = {
  FORGOT: '/v1/users/reset_password/request/',
  RESET: '/v1/users/reset_password/confirm/',
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
  detail: (id: string | number): string => `v1/smartpacks/${id}/`,
  assign: (id: string | number): string => `v1/smartpacks/${id}/assign/`,
  unassign: (id: string | number): string => `v1/smartpacks/${id}/unassign/`,
} as const

export const ANALYSIS = {
  ADMIN_GENERAL: 'v1/core/analysis/admin-general/',
} as const
