import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth, twoFactor } from '@/api'
import { getMe } from '@/api/modules/users'
import { mockUser } from '@/tests/constants'
import type { RefreshOptions } from '@/api/modules/auth'
import type { User } from '@/api/modules/users'

import { actions, type AuthActions } from '../actions'
import type { AuthState } from '../state'

vi.mock('@/api/modules/users', () => ({
  getMe: vi.fn<() => Promise<User>>(),
}))
vi.mock('@/api', () => ({
  auth: {
    login: vi.fn<() => Promise<{ access: string; refresh: string }>>(),
    refresh: vi.fn<(options?: RefreshOptions) => Promise<{ access: string; refresh: string }>>(),
  },
  twoFactor: {
    request: vi.fn<() => Promise<{ detail: string }>>(),
    verify: vi.fn<() => Promise<{ access: string }>>(),
  },
}))

describe('auth store actions', () => {
  let state: AuthState
  let store: AuthState & AuthActions

  beforeEach(() => {
    state = {
      accessToken: 'old-access-token',
      loggedInUser: null,
      loginBtn: 'Log In',
    }

    store = {
      ...state,
      ...actions,
    }

    vi.clearAllMocks()
  })

  describe('clearStore', () => {
    it('clears the access token and logged-in user', () => {
      store.loggedInUser = mockUser

      store.clearStore()

      expect(store.accessToken).toBeNull()
      expect(store.loggedInUser).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('refreshes the access token successfully', async () => {
      vi.mocked(auth.refresh).mockResolvedValue({
        access: 'new-access-token',
        refresh: 'refresh-token',
      })

      await store.refreshToken()

      expect(auth.refresh).toHaveBeenCalledExactlyOnceWith({
        skipAuthRedirect: false,
      })
      expect(store.accessToken).toBe('new-access-token')
    })
    it('refreshes the access token without redirect when requested', async () => {
      vi.mocked(auth.refresh).mockResolvedValue({
        access: 'new-access-token',
        refresh: 'refresh-token',
      })

      await store.refreshToken(true)

      expect(auth.refresh).toHaveBeenCalledExactlyOnceWith({
        skipAuthRedirect: true,
      })
      expect(store.accessToken).toBe('new-access-token')
    })

    it('clears the existing access token before refreshing', async () => {
      let tokenDuringRefresh: string | null | undefined

      vi.mocked(auth.refresh).mockImplementation(async () => {
        tokenDuringRefresh = store.accessToken

        return {
          access: 'new-access-token',
          refresh: 'refresh-token',
        }
      })

      await store.refreshToken()

      expect(tokenDuringRefresh).toBeNull()
      expect(store.accessToken).toBe('new-access-token')
    })

    it('clears the store and rethrows when refresh fails', async () => {
      const error = new Error('Refresh failed')

      vi.mocked(auth.refresh).mockRejectedValue(error)

      await expect(store.refreshToken()).rejects.toThrow('Refresh failed')

      expect(store.accessToken).toBeNull()
    })
  })

  describe('fetchUser', () => {
    it('fetches and stores the currently logged-in user', async () => {
      vi.mocked(getMe).mockResolvedValue(mockUser)

      await store.fetchUser()

      expect(getMe).toHaveBeenCalledExactlyOnceWith()
      expect(store.loggedInUser).toEqual(mockUser)
    })

    it('clears the store and rethrows when fetching the user fails', async () => {
      const error = new Error('Failed to fetch user')

      vi.mocked(getMe).mockRejectedValue(error)

      await expect(store.fetchUser()).rejects.toThrow('Failed to fetch user')

      expect(store.accessToken).toBeNull()
      expect(store.loggedInUser).toBeNull()
    })
  })
  describe('createTwoFaToken', () => {
    it('requests a 2FA token for an allowed account type', async () => {
      store.loggedInUser = { ...mockUser }

      vi.mocked(twoFactor.request).mockResolvedValue({
        detail: 'OTP sent successfully.',
      })

      await store.createTwoFaToken()

      expect(twoFactor.request).toHaveBeenCalledExactlyOnceWith()
    })

    it('throws when the user is not authenticated', async () => {
      store.loggedInUser = null

      await expect(store.createTwoFaToken()).rejects.toThrow('User is not authenticated.')

      expect(twoFactor.request).not.toHaveBeenCalled()
    })

    it('throws when the account type is not allowed', async () => {
      store.loggedInUser = {
        ...mockUser,
        account_type: 'customer',
      }

      await expect(store.createTwoFaToken()).rejects.toThrow(
        'Your credentials are for accessing the Customer dashboard. Accessing the Admin dashboard is restricted for your account type.',
      )

      expect(twoFactor.request).not.toHaveBeenCalled()
    })

    it('propagates the 2FA request error', async () => {
      store.loggedInUser = { ...mockUser }

      const error = new Error('Failed to request 2FA token')

      vi.mocked(twoFactor.request).mockRejectedValue(error)

      await expect(store.createTwoFaToken()).rejects.toThrow('Failed to request 2FA token')
    })
  })
  describe('logIn', () => {
    const credentials = {
      email: 'john@example.com',
      password: 'password123',
    }

    it('logs in, stores the access token, fetches the user, and requests 2FA', async () => {
      vi.mocked(auth.login).mockResolvedValue({
        access: 'new-access-token',
        refresh: 'refresh-token',
      })

      vi.mocked(getMe).mockResolvedValue(mockUser)

      vi.mocked(twoFactor.request).mockResolvedValue({
        detail: 'OTP sent successfully.',
      })

      await store.logIn(credentials)

      expect(auth.login).toHaveBeenCalledExactlyOnceWith(credentials)
      expect(store.accessToken).toBe('new-access-token')
      expect(getMe).toHaveBeenCalledExactlyOnceWith()
      expect(twoFactor.request).toHaveBeenCalledExactlyOnceWith()
      expect(store.loginBtn).toBe('Log In')
    })

    it('clears the store and rethrows when login fails', async () => {
      const error = new Error('Invalid credentials')

      vi.mocked(auth.login).mockRejectedValue(error)
      store.accessToken = 'existing-access-token'

      await expect(store.logIn(credentials)).rejects.toThrow('Invalid credentials')

      expect(store.accessToken).toBeNull()
      expect(store.loggedInUser).toBeNull()
      expect(getMe).not.toHaveBeenCalled()
      expect(twoFactor.request).not.toHaveBeenCalled()
      expect(store.loginBtn).toBe('Log In')
    })
  })
  describe('verifyTwoFaToken', () => {
    it('verifies the 2FA token and updates the access token', async () => {
      const payload = {
        otp: '123456',
      }

      vi.mocked(twoFactor.verify).mockResolvedValue({
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      })

      await store.verifyTwoFaToken(payload)

      expect(twoFactor.verify).toHaveBeenCalledWith(payload)
      expect(store.accessToken).toBe('new-access-token')
    })
  })
  describe('initializeAuth', () => {
    it('refreshes the token without redirect and fetches the user successfully', async () => {
      vi.mocked(auth.refresh).mockResolvedValue({
        access: 'new-access-token',
        refresh: 'refresh-token',
      })
      vi.mocked(getMe).mockResolvedValue(mockUser)

      await store.initializeAuth()

      expect(auth.refresh).toHaveBeenCalledExactlyOnceWith({
        skipAuthRedirect: true,
      })
      expect(getMe).toHaveBeenCalledTimes(1)
    })

    it('does nothing when token refresh fails', async () => {
      vi.mocked(auth.refresh).mockRejectedValue(new Error('Refresh failed'))

      await expect(store.initializeAuth()).resolves.toBeUndefined()

      expect(auth.refresh).toHaveBeenCalledExactlyOnceWith({
        skipAuthRedirect: true,
      })
      expect(getMe).not.toHaveBeenCalled()
    })

    it('does nothing when fetching the user fails', async () => {
      vi.mocked(auth.refresh).mockResolvedValue({
        access: 'new-access-token',
        refresh: 'refresh-token',
      })
      vi.mocked(getMe).mockRejectedValue(new Error('Failed to fetch user'))

      await expect(store.initializeAuth()).resolves.toBeUndefined()

      expect(auth.refresh).toHaveBeenCalledExactlyOnceWith({
        skipAuthRedirect: true,
      })
      expect(getMe).toHaveBeenCalledTimes(1)
    })
  })
  describe('setLoggedInUser', () => {
    it('updates the authenticated user in the store', () => {
      const updatedUser = {
        ...mockUser,
        first_name: 'Updated',
      }

      store.setLoggedInUser(updatedUser)

      expect(store.loggedInUser).toEqual(updatedUser)
    })
  })
})
