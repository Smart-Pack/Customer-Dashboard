import { Capacitor } from '@capacitor/core'
import { isAxiosError } from 'axios'

import type { PaginatedResponse, PaginationQueryParams } from '@/api/types'

interface PaginatedCacheOptions<T, P extends PaginationQueryParams> {
  fetcher: (params: P) => Promise<PaginatedResponse<T>>
  params: P
  save: (items: T[]) => Promise<void>
  getCached: (params: P) => Promise<PaginatedResponse<T>>
}

interface CacheRepository<T> {
  get: () => Promise<T | null>
  save: (data: T) => Promise<void>
}

/**
 * Fetches data from an API function and maintains its local SQLite cache
 * on native platforms.
 *
 * Saves every successful API response to SQLite on native platforms.
 * Falls back to cached data when the API request fails due to a network error.
 *
 * @param fetcher - API function that retrieves the latest data.
 * @param repository - Repository responsible for reading and saving cached data.
 * @returns {Promise<T>} API response or cached data when offline.
 */
async function fetchWithCache<T>(
  fetcher: () => Promise<T>,
  repository: CacheRepository<T>,
): Promise<T> {
  const isNative = Capacitor.isNativePlatform()

  try {
    const response = await fetcher()

    if (isNative) {
      try {
        await repository.save(response)
      } catch (error) {
        console.error('[Database] Failed to cache API response:', error)
      }
    }

    return response
  } catch (error) {
    if (isNative && isAxiosError(error) && !error.response) {
      try {
        const cachedData = await repository.get()

        if (cachedData !== null) {
          console.info('[Database] Returning cached data because the API is unavailable.')
          return cachedData
        }
      } catch (cacheError) {
        console.error('[Database] Failed to retrieve cached data:', cacheError)
      }
    }

    throw error
  }
}

/**
 * Fetches paginated data from the API and falls back to locally cached
 * records when the native application has no network connection.
 *
 * - Web: Always uses the API.
 * - Native: Uses the API when available and caches successful results.
 * - Native offline: Returns locally cached records, paginated locally.
 *
 * Cache failures do not affect successful API responses.
 *
 * @param options - API fetcher, query parameters, and cache operations.
 * @returns The API or locally paginated response.
 */
async function fetchPaginatedWithCache<T, P extends PaginationQueryParams>({
  fetcher,
  params,
  save,
  getCached,
}: PaginatedCacheOptions<T, P>): Promise<PaginatedResponse<T>> {
  const isNative = Capacitor.isNativePlatform()

  try {
    const response = await fetcher(params)

    if (isNative) {
      try {
        await save(response.results)
      } catch (error) {
        console.error('[Database] Failed to cache API response:', error)
      }
    }

    return response
  } catch (error) {
    if (isNative && isAxiosError(error) && !error.response) {
      try {
        const cachedResponse = await getCached(params)

        console.info('[Database] Returning locally cached paginated data.')

        return cachedResponse
      } catch (cacheError) {
        console.error('[Database] Failed to retrieve cached data:', cacheError)
      }
    }

    throw error
  }
}

/**
 * Fetches a record from an API function and maintains its local SQLite cache
 * on native platforms.
 *
 * Saves every successful API response to SQLite on native platforms.
 * Falls back to the locally cached record when the API request fails due to
 * a network error.
 *
 * @param fetcher - API function that retrieves the record.
 * @param repository - Repository responsible for reading and saving cached data.
 * @param id - ID of the record to retrieve from the cache.
 * @returns API response or cached record when offline.
 */
async function fetchByIdWithCache<T>(
  fetcher: () => Promise<T>,
  repository: {
    save: (data: T) => Promise<void>
    get: (id: number) => Promise<T | null>
  },
  id: number,
): Promise<T> {
  const isNative = Capacitor.isNativePlatform()

  try {
    const response = await fetcher()

    if (isNative) {
      try {
        await repository.save(response)
      } catch (error) {
        console.error('[Database] Failed to cache API response:', error)
      }
    }

    return response
  } catch (error) {
    if (isNative && isAxiosError(error) && !error.response) {
      try {
        const cachedData = await repository.get(id)

        if (cachedData !== null) {
          console.info('[Database] Returning cached record because the API is unavailable.')
          return cachedData
        }
      } catch (cacheError) {
        console.error('[Database] Failed to retrieve cached record:', cacheError)
      }
    }

    throw error
  }
}

/**
 * Updates the local SQLite cache on native platforms.
 *
 * @param data - Object to cache.
 * @param repository - Repository responsible for persisting the object.
 */
async function updateCache<T>(data: T, repository: CacheRepository<T>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await repository.save(data)
  } catch (error) {
    console.error('[Database] Failed to update cache:', error)
  }
}

export { fetchPaginatedWithCache, fetchByIdWithCache, fetchWithCache, updateCache }
