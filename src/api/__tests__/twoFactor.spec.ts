import type { AxiosInstance } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { TWO_FACTOR } from '@/api/endpoints'
import { request, verify } from '@/api/modules/twoFactor'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn<AxiosInstance['post']>(),
  },
}))

describe('two-factor API', () => {
  /**
   * Verifies that requesting a two-factor authentication code
   * sends a request without a payload and returns the response data.
   */
  it('requests a two-factor authentication code', async () => {
    const response = {
      data: {
        detail: 'Verification code sent.',
      },
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const result = await request()

    expect(apiClient.post).toHaveBeenCalledWith(TWO_FACTOR.REQUEST)
    expect(result.detail).toBe('Verification code sent.')
  })
  /**
   * Verifies that requesting a two-factor authentication code
   * converts an API detail error into a standard Error.
   */
  it('throws the API detail message when requesting a two-factor authentication code fails', async () => {
    const error = {
      response: {
        data: {
          detail: 'Unable to send verification code.',
        },
      },
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(request()).rejects.toThrow('Unable to send verification code.')

    expect(apiClient.post).toHaveBeenCalledWith(TWO_FACTOR.REQUEST)
  })

  /**
   * Verifies that the submitted OTP is sent to the verification endpoint
   * and returns the authentication tokens.
   */
  it('verifies a two-factor authentication code', async () => {
    const response = {
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
      },
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const payload = {
      otp: '123456',
    }

    const result = await verify(payload)

    expect(apiClient.post).toHaveBeenCalledWith(TWO_FACTOR.VERIFY, payload)
    expect(result.access).toBe('access-token')
    expect(result.refresh).toBe('refresh-token')
  })
})
