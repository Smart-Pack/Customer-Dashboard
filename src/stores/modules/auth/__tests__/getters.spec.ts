import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockUser } from '@/tests/constants'
import { isOtpVerified } from '@/utils/auth'

import { getters } from '../getters'
import type { AuthState } from '../state'

vi.mock('@/utils/auth', () => ({
  isOtpVerified: vi.fn<(token: string) => boolean>(),
}))

describe('auth store getters', () => {
  let state: AuthState

  beforeEach(() => {
    state = {
      accessToken: 'access-token',
      loggedInUser: null,
      loginBtn: 'Log In',
    }

    vi.clearAllMocks()
  })

  describe('hasChangedPassword', () => {
    it('returns true when the user has changed their password', () => {
      state.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: true,
      }

      expect(getters.hasChangedPassword(state)).toBe(true)
    })

    it('returns false when the user has not changed their password', () => {
      state.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: false,
      }

      expect(getters.hasChangedPassword(state)).toBe(false)
    })

    it('returns false when there is no logged-in user', () => {
      expect(getters.hasChangedPassword(state)).toBe(false)
    })
  })

  describe('isFullyAuthenticated', () => {
    it('returns false when there is no logged-in user', () => {
      expect(getters.isFullyAuthenticated(state)).toBe(false)
    })

    it('returns true when two-factor authentication is disabled', () => {
      state.loggedInUser = {
        ...mockUser,
        two_factor_enabled: false,
      }

      expect(getters.isFullyAuthenticated(state)).toBe(true)
      expect(isOtpVerified).not.toHaveBeenCalled()
    })

    it('returns true when two-factor authentication is enabled and OTP is verified', () => {
      state.loggedInUser = mockUser

      vi.mocked(isOtpVerified).mockReturnValue(true)

      expect(getters.isFullyAuthenticated(state)).toBe(true)
      expect(isOtpVerified).toHaveBeenCalledTimes(1)
      expect(isOtpVerified).toHaveBeenCalledWith('access-token')
    })

    it('returns false when two-factor authentication is enabled and OTP is not verified', () => {
      state.loggedInUser = mockUser

      vi.mocked(isOtpVerified).mockReturnValue(false)

      expect(getters.isFullyAuthenticated(state)).toBe(false)
      expect(isOtpVerified).toHaveBeenCalledTimes(1)
      expect(isOtpVerified).toHaveBeenCalledWith('access-token')
    })

    it('returns false when two-factor authentication is enabled but there is no access token', () => {
      state.loggedInUser = mockUser
      state.accessToken = null

      expect(getters.isFullyAuthenticated(state)).toBe(false)
      expect(isOtpVerified).not.toHaveBeenCalled()
    })
  })
})
