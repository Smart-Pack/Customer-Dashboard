/**
 * @module api/client
 * @description Creates and configures a dedicated Axios instance for API communication.
 */

import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

let validatedApiBaseUrl: string

try {
  const url = new URL(apiBaseUrl)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Protocol must be http or https.')
  }

  validatedApiBaseUrl = url.href.endsWith('/') ? url.href : `${url.href}/`
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  throw new Error(
    `Invalid API base URL (VITE_API_BASE_URL): ${apiBaseUrl}. ` +
      `Error: ${message}. Please check your .env file for the current mode.`,
  )
}

/**
 * Dedicated Axios instance for all API requests.
 *
 * It is pre-configured with the API base URL from environment variables,
 * JSON request headers, a request timeout, and credential support.
 *
 * Authentication and error-handling interceptors can be attached separately.
 */
const apiClient = axios.create({
  baseURL: validatedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
  withCredentials: true,
})

export default apiClient
