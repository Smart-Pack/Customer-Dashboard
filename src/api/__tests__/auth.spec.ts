import type { AxiosInstance } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/client'
import { AUTH } from '@/api/endpoints'
import { forgotPassword, login, logout, refresh, resetPassword, verify } from '@/api/modules/auth'

interface TestAuthError {
  response: {
    status: number
    data: Record<string, unknown>
  }
  message: string
  reload?: boolean
}

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn<AxiosInstance['post']>(),
  },
}))

/**
 * Tests the authentication API module.
 */
describe('auth API', () => {
  /**
   * Verifies that login sends the correct credentials to the login endpoint
   * and returns the response data.
   */
  it('logs in a user', async () => {
    const response = {
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
      },
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const credentials = {
      email: 'user@example.com',
      password: 'password',
    }

    const result = await login(credentials)

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.LOGIN, credentials)
    expect(result).toEqual(response.data)
  })
  /**
   * Verifies that login converts an API detail error into a standard Error
   * with the detail message.
   */
  it('throws the API detail message when login fails', async () => {
    const error = {
      response: {
        data: {
          detail: 'Invalid email or password.',
        },
      },
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    const credentials = {
      email: 'user@example.com',
      password: 'password',
    }

    await expect(login(credentials)).rejects.toThrow('Invalid email or password.')

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.LOGIN, credentials)
  })

  /**
   * Verifies that logout sends the request to the logout endpoint
   * and returns the response data.
   */
  it('logs out the current user', async () => {
    const response = {
      data: {},
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const result = await logout()

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.LOGOUT)
    expect(result).toEqual(response.data)
  })

  /**
   * Verifies that refresh sends the request to the refresh endpoint
   * and returns the refreshed authentication tokens.
   */
  it('refreshes authentication tokens using the refresh cookie', async () => {
    const response = {
      data: {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      },
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const result = await refresh()

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.REFRESH, undefined, {
      skipAuthRedirect: false,
    })
    expect(result.access).toBe('new-access-token')
    expect(result.refresh).toBe('new-refresh-token')
  })

  /**
   * Verifies that token verification sends the correct payload
   * and returns the response data.
   */
  it('verifies an authentication token', async () => {
    const response = {
      data: {},
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const payload = {
      token: 'access-token',
    }

    const result = await verify(payload)

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.VERIFY, payload)
    expect(result).toEqual(response.data)
  })
  /**
   * Verifies that forgot password sends the user's email
   * and returns the success message.
   */
  it('requests a password reset', async () => {
    const response = {
      data: {},
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const payload = {
      email: 'user@example.com',
    }

    const result = await forgotPassword(payload)

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.FORGOT, payload)
    expect(result).toBe(
      'Password reset link has been sent to your email. Click on the link to reset your password.',
    )
  })

  /**
   * Verifies that the API detail error is assigned to error.message.
   */
  it('handles password reset detail errors', async () => {
    const error = {
      response: {
        data: {
          detail: 'Unable to process password reset request.',
        },
      },
      message: 'Request failed',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(forgotPassword({ email: 'user@example.com' })).rejects.toBe(error)

    expect(error.message).toBe('Unable to process password reset request.')
  })

  /**
   * Verifies that the API email error is assigned to error.message
   * when no detail error is provided.
   */
  it('handles password reset email errors', async () => {
    const error = {
      response: {
        data: {
          email: ['Enter a valid email address.'],
        },
      },
      message: 'Request failed',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(forgotPassword({ email: 'invalid@example.com' })).rejects.toBe(error)

    expect(error.message).toEqual(['Enter a valid email address.'])
  })
  /**
   * Verifies that reset password sends the correct payload
   * and returns the success message.
   */
  it('resets a user password', async () => {
    const response = {
      data: {},
    }

    vi.mocked(apiClient.post).mockResolvedValue(response)

    const payload = {
      uid: 'MQ',
      token: 'reset-token',
      new_password: 'NewPassword123!',
    }

    const result = await resetPassword(payload)

    expect(apiClient.post).toHaveBeenCalledWith(AUTH.RESET, payload)
    expect(result).toBe('Password Reset successful.')
  })

  /**
   * Verifies that non-400 errors are rethrown unchanged.
   */
  it('handles non-400 reset password errors', async () => {
    const error: TestAuthError = {
      response: {
        status: 500,
        data: {
          detail: 'Internal server error.',
        },
      },
      message: 'Request failed with status code 500',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(
      resetPassword({
        uid: 'MQ',
        token: 'reset-token',
        new_password: 'NewPassword123!',
      }),
    ).rejects.toBe(error)

    expect(error.message).toBe('Request failed with status code 500')
    expect(error.reload).toBeUndefined()
  })

  /**
   * Verifies that a token validation error marks the reset link
   * as expired and requests the user to restart the reset process.
   */
  it('handles token errors', async () => {
    const error: TestAuthError = {
      response: {
        status: 400,
        data: {
          token: ['This field may not be blank.'],
        },
      },
      message: 'Request failed with status code 400',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(
      resetPassword({
        uid: 'MQ',
        token: '',
        new_password: 'NewPassword123!',
      }),
    ).rejects.toBe(error)

    expect(error.message).toBe(
      'Password reset link expired. Initiate the process again to receive a new link in your email',
    )
    expect(error.reload).toBe(true)
  })

  /**
   * Verifies that a UID validation error marks the reset link
   * as expired and requests the user to restart the reset process.
   */
  it('handles uid errors', async () => {
    const error: TestAuthError = {
      response: {
        status: 400,
        data: {
          uid: ['This field may not be blank.'],
        },
      },
      message: 'Request failed with status code 400',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(
      resetPassword({
        uid: '',
        token: 'reset-token',
        new_password: 'NewPassword123!',
      }),
    ).rejects.toBe(error)

    expect(error.message).toBe(
      'Password reset link expired. Initiate the process again to receive a new link in your email',
    )
    expect(error.reload).toBe(true)
  })

  /**
   * Verifies that token and UID errors together mark the reset link
   * as expired and request the user to restart the reset process.
   */
  it('handles token and uid errors', async () => {
    const error: TestAuthError = {
      response: {
        status: 400,
        data: {
          token: ['This field may not be blank.'],
          uid: ['This field may not be blank.'],
        },
      },
      message: 'Request failed with status code 400',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(
      resetPassword({
        uid: '',
        token: '',
        new_password: 'NewPassword123!',
      }),
    ).rejects.toBe(error)

    expect(error.message).toBe(
      'Password reset link expired. Initiate the process again to receive a new link in your email',
    )
    expect(error.reload).toBe(true)
  })

  /**
   * Verifies that multiple new password validation errors
   * are merged into a single error message.
   */
  it('handles new password errors', async () => {
    const error: TestAuthError = {
      response: {
        status: 400,
        data: {
          new_password: ['Password is too short.', 'Password must contain a number.'],
        },
      },
      message: 'Request failed with status code 400',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(
      resetPassword({
        uid: 'MQ',
        token: 'reset-token',
        new_password: 'weak',
      }),
    ).rejects.toBe(error)

    expect(error.message).toBe('Password is too short.\nPassword must contain a number.')
    expect(error.reload).toBeUndefined()
  })

  /**
   * Verifies that unrelated 400 errors are rethrown unchanged.
   */
  it('handles unrelated 400 errors', async () => {
    const error: TestAuthError = {
      response: {
        status: 400,
        data: {
          detail: 'Invalid request.',
        },
      },
      message: 'Request failed with status code 400',
    }

    vi.mocked(apiClient.post).mockRejectedValue(error)

    await expect(
      resetPassword({
        uid: 'MQ',
        token: 'reset-token',
        new_password: 'NewPassword123!',
      }),
    ).rejects.toBe(error)

    expect(error.message).toBe('Request failed with status code 400')
    expect(error.reload).toBeUndefined()
  })
})
