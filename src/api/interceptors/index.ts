/**
 * @module api/interceptors
 * @description Configures Axios request and response interceptors.
 */
import { useAuthStore } from '@/stores'

import apiClient from '../client'
import { AUTH } from '../endpoints'
import { handle401 } from './handle401'

/**
 * Request Interceptor
 *
 * Adds the current access token to the Authorization header
 * before each API request.
 */
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.accessToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

/**
 * Response Interceptor
 *
 * Handles successful responses and delegates 401 Unauthorized
 * responses to the 401 handler.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    /**
     * Set the error message from the API response or use a default
     * message when the server cannot be reached.
     */
    if (error.response?.data?.detail) {
      error.message = error.response.data.detail
    } else if (error.response?.status === 400) {
      error.message = 'Please correct the highlighted fields.'
    } else if (!error.response) {
      error.message = 'Unable to reach the server. Please check your network connection.'
    }
    const url = error.config?.url ?? ''

    /**
     * Handle unauthenticated requests and failed token refreshes.
     */
    if (error.response?.status === 401 || url.includes(AUTH.REFRESH)) {
      return handle401(error)
    }

    return Promise.reject(error)
  },
)
