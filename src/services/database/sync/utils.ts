import type { PaginatedResponse, PaginationQueryParams } from '@/api/types'

/**
 * Represents a function that retrieves a page of records.
 */
export type SyncListFunction<T> = (
  params: PaginationQueryParams & Record<string, unknown>,
) => Promise<PaginatedResponse<T>>

/**
 * Represents a repository that saves records directly.
 */
export interface SyncRepository<T extends { id: number }> {
  saveList: (records: T[]) => Promise<void>
  getAll: () => Promise<T[]>
  deleteById: (id: number) => Promise<void>
}

/**
 * Represents a repository that saves records under a parent ID.
 */
export interface SyncScopedRepository<T extends { id: number }, I = number> {
  saveList: (id: I, records: T[]) => Promise<void>
  getAll: () => Promise<T[]>
  deleteById: (id: number) => Promise<void>
}

/**
 * Represents a function that retrieves a single record.
 */
export type SyncSingleFunction<T> = () => Promise<T>

/**
 * Represents a repository that supports saving a single record.
 */
export interface SyncSingleRepository<T> {
  save: (record: T) => Promise<void>
}

/**
 * Represents an additional API parameter to iterate through.
 */
export interface SyncListParam {
  key: string
  values: (string | number)[]
}

/**
 * Fetches all pages from a paginated API endpoint and reconciles
 * the results with the local SQLite database.
 *
 * Starts at page 1 with a page size of 100. When an additional
 * list parameter is provided, fetches all pages for each value
 * before moving to the next value.
 *
 * Each page is saved before requesting the next one. When a
 * list parameter is provided, its current value is also passed
 * to the repository's saveList() operation.
 *
 * After fetching all pages, retrieves locally cached records and
 * deletes records whose IDs no longer exist in the API response.
 *
 * @param list - API function used to retrieve paginated records.
 * @param repository - Repository used to persist and manage records.
 * @returns Total number of records synchronized.
 */
function syncPaginated<T extends { id: number }>(
  list: SyncListFunction<T>,
  repository: SyncRepository<T>,
): Promise<number>

/**
 * Synchronizes records using an additional API filter and
 * a repository parent ID.
 *
 * @param list - API function used to retrieve paginated records.
 * @param repository - Scoped repository used to persist records.
 * @param listParam - API parameter and values to iterate through.
 * @returns Total number of records synchronized.
 */
function syncPaginated<T extends { id: number }, I>(
  list: SyncListFunction<T>,
  repository: SyncScopedRepository<T, I>,
  listParam: SyncListParam,
): Promise<number>

async function syncPaginated<T extends { id: number }, I = number>(
  list: SyncListFunction<T>,
  repository: SyncRepository<T> | SyncScopedRepository<T, I>,
  listParam?: SyncListParam,
): Promise<number> {
  const pageSize = 100
  let totalRecords = 0

  const syncedIds = new Set<number>()

  const values: (string | number | undefined)[] = listParam?.values ?? [undefined]

  for (const value of values) {
    let page = 1

    while (true) {
      const params: PaginationQueryParams & Record<string, unknown> = {
        page,
        page_size: pageSize,
      }

      if (listParam) {
        params[listParam.key] = value
      }

      const response = await list(params)

      if (listParam) {
        await (repository as SyncScopedRepository<T, I>).saveList(value as I, response.results)
      } else {
        await (repository as SyncRepository<T>).saveList(response.results)
      }

      for (const record of response.results) {
        syncedIds.add(record.id)
      }

      totalRecords += response.results.length

      if (!response.next) {
        break
      }

      page += 1
    }
  }

  const cachedRecords = await repository.getAll()

  const staleRecords = cachedRecords.filter((record) => !syncedIds.has(record.id))

  for (const record of staleRecords) {
    await repository.deleteById(record.id)
  }

  return totalRecords
}

/**
 * Fetches a single record from the API and saves it locally.
 *
 * @param get - API function used to retrieve the record.
 * @param repository - Repository used to persist the record.
 * @returns The synchronized record.
 */
async function syncSingle<T>(
  get: SyncSingleFunction<T>,
  repository: SyncSingleRepository<T>,
): Promise<T> {
  const record = await get()

  await repository.save(record)

  return record
}

export { syncPaginated, syncSingle }
