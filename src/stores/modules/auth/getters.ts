import type { AuthState } from './state'
import { isOtpVerified } from '@/utils/auth'

/**
 * Authentication state getters.
 */
export const getters = {
  /**
   * Indicates whether the user has changed their password after the initial login.
   */
  hasChangedPassword: (state: AuthState): boolean =>
    Boolean(state.loggedInUser?.changed_password_after_initial_login),
  /**
   * Indicates whether the user has fully completed the authentication process.
   *
   * Users without two-factor authentication enabled are considered fully
   * authenticated once their user information is available. Users with
   * two-factor authentication enabled must also have a valid access token
   * with a verified OTP claim.
   */
  isFullyAuthenticated: (state: AuthState): boolean => {
    if (!state.loggedInUser) {
      return false
    }

    if (!state.loggedInUser.two_factor_enabled) {
      return true
    }

    return state.accessToken ? isOtpVerified(state.accessToken) : false
  },
  /**
   * Indicates whether the logged-in user has the admin role.
   */
  isAdmin: (state: AuthState): boolean => state.loggedInUser?.role === 'admin',
  /**
   * Indicates whether the given user ID belongs to the logged-in user.
   */
  isCurrentUser:
    (state: AuthState) =>
    (id: string | number): boolean =>
      state.loggedInUser?.id === id,
}
