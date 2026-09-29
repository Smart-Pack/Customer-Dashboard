import apiClient from '@/api/client'
import { getApiErrorDetail } from '@/api/utils'
import type { ApiDetailResponse } from '@/api/types'
import { TWO_FACTOR } from '../endpoints'
import type { LoginResponse } from './auth'

export interface TwoFactorVerifyRequest {
  otp: string
}

/**
 * Requests a two-factor authentication code.
 *
 * @returns Confirmation message.
 */
export const request = async () => {
  try {
    const response = await apiClient.post<ApiDetailResponse>(TWO_FACTOR.REQUEST)
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
 * Verifies a two-factor authentication code.
 *
 * @param data - One-time password verification payload.
 * @returns Authentication tokens.
 */
export const verify = async (data: TwoFactorVerifyRequest) => {
  const response = await apiClient.post<LoginResponse>(TWO_FACTOR.VERIFY, data)
  return response.data
}
