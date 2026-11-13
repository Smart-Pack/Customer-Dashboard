import { Capacitor } from '@capacitor/core'
import { isAxiosError } from 'axios'

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

export { updateCache, fetchWithCache }
