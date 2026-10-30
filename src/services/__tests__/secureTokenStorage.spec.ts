import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isNativePlatform } = vi.hoisted(() => ({
  isNativePlatform: vi.fn<() => boolean>(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform,
  },
}))

vi.mock('capacitor-secure-storage-plugin', () => ({
  SecureStoragePlugin: {
    set: vi.fn<(options: { key: string; value: string }) => Promise<void>>(),
    get: vi.fn<(options: { key: string }) => Promise<{ value: string }>>(),
    remove: vi.fn<(options: { key: string }) => Promise<void>>(),
  },
}))

import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { secureTokenStorage } from '../secureTokenStorage'

const REFRESH_TOKEN_KEY = 'refresh_token'

describe('secureTokenStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isNativePlatform.mockReturnValue(true)
  })

  describe('setRefreshToken', () => {
    it('stores the refresh token securely on native platforms', async () => {
      const token = 'test-refresh-token'

      await secureTokenStorage.setRefreshToken(token)

      expect(SecureStoragePlugin.set).toHaveBeenCalledExactlyOnceWith({
        key: REFRESH_TOKEN_KEY,
        value: token,
      })
    })

    it('does not store the refresh token on web platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      await secureTokenStorage.setRefreshToken('test-refresh-token')

      expect(SecureStoragePlugin.set).not.toHaveBeenCalled()
    })

    it('propagates secure storage errors', async () => {
      const error = new Error('Storage unavailable')

      vi.mocked(SecureStoragePlugin.set).mockRejectedValue(error)

      await expect(secureTokenStorage.setRefreshToken('test-refresh-token')).rejects.toThrow(error)
    })
  })

  describe('getRefreshToken', () => {
    it('retrieves the refresh token from native secure storage', async () => {
      const token = 'test-refresh-token'

      vi.mocked(SecureStoragePlugin.get).mockResolvedValue({
        value: token,
      })

      const result = await secureTokenStorage.getRefreshToken()

      expect(SecureStoragePlugin.get).toHaveBeenCalledExactlyOnceWith({
        key: REFRESH_TOKEN_KEY,
      })
      expect(result).toBe(token)
    })

    it('returns null when no refresh token is stored', async () => {
      vi.mocked(SecureStoragePlugin.get).mockResolvedValue({
        value: '',
      })

      const result = await secureTokenStorage.getRefreshToken()

      expect(result).toBeNull()
    })

    it('returns null on web platforms without accessing secure storage', async () => {
      isNativePlatform.mockReturnValue(false)

      const result = await secureTokenStorage.getRefreshToken()

      expect(result).toBeNull()
      expect(SecureStoragePlugin.get).not.toHaveBeenCalled()
    })

    it('returns null when secure storage retrieval fails', async () => {
      vi.mocked(SecureStoragePlugin.get).mockRejectedValue(new Error('Storage unavailable'))

      const result = await secureTokenStorage.getRefreshToken()

      expect(result).toBeNull()
    })
  })

  describe('removeRefreshToken', () => {
    it('removes the refresh token from native secure storage', async () => {
      await secureTokenStorage.removeRefreshToken()

      expect(SecureStoragePlugin.remove).toHaveBeenCalledOnce()
      expect(SecureStoragePlugin.remove).toHaveBeenCalledExactlyOnceWith({
        key: REFRESH_TOKEN_KEY,
      })
    })

    it('does not remove the refresh token on web platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      await secureTokenStorage.removeRefreshToken()

      expect(SecureStoragePlugin.remove).not.toHaveBeenCalled()
    })

    it('propagates secure storage removal errors', async () => {
      const error = new Error('Storage removal failed')

      vi.mocked(SecureStoragePlugin.remove).mockRejectedValue(error)

      await expect(secureTokenStorage.removeRefreshToken()).rejects.toThrow(error)
    })
  })
})
