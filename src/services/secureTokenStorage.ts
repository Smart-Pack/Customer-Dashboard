import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

const REFRESH_TOKEN_KEY = 'refresh_token'

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
   * @returns A promise that resolves when the token is removed.
   */
  async removeRefreshToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    await SecureStoragePlugin.remove({
      key: REFRESH_TOKEN_KEY,
    })
  },
}
