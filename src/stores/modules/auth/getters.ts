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
  /**
   * Returns the ID of the currently logged-in user.
   */
  userId: (state: AuthState): number | undefined => state.loggedInUser?.id,
  /**
   * Indicates whether the logged-in user is an owner or admin of the specified group.
   *
   * @param groupId - The ID of the group to check.
   * @returns `true` if the user owns or administers the group; otherwise, `false`.
   */
  isGroupAdmin:
    (state: AuthState) =>
    (groupId: string | number): boolean =>
      state.loggedInUser?.groups?.some(
        (group) =>
          group.id === Number(groupId) && (group.role === 'owner' || group.role === 'admin'),
      ) ?? false,
  /**
   * Indicates whether the logged-in user is the owner of the specified group.
   *
   * @param groupId - The ID of the group to check.
   * @returns `true` if the user is the owner of the group; otherwise, `false`.
   */
  isGroupOwner:
    (state: AuthState) =>
    (groupId: string | number): boolean =>
      state.loggedInUser?.groups?.some(
        (group) => group.id === Number(groupId) && group.role === 'owner',
      ) ?? false,
}
