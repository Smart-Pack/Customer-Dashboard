import type { User } from '@/api/modules/users'

/**
 * Represents the authentication state.
 */
export interface AuthState {
  /** The current access token, or `null` when unavailable. */
  accessToken: string | null

  /** The currently logged-in user, or `null` when unavailable. */
  loggedInUser: User | null

  loginBtn: string
}

/**
 * Initial authentication state.
 */
export const state: AuthState = {
  accessToken: null,
  loggedInUser: null,
  loginBtn: 'Log In',
}
