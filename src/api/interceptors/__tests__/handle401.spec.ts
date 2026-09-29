import type { AxiosError, AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH, TWO_FACTOR } from '@/api/endpoints'
import router from '@/router'

import { handle401 } from '../handle401'
import { retryRequest } from '../retryRequest'

vi.mock('@/router', () => ({
  default: {
    replace: vi.fn<() => Promise<unknown>>(),
  },
}))

vi.mock('../retryRequest', () => ({
  retryRequest: vi.fn<(error: AxiosError) => Promise<unknown>>(),
}))

describe('handle401', () => {
  const createError = (url: string, retry = false) =>
    ({
      config: {
        url,
        _retry: retry,
      },
      response: {
        status: 401,
      },
    }) as unknown as AxiosError

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a 401 response from the login endpoint', async () => {
    const error = createError(AUTH.LOGIN)

    await expect(handle401(error)).rejects.toBe(error)

    expect(retryRequest).not.toHaveBeenCalled()
  })

  it('redirects to login and rejects with a session expired error for the refresh endpoint', async () => {
    const error = createError(AUTH.REFRESH)

    await expect(handle401(error)).rejects.toThrow('Session expired. Please log in again.')

    expect(router.replace).toHaveBeenCalledExactlyOnceWith({
      name: 'login',
    })
    expect(retryRequest).not.toHaveBeenCalled()
  })
  it('does not redirect to login when skipAuthRedirect is true for the refresh endpoint', async () => {
    const error = createError(AUTH.REFRESH)
    error.config!.skipAuthRedirect = true

    await expect(handle401(error)).rejects.toThrow('Session expired. Please log in again.')

    expect(router.replace).not.toHaveBeenCalled()
    expect(retryRequest).not.toHaveBeenCalled()
  })

  it('rejects a 401 response from the token verification endpoint', async () => {
    const error = createError(AUTH.VERIFY)

    await expect(handle401(error)).rejects.toBe(error)

    expect(retryRequest).not.toHaveBeenCalled()
  })

  it('delegates a 401 response from the two-factor request endpoint to retryRequest', async () => {
    const error = createError(TWO_FACTOR.REQUEST)
    const retryResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      data: {
        detail: 'OTP sent successfully.',
      },
    } as AxiosResponse

    vi.mocked(retryRequest).mockResolvedValue(retryResponse)

    const result = await handle401(error)

    expect(retryRequest).toHaveBeenCalledExactlyOnceWith(error)
    expect(result).toBe(retryResponse)
  })

  it('delegates a 401 response from the two-factor verification endpoint to retryRequest', async () => {
    const error = createError(TWO_FACTOR.VERIFY)
    const retryResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      data: {
        access: 'new-access-token',
      },
    } as AxiosResponse

    vi.mocked(retryRequest).mockResolvedValue(retryResponse)

    const result = await handle401(error)

    expect(retryRequest).toHaveBeenCalledExactlyOnceWith(error)
    expect(result).toBe(retryResponse)
  })

  it('rejects a request that has already been retried', async () => {
    const error = createError('/v1/users/me/', true)

    await expect(handle401(error)).rejects.toBe(error)

    expect(retryRequest).not.toHaveBeenCalled()
  })

  it('delegates a protected 401 request to retryRequest', async () => {
    const error = createError('/v1/users/me/')
    const retryResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      data: {
        id: 1,
      },
    } as AxiosResponse

    vi.mocked(retryRequest).mockResolvedValue(retryResponse)

    const result = await handle401(error)

    expect(retryRequest).toHaveBeenCalledExactlyOnceWith(error)
    expect(result).toBe(retryResponse)
  })
})
