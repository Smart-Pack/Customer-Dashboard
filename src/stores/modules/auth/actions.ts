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
import { secureTokenStorage } from '@/services/secureTokenStorage'

export interface AuthActions {
  clearStore(): void
  createTwoFaToken(): Promise<void>
  fetchUser(): Promise<void>
  initializeAuth(): Promise<void>
  googleLogIn(credential: string): Promise<string>
  logIn(payload: LoginRequest): Promise<string>
  logOut(): Promise<void>
  refreshToken(skipAuthRedirect?: boolean): Promise<void>
  setLoggedInUser(user: User): void
  validateAccountType(): void
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
   * Validates that the logged-in user can access the SmartPack dashboard.
   *
   * @throws {Error} If the user is not authenticated or has an invalid account type.
   */
  validateAccountType(this: AuthStoreContext): void {
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
          ? `Your credentials are for accessing the ${dashboard} dashboard. Accessing the SmartPack dashboard is restricted for your account type.`
          : 'The provided credentials are not supposed to be used for this dashboard.',
      )
    }
  },

  /**
   * Refreshes the authentication token using the securely stored
   * refresh token on native platforms or the authentication cookie on web.
   *
   * 1. Clears the current access token.
   * 2. Retrieves the refresh token from native secure storage.
   * 3. Sends the refresh token when available; otherwise uses cookie authentication.
   * 4. Updates the access token.
   *
   * @param {AuthStoreContext} this - The authentication store context.
   * @param {boolean} skipAuthRedirect - Whether to skip redirecting to login if the refresh fails.
   * @throws The error returned by the refresh request.
   */
  async refreshToken(this: AuthStoreContext, skipAuthRedirect = false) {
    this.accessToken = null

    try {
      const refreshToken = await secureTokenStorage.getRefreshToken()

      const { access, refresh } = await auth.refresh(refreshToken ?? undefined, {
        skipAuthRedirect,
      })

      this.accessToken = access

      // Persist rotated refresh tokens on native platforms.
      await secureTokenStorage.setRefreshToken(refresh)
    } catch (error) {
      this.clearStore()

      await secureTokenStorage.removeRefreshToken()

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
    this.validateAccountType()

    await twoFactor.request()
  },
  /**
   * Orchestrates the entire login flow.
   *
   * 1. Authenticates the user with their credentials.
   * 2. Stores the access token in memory.
   * 3. Persists the refresh token securely on native platforms.
   * 4. Fetches the logged-in user's profile.
   * 5. Requests the 2FA token.
   *
   * @param {AuthStoreContext} this - The authentication store context.
   * @param {LoginRequest} payload - The user's login credentials.
   * @returns {Promise<string>} The 2FA request confirmation.
   * @throws {Error} Throws an error on failure.
   */
  async logIn(this: AuthStoreContext, payload: LoginRequest) {
    this.loginBtn = 'Logging In...'

    try {
      const { access, refresh } = await auth.login(payload)

      this.accessToken = access

      await secureTokenStorage.setRefreshToken(refresh)

      this.loginBtn = 'Fetching user info...'
      await this.fetchUser()

      this.loginBtn = 'Sending OTP Token to your email...'
      await this.createTwoFaToken()

      return 'OTP sent successfully.'
    } catch (error) {
      this.clearStore()

      await secureTokenStorage.removeRefreshToken()

      throw error
    } finally {
      this.loginBtn = 'Log In'
    }
  },
  /**
   * Orchestrates the entire Google Sign-In flow.
   *
   * 1. Authenticates the user using their Google credential.
   * 2. Stores the access token in memory.
   * 3. Persists the refresh token securely on native platforms.
   * 4. Fetches the logged-in user's profile.
   * 5. Validates the user's account type.
   *
   * @param {AuthStoreContext} this - The authentication store context.
   * @param {string} credential - Google ID token credential.
   * @returns {Promise<string>} Google Sign-In confirmation message.
   * @throws {Error} Throws an error on failure.
   */
  async googleLogIn(this: AuthStoreContext, credential: string) {
    try {
      const { access, refresh } = await auth.googleLogin({ credential })

      this.accessToken = access

      await secureTokenStorage.setRefreshToken(refresh)

      await this.fetchUser()
      this.validateAccountType()

      return 'Google Sign-In successful.'
    } catch (error) {
      this.clearStore()

      await secureTokenStorage.removeRefreshToken()

      throw error
    }
  },
  /**
   * Verifies the 2FA token using the API service.
   *
   * 1. Verifies the submitted 2FA token.
   * 2. Updates the access token in memory.
   * 3. Persists the refresh token securely on native platforms.
   *
   * @param {AuthStoreContext} this - The authentication store context.
   * @param {TwoFactorVerifyRequest} payload - The 2FA token payload.
   * @returns A promise that resolves when verification is complete.
   * @throws {Error} Throws an error if verification fails.
   */
  async verifyTwoFaToken(this: AuthStoreContext, payload: TwoFactorVerifyRequest): Promise<string> {
    try {
      const { access, refresh } = await twoFactor.verify(payload)

      this.accessToken = access

      await secureTokenStorage.setRefreshToken(refresh)

      return 'OTP confirmed successfully'
    } catch (error) {
      this.clearStore()

      await secureTokenStorage.removeRefreshToken()

      throw error
    }
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
  /**
   * Logs out the authenticated user.
   *
   * 1. Retrieves the native refresh token if available.
   * 2. Attempts to invalidate the server-side authentication session.
   * 3. Removes the locally stored refresh token.
   * 4. Clears the local authentication state.
   *
   * @param {AuthStoreContext} this - The authentication store context.
   */
  async logOut(this: AuthStoreContext): Promise<void> {
    try {
      const refreshToken = await secureTokenStorage.getRefreshToken()

      await auth.logout(refreshToken ?? undefined)
    } catch {
      // Continue with local logout if server logout fails.
    } finally {
      try {
        await secureTokenStorage.removeRefreshToken()
      } finally {
        this.clearStore()
      }
    }
  },
}
