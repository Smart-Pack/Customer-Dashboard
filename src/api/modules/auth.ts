import apiClient from '@/api/client'
import type { ApiDetailResponse } from '@/api/types'
import { getApiErrorDetail } from '@/api/utils'
import { AUTH } from '../endpoints'

export interface ForgotPasswordRequest {
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
}

export interface ResetPasswordRequest {
  uid: string
  token: string
  new_password: string
}

export interface RefreshOptions {
  skipAuthRedirect?: boolean
}

export interface VerifyRequest {
  token: string
}

/**
 * Authenticates a user with their email and password.
 *
 * The API returns access and refresh tokens and sets the corresponding
 * authentication cookies.
 *
 * @param data - User login credentials.
 * @returns Authentication tokens.
 */
export const login = async (data: LoginRequest) => {
  try {
    const response = await apiClient.post<LoginResponse>(AUTH.LOGIN, data)
    return response.data
  } catch (error: unknown) {
    const detail = getApiErrorDetail(error)

    if (detail) {
      throw new Error(detail)
    }

    throw error
  }
}

/**
 * Logs out the current user by clearing the authentication cookies.
 *
 * @returns Logout confirmation.
 */
export const logout = async () => {
  const response = await apiClient.post<ApiDetailResponse>(AUTH.LOGOUT)
  return response.data
}

/**
 * Refreshes the authentication tokens using the refresh token
 * stored in the authentication cookie.
 *
 * @param options - Optional configuration for the refresh request.
 * @returns Refreshed authentication tokens.
 */
export const refresh = async (options?: RefreshOptions) => {
  const response = await apiClient.post<LoginResponse>(AUTH.REFRESH, undefined, {
    skipAuthRedirect: options?.skipAuthRedirect ?? false,
  })

  return response.data
}

/**
 * Verifies the authentication token.
 *
 * @param data - Token verification payload.
 * @returns Verification confirmation.
 */
export const verify = async (data: VerifyRequest) => {
  const response = await apiClient.post<ApiDetailResponse>(AUTH.VERIFY, data)
  return response.data
}

/**
 * Sends a password reset link to the user's email.
 *
 * @param data - User email address.
 * @returns A success message when the request succeeds.
 * @throws An error containing the API error message when the request fails.
 */
export const forgotPassword = async (data: ForgotPasswordRequest): Promise<string> => {
  try {
    await apiClient.post(AUTH.FORGOT, data)

    return 'Password reset link has been sent to your email. Click on the link to reset your password.'
  } catch (error: unknown) {
    const e = error as {
      response?: {
        data?: {
          detail?: string
          email?: string
        }
      }
      message: string
    }

    const responseData = e.response?.data

    if (responseData?.detail) {
      e.message = responseData.detail
    } else if (responseData?.email) {
      e.message = responseData.email
    }

    throw e
  }
}

/**
 * Resets the user's password using the token from the reset link.
 *
 * @param {ResetPasswordRequest} data - The request payload.
 * @param {string} data.uid - The user's ID from the reset link.
 * @param {string} data.token - The token from the reset link.
 * @param {string} data.new_password - The new password.
 * @returns {Promise<string>} A promise that resolves with a success message.
 * @throws {unknown} Throws a decorated error if the token is invalid or expired.
 */
export const resetPassword = async (data: ResetPasswordRequest): Promise<string> => {
  try {
    await apiClient.post(AUTH.RESET, data)
    return 'Password Reset successful.'
  } catch (error: unknown) {
    const e = error as {
      response?: {
        status?: number
        data?: {
          token?: string[]
          uid?: string[]
          new_password?: string[]
        }
      }
      message: string
      reload?: boolean
    }

    if (e.response?.status !== 400) {
      throw e
    }

    const data = e.response?.data

    if (!data) {
      throw e
    }

    if ('token' in data || 'uid' in data) {
      e.message =
        'Password reset link expired. Initiate the process again to receive a new link in your email'
      e.reload = true
    } else if ('new_password' in data) {
      e.message = data.new_password?.join('\n') ?? ''
    }

    throw e
  }
}
