import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { AuthState } from '@/stores/modules/auth/state'
import { AUTH } from '@/api/endpoints'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { useAuthStore } from '@/stores'

import { handle401 } from '../handle401'
import type { RequestUse, ResponseUse } from './testUtils'

vi.mock('@/api/client', () => ({
  default: {
    interceptors: {
      request: {
        use: vi.fn<RequestUse>(),
      },
      response: {
        use: vi.fn<ResponseUse>(),
      },
    },
  },
}))

vi.mock('@/stores', () => ({
  useAuthStore: vi.fn<() => AuthState>(),
}))

vi.mock('../handle401', () => ({
  handle401: vi.fn<(error: AxiosError) => Promise<unknown>>(),
}))

describe('API interceptors', () => {
  let requestSuccessHandler: (config: AxiosRequestConfig) => AxiosRequestConfig

  let requestErrorHandler: (error: unknown) => Promise<never>

  let responseSuccessHandler: (response: unknown) => unknown

  let responseErrorHandler: (error: AxiosError) => Promise<unknown>

  beforeAll(async () => {
    await import('../index')

    const requestUse = vi.mocked(apiClient.interceptors.request.use)
    const responseUse = vi.mocked(apiClient.interceptors.response.use)

    requestSuccessHandler = requestUse.mock.calls[0]![0] as typeof requestSuccessHandler

    requestErrorHandler = requestUse.mock.calls[0]![1] as typeof requestErrorHandler

    responseSuccessHandler = responseUse.mock.calls[0]![0] as typeof responseSuccessHandler

    responseErrorHandler = responseUse.mock.calls[0]![1] as typeof responseErrorHandler
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('request interceptor', () => {
    it('adds the access token to the Authorization header', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        accessToken: 'access-token',
      } as ReturnType<typeof useAuthStore>)

      const config = {
        headers: {},
      } as AxiosRequestConfig

      const result = requestSuccessHandler(config)

      expect(result.headers?.Authorization).toBe('Bearer access-token')
    })

    it('leaves the Authorization header unchanged when no access token exists', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        accessToken: null,
      } as ReturnType<typeof useAuthStore>)

      const config = {
        headers: {},
      } as AxiosRequestConfig

      const result = requestSuccessHandler(config)

      expect(result.headers?.Authorization).toBeUndefined()
    })

    it('returns the request error', async () => {
      const error = new Error('Request failed')

      await expect(requestErrorHandler(error)).rejects.toBe(error)
    })
  })

  describe('response interceptor', () => {
    it('returns successful responses unchanged', () => {
      const response = {
        status: 200,
        data: {
          message: 'Success',
        },
      }

      expect(responseSuccessHandler(response)).toBe(response)
    })

    it('sets the error message from the API response detail', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Invalid request.',
          },
        },
        config: {
          url: '/v1/users/me/',
        },
        message: 'Request failed',
      } as AxiosError

      await expect(responseErrorHandler(error)).rejects.toBe(error)

      expect(error.message).toBe('Invalid request.')
      expect(handle401).not.toHaveBeenCalled()
    })

    it('sets a default message when the server cannot be reached', async () => {
      const error = {
        response: undefined,
        config: {
          url: '/v1/users/me/',
        },
        message: 'Network Error',
      } as AxiosError

      await expect(responseErrorHandler(error)).rejects.toBe(error)

      expect(error.message).toBe(
        'Unable to reach the server. Please check your network connection.',
      )
      expect(handle401).not.toHaveBeenCalled()
    })
    it('sets a default message for bad requests', async () => {
      const error = {
        response: {
          status: 400,
          data: {},
        },
        config: {
          url: '/v1/users/me/',
        },
        message: 'Request failed with status code 400',
      } as AxiosError

      await expect(responseErrorHandler(error)).rejects.toBe(error)

      expect(error.message).toBe('Please correct the highlighted fields.')
      expect(handle401).not.toHaveBeenCalled()
    })

    it('delegates 401 errors to handle401', async () => {
      const error = {
        response: {
          status: 401,
        },
        config: {
          url: '/v1/users/me/',
        },
      } as AxiosError

      const retryResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
        data: {
          id: 1,
        },
      } as AxiosResponse

      vi.mocked(handle401).mockResolvedValue(retryResponse)

      const result = await responseErrorHandler(error)

      expect(handle401).toHaveBeenCalledExactlyOnceWith(error)
      expect(result).toBe(retryResponse)
    })

    it('delegates refresh errors to handle401', async () => {
      const error = {
        response: {
          status: 500,
        },
        config: {
          url: AUTH.REFRESH,
        },
      } as AxiosError

      const refreshError = new Error('Session expired.')

      vi.mocked(handle401).mockRejectedValue(refreshError)

      await expect(responseErrorHandler(error)).rejects.toBe(refreshError)

      expect(handle401).toHaveBeenCalledExactlyOnceWith(error)
    })

    it('rejects non-401 errors unchanged', async () => {
      const error = {
        response: {
          status: 403,
        },
        config: {
          url: '/v1/users/me/',
        },
      } as AxiosError

      await expect(responseErrorHandler(error)).rejects.toBe(error)

      expect(handle401).not.toHaveBeenCalled()
    })
  })
})
