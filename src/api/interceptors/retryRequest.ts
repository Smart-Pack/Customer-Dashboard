/**
 * @module api/utils/retryRequest
 * @description Provides functionality for refreshing authentication tokens
 * and retrying failed API requests.
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/stores'
import apiClient from '../client'

/**
 * Extended Axios request configuration that tracks whether
 * the request has already been retried.
 */
export interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

/**
 * Refreshes the access token and retries the original API request.
 *
 * The request is marked as retried before attempting the token refresh
 * to prevent an infinite refresh and retry loop.
 *
 * @param error - Axios error containing the failed request configuration.
 * @returns The response from the retried request.
 * @throws The error returned when token refresh fails.
 */
export async function retryRequest(error: AxiosError) {
  const originalRequest = error.config as RetryRequestConfig

  // Prevent the same request from being retried more than once.
  originalRequest._retry = true

  const authStore = useAuthStore()

  // Refresh the access token using the authentication store.
  await authStore.refreshToken()

  const accessToken = authStore.accessToken

  // Attach the refreshed access token to the original request.
  if (accessToken) {
    originalRequest.headers.Authorization = `Bearer ${accessToken}`
  }

  // Retry the original request with the refreshed token.
  return apiClient(originalRequest)
}
