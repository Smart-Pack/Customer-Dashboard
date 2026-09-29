import type { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { useAuthStore } from '@/stores'

import { retryRequest, type RetryRequestConfig } from '../retryRequest'

vi.mock('@/api/client', () => ({
  default: vi.fn<(config: RetryRequestConfig) => Promise<unknown>>(),
}))

vi.mock('@/stores', () => ({
  useAuthStore: vi.fn<() => ReturnType<typeof useAuthStore>>(),
}))

describe('retryRequest', () => {
  const refreshToken = vi.fn<() => Promise<void>>()

  const authStore = {
    accessToken: 'new-access-token',
    refreshToken,
  }

  const createRequest = () =>
    ({
      url: '/v1/users/',
      headers: {},
    }) as RetryRequestConfig

  const createError = (config: RetryRequestConfig) =>
    ({
      config,
    }) as AxiosError

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAuthStore).mockReturnValue(authStore as unknown as ReturnType<typeof useAuthStore>)
  })

  it('marks the original request as retried', async () => {
    refreshToken.mockResolvedValue(undefined)

    vi.mocked(apiClient).mockResolvedValue({
      status: 200,
      data: {},
    })

    const request = createRequest()

    await retryRequest(createError(request))

    expect(request._retry).toBe(true)
  })

  it('refreshes the access token', async () => {
    refreshToken.mockResolvedValue(undefined)

    vi.mocked(apiClient).mockResolvedValue({
      status: 200,
      data: {},
    })

    await retryRequest(createError(createRequest()))

    expect(refreshToken).toHaveBeenCalledOnce()
  })

  it('adds the refreshed access token to the original request', async () => {
    refreshToken.mockResolvedValue(undefined)

    vi.mocked(apiClient).mockResolvedValue({
      status: 200,
      data: {},
    })

    const request = createRequest()

    await retryRequest(createError(request))

    expect(request.headers.Authorization).toBe('Bearer new-access-token')
  })

  it('retries the original request', async () => {
    refreshToken.mockResolvedValue(undefined)

    const retryResponse = {
      status: 200,
      data: {
        results: [],
      },
    }

    vi.mocked(apiClient).mockResolvedValue(retryResponse)

    const request = createRequest()
    const result = await retryRequest(createError(request))

    expect(apiClient).toHaveBeenCalledExactlyOnceWith(request)
    expect(result).toBe(retryResponse)
  })

  it('rejects when token refresh fails', async () => {
    const refreshError = new Error('Refresh failed')

    refreshToken.mockRejectedValue(refreshError)

    const request = createRequest()

    await expect(retryRequest(createError(request))).rejects.toBe(refreshError)

    expect(refreshToken).toHaveBeenCalledOnce()
    expect(apiClient).not.toHaveBeenCalled()
  })
})
