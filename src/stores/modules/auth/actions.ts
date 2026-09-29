/**
 * @module stores/modules/auth/actions
 * @description Actions for managing authentication state.
 */

import { auth, twoFactor } from '@/api'
import type { LoginRequest } from '@/api/modules/auth'
import type { TwoFactorVerifyRequest } from '@/api/modules/twoFactor'
import type { User } from '@/api/modules/users'
import { getMe } from '@/api/modules/users'
import type { AuthState } from './state'
import { ALLOWED_ACCOUNT_TYPES } from './constants'

export interface AuthActions {
  clearStore(): void
  createTwoFaToken(): Promise<void>
  fetchUser(): Promise<void>
  initializeAuth(): Promise<void>
  logIn(payload: LoginRequest): Promise<string>
  refreshToken(skipAuthRedirect?: boolean): Promise<void>
  setLoggedInUser(user: User): void
  verifyTwoFaToken(payload: TwoFactorVerifyRequest): Promise<string>
}

type AuthStoreContext = AuthState & AuthActions

/**
 * Authentication store actions.
 */
export const actions: AuthActions = {
  /**
   * Clears all authentication data from the store.
   */
  clearStore(this: AuthStoreContext) {
    this.accessToken = null
    this.loggedInUser = null
  },

  /**
   * Refreshes the authentication token using the refresh token.
   *
   * @param skipAuthRedirect - Whether to skip redirecting to login if the refresh fails.
   * @throws The error returned by the refresh request.
   */
  async refreshToken(this: AuthStoreContext, skipAuthRedirect = false) {
    this.accessToken = null

    try {
      const { access } = await auth.refresh({ skipAuthRedirect })

      this.accessToken = access
    } catch (error) {
      this.clearStore()
      throw error
    }
  },
  /**
   * Fetches the currently logged-in user's details using the API service.
   * On success, updates the user data in the store.
   *
   * @returns {Promise<void>}
   */
  async fetchUser(this: AuthStoreContext) {
    try {
      const loggedInUser = await getMe()
      this.loggedInUser = loggedInUser
    } catch (error) {
      this.clearStore()
      throw error
    }
  },

  /**
   * Validates the logged-in user's account type and requests a 2FA token.
   *
   * @returns {Promise<string>} The 2FA request confirmation message.
   * @throws {Error} If the user is not authenticated or is not allowed
   * to access the dashboard.
   */
  async createTwoFaToken(this: AuthStoreContext): Promise<void> {
    const accountType = this.loggedInUser?.account_type

    if (!accountType) {
      throw new Error('User is not authenticated.')
    }

    if (!ALLOWED_ACCOUNT_TYPES.includes(accountType)) {
      const dashboardMap = {
        internal: 'Admin',
        customer: 'Customer',
      }

      const dashboard = dashboardMap[accountType]

      throw new Error(
        dashboard
          ? `Your credentials are for accessing the ${dashboard} dashboard. Accessing the Admin dashboard is restricted for your account type.`
          : 'The provided credentials are not supposed to be used for this dashboard.',
      )
    }

    await twoFactor.request()
  },
  /**
   * Orchestrates the entire login flow.
   * 1. Calls the API service to log in with credentials.
   * 2. Stores the access token.
   * 3. Fetches the logged-in user's profile.
   * 4. Requests the 2FA token.
   *
   * @param {AuthStoreContext} this - The authentication store context.
   * @param {LoginRequest} payload - The user's login credentials.
   * @returns {Promise<{ detail: string }>} The 2FA request confirmation.
   * @throws {Error} Throws an error on failure.
   */
  async logIn(this: AuthStoreContext, payload: LoginRequest) {
    this.loginBtn = 'Logging In...'

    try {
      const { access } = await auth.login(payload)

      this.accessToken = access

      this.loginBtn = 'Fetching user info...'
      await this.fetchUser()

      this.loginBtn = 'Sending OTP Token to your email...'
      await this.createTwoFaToken()

      return 'OTP sent successfully.'
    } catch (error) {
      this.clearStore()
      throw error
    } finally {
      this.loginBtn = 'Log In'
    }
  },
  /**
   * Verifies the 2FA token using the API service.
   * On success, updates the access token.
   *
   * @param payload - The 2FA token payload.
   * @returns A promise that resolves when verification is complete.
   */
  async verifyTwoFaToken(this: AuthStoreContext, payload: TwoFactorVerifyRequest): Promise<string> {
    const { access } = await twoFactor.verify(payload)
    this.accessToken = access
    return 'OTP confirmed successfully'
  },
  /**
   * Restores the authentication state on application startup.
   *
   * Refreshes the access token without redirecting on failure, then
   * fetches the authenticated user's details.
   */
  async initializeAuth(this: AuthStoreContext) {
    try {
      await this.refreshToken(true)
      await this.fetchUser()
    } catch {
      // No valid session to restore.
    }
  },
  /**
   * Updates the authenticated user's details in the authentication store.
   *
   * Replaces the currently stored user with the provided user data.
   *
   * @param user - The authenticated user's details.
   */
  setLoggedInUser(this: AuthStoreContext, user: User): void {
    this.loggedInUser = user
  },
}
