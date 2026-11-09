import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

const REFRESH_TOKEN_KEY = 'refresh_token'

/**
 * Extracts a readable message from an unknown error value.
 *
 * Capacitor plugins often reject with plain objects instead of `Error`
 * instances, so both shapes are handled.
 *
 * @param error - The caught error value.
 * @returns The error message.
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }

  return String(error)
}

/**
 * Provides secure storage operations for authentication refresh tokens.
 *
 * Native platforms use the Capacitor Secure Storage plugin.
 * Web platforms skip these operations because this service is intended
 * for native secure storage only.
 */
export const secureTokenStorage = {
  /**
   * Stores a refresh token securely on a native platform.
   *
   * @param token - The refresh token to store.
   * @returns A promise that resolves when the token is stored.
   */
  async setRefreshToken(token: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    await SecureStoragePlugin.set({
      key: REFRESH_TOKEN_KEY,
      value: token,
    })
  },

  /**
   * Retrieves the stored refresh token from native secure storage.
   *
   * @returns The stored refresh token, or null if no token exists.
   */
  async getRefreshToken(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null

    try {
      const { value } = await SecureStoragePlugin.get({
        key: REFRESH_TOKEN_KEY,
      })

      return value || null
    } catch {
      return null
    }
  },

  /**
   * Removes the stored refresh token from native secure storage.
   *
   * Does nothing if no token is stored; a "key does not exist" error is
   * ignored, while any other failure is rethrown.
   *
   * @returns A promise that resolves when the token is removed.
   */
  async removeRefreshToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    try {
      await SecureStoragePlugin.remove({
        key: REFRESH_TOKEN_KEY,
      })
    } catch (error) {
      // The token may never have been saved or may already be removed.
      if (!getErrorMessage(error).toLowerCase().includes('does not exist')) {
        throw error
      }
    }
  },
}
