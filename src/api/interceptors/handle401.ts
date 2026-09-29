import type { AxiosError } from 'axios'

import { AUTH } from '../endpoints'
import router from '@/router'
import { retryRequest, type RetryRequestConfig } from './retryRequest'

/**
 * Handles 401 Unauthorized responses.
 *
 * Authentication and two-factor endpoints are excluded from
 * the token refresh flow. Protected requests are retried once
 * after refreshing the access token.
 *
 * A failed refresh request indicates that the current session
 * has expired and requires the user to log in again.
 *
 * @param error - Axios error containing the failed request.
 * @returns The retried request or the rejected error.
 */
export async function handle401(error: AxiosError) {
  const originalRequest = error.config as RetryRequestConfig | undefined

  const url = originalRequest?.url ?? ''

  /**
   * A failed token refresh means the current session has expired.
   * Redirect to login unless explicitly requested to skip the redirect.
   */
  if (url.includes(AUTH.REFRESH)) {
    if (error.config?.skipAuthRedirect !== true) {
      await router.replace({ name: 'login' })
    }

    return Promise.reject(new Error('Session expired. Please log in again.'))
  }

  /**
   * Authentication endpoints must not trigger token refresh.
   */
  if (url.includes(AUTH.LOGIN) || url.includes(AUTH.VERIFY)) {
    return Promise.reject(error)
  }

  /**
   * Prevent an infinite refresh/retry loop.
   */
  if (originalRequest?._retry) {
    return Promise.reject(error)
  }

  /**
   * Refresh the access token and retry the original request.
   */
  return retryRequest(error)
}
