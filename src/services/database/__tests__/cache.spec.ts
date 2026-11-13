import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { fetchWithCache, updateCache } from '../cache'

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
  get: ReturnType<typeof vi.fn<() => Promise<MockData | null>>>
  save: ReturnType<typeof vi.fn<(data: MockData) => Promise<void>>>
}

const mockData: MockData = {
  id: 1,
  name: 'Test data',
}

function createRepository(): MockRepository {
  return {
    get: vi.fn<() => Promise<MockData | null>>(),
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
