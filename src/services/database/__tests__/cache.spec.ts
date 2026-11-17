import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { fetchByIdWithCache, fetchPaginatedWithCache, fetchWithCache, updateCache } from '../cache'

import type { PaginatedResponse, PaginationQueryParams } from '@/api/types'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn<() => boolean>(),
  },
}))

interface MockData {
  id: number
  name: string
}

interface MockRepository {
  get: ReturnType<typeof vi.fn<(id?: number) => Promise<MockData | null>>>
  save: ReturnType<typeof vi.fn<(data: MockData) => Promise<void>>>
}

const mockData: MockData = {
  id: 1,
  name: 'Test data',
}

const mockPaginatedData: PaginatedResponse<MockData> = {
  count: 2,
  next: 'http://localhost/api/items/?page=2',
  previous: null,
  results: [mockData, { id: 2, name: 'Another test data' }],
}

interface MockPaginationParams extends PaginationQueryParams {
  search?: string
}

function createPaginatedCacheOptions() {
  const params: MockPaginationParams = {
    page: 1,
    page_size: 10,
    search: 'test',
  }

  return {
    params,
    fetcher: vi
      .fn<(params: MockPaginationParams) => Promise<PaginatedResponse<MockData>>>()
      .mockResolvedValue(mockPaginatedData),
    save: vi.fn<(items: MockData[]) => Promise<void>>().mockResolvedValue(undefined),
    getCached: vi
      .fn<(params: MockPaginationParams) => Promise<PaginatedResponse<MockData>>>()
      .mockResolvedValue(mockPaginatedData),
  }
}

function createRepository(): MockRepository {
  return {
    get: vi.fn<(id?: number) => Promise<MockData | null>>(),
    save: vi.fn<(data: MockData) => Promise<void>>(),
  }
}

function createNetworkError(): Error {
  return Object.assign(new Error('Network Error'), {
    isAxiosError: true,
  })
}

function createApiError(): Error {
  return Object.assign(new Error('Internal Server Error'), {
    isAxiosError: true,
    response: {
      status: 500,
    },
  })
}

describe('Database Cache Utilities', () => {
  let repository: MockRepository

  beforeEach(() => {
    vi.clearAllMocks()

    repository = createRepository()

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

    repository.save.mockResolvedValue(undefined)
    repository.get.mockResolvedValue(null)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  describe('fetchWithCache()', () => {
    it('should return the API response and save it on native platforms', async () => {
      const fetcher = vi.fn<() => Promise<MockData>>().mockResolvedValue(mockData)

      const result = await fetchWithCache(fetcher, repository)

      expect(result).toEqual(mockData)
      expect(fetcher).toHaveBeenCalledOnce()
      expect(repository.save).toHaveBeenCalledExactlyOnceWith(mockData)
    })

    it('should return the API response without saving on web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      const fetcher = vi.fn<() => Promise<MockData>>().mockResolvedValue(mockData)

      const result = await fetchWithCache(fetcher, repository)

      expect(result).toEqual(mockData)
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should return the API response when saving to cache fails', async () => {
      const fetcher = vi.fn<() => Promise<MockData>>().mockResolvedValue(mockData)

      repository.save.mockRejectedValue(new Error('Database save failed'))

      const result = await fetchWithCache(fetcher, repository)

      expect(result).toEqual(mockData)
      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to cache API response:',
        expect.any(Error),
      )
    })

    it('should return cached data when the API request fails due to a network error', async () => {
      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      repository.get.mockResolvedValue(mockData)

      const result = await fetchWithCache(fetcher, repository)

      expect(result).toEqual(mockData)
      expect(repository.get).toHaveBeenCalledOnce()
      expect(repository.save).not.toHaveBeenCalled()
      expect(console.info).toHaveBeenCalled()
    })

    it('should rethrow the original network error when no cached data exists', async () => {
      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      repository.get.mockResolvedValue(null)

      await expect(fetchWithCache(fetcher, repository)).rejects.toBe(networkError)

      expect(repository.get).toHaveBeenCalledOnce()
    })

    it('should rethrow the original network error when retrieving cached data fails', async () => {
      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      repository.get.mockRejectedValue(new Error('Database read failed'))

      await expect(fetchWithCache(fetcher, repository)).rejects.toBe(networkError)

      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to retrieve cached data:',
        expect.any(Error),
      )
    })

    it('should not use cached data when the API returns an HTTP error', async () => {
      const apiError = createApiError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(apiError)

      await expect(fetchWithCache(fetcher, repository)).rejects.toBe(apiError)

      expect(repository.get).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should not use cached data when the API fails with a non-Axios error', async () => {
      const error = new Error('Unexpected error')
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(error)

      await expect(fetchWithCache(fetcher, repository)).rejects.toBe(error)

      expect(repository.get).not.toHaveBeenCalled()
    })

    it('should rethrow network errors without accessing SQLite on web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      await expect(fetchWithCache(fetcher, repository)).rejects.toBe(networkError)

      expect(repository.get).not.toHaveBeenCalled()
    })
  })
  describe('fetchByIdWithCache()', () => {
    const id = 1

    it('should return the API response and save it on native platforms', async () => {
      const fetcher = vi.fn<() => Promise<MockData>>().mockResolvedValue(mockData)

      const result = await fetchByIdWithCache(fetcher, repository, id)

      expect(result).toEqual(mockData)
      expect(fetcher).toHaveBeenCalledOnce()
      expect(repository.save).toHaveBeenCalledExactlyOnceWith(mockData)
      expect(repository.get).not.toHaveBeenCalled()
    })

    it('should return the API response without saving on web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      const fetcher = vi.fn<() => Promise<MockData>>().mockResolvedValue(mockData)

      const result = await fetchByIdWithCache(fetcher, repository, id)

      expect(result).toEqual(mockData)
      expect(repository.save).not.toHaveBeenCalled()
      expect(repository.get).not.toHaveBeenCalled()
    })

    it('should return the API response when saving to cache fails', async () => {
      const fetcher = vi.fn<() => Promise<MockData>>().mockResolvedValue(mockData)

      repository.save.mockRejectedValue(new Error('Database save failed'))

      const result = await fetchByIdWithCache(fetcher, repository, id)

      expect(result).toEqual(mockData)
      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to cache API response:',
        expect.any(Error),
      )
    })

    it('should return the cached record when the API request fails due to a network error', async () => {
      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      repository.get.mockResolvedValue(mockData)

      const result = await fetchByIdWithCache(fetcher, repository, id)

      expect(result).toEqual(mockData)
      expect(repository.get).toHaveBeenCalledExactlyOnceWith(id)
      expect(repository.save).not.toHaveBeenCalled()
      expect(console.info).toHaveBeenCalled()
    })

    it('should rethrow the original network error when no cached record exists', async () => {
      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      repository.get.mockResolvedValue(null)

      await expect(fetchByIdWithCache(fetcher, repository, id)).rejects.toBe(networkError)

      expect(repository.get).toHaveBeenCalledExactlyOnceWith(id)
    })

    it('should rethrow the original network error when retrieving the cached record fails', async () => {
      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      repository.get.mockRejectedValue(new Error('Database read failed'))

      await expect(fetchByIdWithCache(fetcher, repository, id)).rejects.toBe(networkError)

      expect(repository.get).toHaveBeenCalledExactlyOnceWith(id)
      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to retrieve cached record:',
        expect.any(Error),
      )
    })

    it('should not use cached data when the API returns an HTTP error', async () => {
      const apiError = createApiError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(apiError)

      await expect(fetchByIdWithCache(fetcher, repository, id)).rejects.toBe(apiError)

      expect(repository.get).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should not use cached data when the API fails with a non-Axios error', async () => {
      const error = new Error('Unexpected error')
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(error)

      await expect(fetchByIdWithCache(fetcher, repository, id)).rejects.toBe(error)

      expect(repository.get).not.toHaveBeenCalled()
    })

    it('should rethrow network errors without accessing SQLite on web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      const networkError = createNetworkError()
      const fetcher = vi.fn<() => Promise<MockData>>().mockRejectedValue(networkError)

      await expect(fetchByIdWithCache(fetcher, repository, id)).rejects.toBe(networkError)

      expect(repository.get).not.toHaveBeenCalled()
    })
  })
  describe('fetchPaginatedWithCache()', () => {
    it('should return the API response and save results on native platforms', async () => {
      const options = createPaginatedCacheOptions()

      const result = await fetchPaginatedWithCache(options)

      expect(result).toEqual(mockPaginatedData)
      expect(options.fetcher).toHaveBeenCalledExactlyOnceWith(options.params)
      expect(options.save).toHaveBeenCalledExactlyOnceWith(mockPaginatedData.results)
      expect(options.getCached).not.toHaveBeenCalled()
    })

    it('should return the API response without saving on web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      const options = createPaginatedCacheOptions()

      const result = await fetchPaginatedWithCache(options)

      expect(result).toEqual(mockPaginatedData)
      expect(options.fetcher).toHaveBeenCalledExactlyOnceWith(options.params)
      expect(options.save).not.toHaveBeenCalled()
      expect(options.getCached).not.toHaveBeenCalled()
    })

    it('should return the API response when saving results to cache fails', async () => {
      const options = createPaginatedCacheOptions()

      options.save.mockRejectedValue(new Error('Database save failed'))

      const result = await fetchPaginatedWithCache(options)

      expect(result).toEqual(mockPaginatedData)
      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to cache API response:',
        expect.any(Error),
      )
    })

    it('should return locally cached paginated data when the native API request fails due to a network error', async () => {
      const options = createPaginatedCacheOptions()

      const networkError = createNetworkError()

      options.fetcher.mockRejectedValue(networkError)

      const result = await fetchPaginatedWithCache(options)

      expect(result).toEqual(mockPaginatedData)
      expect(options.getCached).toHaveBeenCalledExactlyOnceWith(options.params)
      expect(options.save).not.toHaveBeenCalled()
    })

    it('should throw the original network error when no cached data is available', async () => {
      const options = createPaginatedCacheOptions()
      const networkError = createNetworkError()

      options.fetcher.mockRejectedValue(networkError)
      options.getCached.mockRejectedValue(new Error('Database read failed'))

      await expect(fetchPaginatedWithCache(options)).rejects.toBe(networkError)

      expect(options.getCached).toHaveBeenCalledOnce()
      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to retrieve cached data:',
        expect.any(Error),
      )
    })

    it('should throw the original network error when the cache retrieval fails', async () => {
      const options = createPaginatedCacheOptions()
      const networkError = createNetworkError()

      options.fetcher.mockRejectedValue(networkError)
      options.getCached.mockRejectedValue(new Error('Database read failed'))

      await expect(fetchPaginatedWithCache(options)).rejects.toBe(networkError)
    })

    it('should throw HTTP errors without attempting to retrieve cached data', async () => {
      const options = createPaginatedCacheOptions()
      const apiError = createApiError()

      options.fetcher.mockRejectedValue(apiError)

      await expect(fetchPaginatedWithCache(options)).rejects.toBe(apiError)

      expect(options.getCached).not.toHaveBeenCalled()
      expect(options.save).not.toHaveBeenCalled()
    })

    it('should throw network errors on web platforms without retrieving cached data', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      const options = createPaginatedCacheOptions()
      const networkError = createNetworkError()

      options.fetcher.mockRejectedValue(networkError)

      await expect(fetchPaginatedWithCache(options)).rejects.toBe(networkError)

      expect(options.getCached).not.toHaveBeenCalled()
      expect(options.save).not.toHaveBeenCalled()
    })

    it('should pass pagination and resource-specific parameters to the cache getter', async () => {
      const options = createPaginatedCacheOptions()

      options.fetcher.mockRejectedValue(createNetworkError())

      await fetchPaginatedWithCache(options)

      expect(options.getCached).toHaveBeenCalledExactlyOnceWith({
        page: 1,
        page_size: 10,
        search: 'test',
      })
    })
  })

  describe('updateCache()', () => {
    it('should save data on native platforms', async () => {
      await updateCache(mockData, repository)

      expect(repository.save).toHaveBeenCalledExactlyOnceWith(mockData)
    })

    it('should not save data on web platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      await updateCache(mockData, repository)

      expect(repository.save).not.toHaveBeenCalled()
    })

    it('should not throw when saving to cache fails', async () => {
      repository.save.mockRejectedValue(new Error('Database save failed'))

      await expect(updateCache(mockData, repository)).resolves.toBeUndefined()

      expect(console.error).toHaveBeenCalledWith(
        '[Database] Failed to update cache:',
        expect.any(Error),
      )
    })
  })
})
