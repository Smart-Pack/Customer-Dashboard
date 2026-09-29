import { beforeEach, describe, expect, it, vi } from 'vitest'

import { jwtDecode } from 'jwt-decode'

import { isOtpVerified } from '../auth'

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn<(token: string) => { otp_verified?: boolean }>(),
}))

describe('isOtpVerified', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when the token has otp_verified set to true', () => {
    vi.mocked(jwtDecode).mockReturnValue({
      otp_verified: true,
    })

    expect(isOtpVerified('valid-token')).toBe(true)
    expect(jwtDecode).toHaveBeenCalledTimes(1)
    expect(jwtDecode).toHaveBeenCalledWith('valid-token')
  })

  it('returns false when otp_verified is false', () => {
    vi.mocked(jwtDecode).mockReturnValue({
      otp_verified: false,
    })

    expect(isOtpVerified('valid-token')).toBe(false)
  })

  it('returns false when otp_verified is missing', () => {
    vi.mocked(jwtDecode).mockReturnValue({})

    expect(isOtpVerified('valid-token')).toBe(false)
  })

  it('returns false when decoding the token fails', () => {
    vi.mocked(jwtDecode).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    expect(isOtpVerified('invalid-token')).toBe(false)
  })
})
