import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PaginatedResponse, PaginationQueryParams } from '@/api/types'

import type {
  SyncListFunction,
  SyncRepository,
  SyncSingleFunction,
  SyncSingleRepository,
} from '../utils'

import { syncPaginated, syncSingle } from '../utils'

interface TestRecord {
  id: number
  name: string
}

const createResponse = (
  results: TestRecord[],
  next: string | null = null,
): PaginatedResponse<TestRecord> => ({
  count: results.length,
  next,
  previous: null,
  results,
})

const createRepository = (cachedRecords: TestRecord[] = []): SyncRepository<TestRecord> => ({
  saveList: vi.fn<SyncRepository<TestRecord>['saveList']>(
    async (_records: TestRecord[]) => undefined,
  ),
  getAll: vi.fn<SyncRepository<TestRecord>['getAll']>(async () => cachedRecords),
  deleteById: vi.fn<SyncRepository<TestRecord>['deleteById']>(async (_id: number) => undefined),
})

describe('syncPaginated', () => {
  let repository: SyncRepository<TestRecord>
  let list: ReturnType<typeof vi.fn<SyncListFunction<TestRecord>>>

  beforeEach(() => {
    vi.clearAllMocks()

    repository = createRepository()

    list = vi.fn<SyncListFunction<TestRecord>>()
  })

  it('fetches and saves a single page of records', async () => {
    const records = [
      { id: 1, name: 'Record 1' },
      { id: 2, name: 'Record 2' },
    ]

    list.mockResolvedValueOnce(createResponse(records))

    const total = await syncPaginated(list, repository)

    expect(list).toHaveBeenCalledExactlyOnceWith({
      page: 1,
      page_size: 100,
    })

    expect(repository.saveList).toHaveBeenCalledExactlyOnceWith(records)

    expect(total).toBe(2)
  })

  it('fetches all pages until next is null', async () => {
    const firstPage = [
      { id: 1, name: 'Record 1' },
      { id: 2, name: 'Record 2' },
    ]

    const secondPage = [{ id: 3, name: 'Record 3' }]

    list
      .mockResolvedValueOnce(createResponse(firstPage, 'https://api.example.com/?page=2'))
      .mockResolvedValueOnce(createResponse(secondPage))

    const total = await syncPaginated(list, repository)

    expect(list).toHaveBeenCalledTimes(2)

    expect(list).toHaveBeenNthCalledWith(1, {
      page: 1,
      page_size: 100,
    })

    expect(list).toHaveBeenNthCalledWith(2, {
      page: 2,
      page_size: 100,
    })

    expect(repository.saveList).toHaveBeenNthCalledWith(1, firstPage)
    expect(repository.saveList).toHaveBeenNthCalledWith(2, secondPage)

    expect(total).toBe(3)
  })

  it('saves each page before requesting the next page', async () => {
    const firstPage = [{ id: 1, name: 'Record 1' }]
    const secondPage = [{ id: 2, name: 'Record 2' }]

    list.mockImplementation(async (params: PaginationQueryParams & Record<string, unknown>) => {
      if (params.page === 1) {
        return createResponse(firstPage, 'next-page')
      }

      expect(repository.saveList).toHaveBeenCalledExactlyOnceWith(firstPage)

      return createResponse(secondPage)
    })

    await syncPaginated(list, repository)

    expect(repository.saveList).toHaveBeenCalledTimes(2)
    expect(repository.saveList).toHaveBeenNthCalledWith(1, firstPage)
    expect(repository.saveList).toHaveBeenNthCalledWith(2, secondPage)
  })

  it('passes listParam values to the API and repository', async () => {
    const groupOneRecords = [{ id: 1, name: 'Group 1 member' }]
    const groupTwoRecords = [{ id: 2, name: 'Group 2 member' }]

    list
      .mockResolvedValueOnce(createResponse(groupOneRecords))
      .mockResolvedValueOnce(createResponse(groupTwoRecords))

    const total = await syncPaginated(list, repository, {
      key: 'group',
      values: [10, 20],
    })

    expect(list).toHaveBeenNthCalledWith(1, {
      page: 1,
      page_size: 100,
      group: 10,
    })

    expect(list).toHaveBeenNthCalledWith(2, {
      page: 1,
      page_size: 100,
      group: 20,
    })

    expect(repository.saveList).toHaveBeenNthCalledWith(1, 10, groupOneRecords)

    expect(repository.saveList).toHaveBeenNthCalledWith(2, 20, groupTwoRecords)

    expect(total).toBe(2)
  })

  it('fetches all pages for each listParam value before moving to the next', async () => {
    const groupOnePageOne = [{ id: 1, name: 'Member 1' }]
    const groupOnePageTwo = [{ id: 2, name: 'Member 2' }]
    const groupTwoRecords = [{ id: 3, name: 'Member 3' }]

    list
      .mockResolvedValueOnce(createResponse(groupOnePageOne, 'next-page'))
      .mockResolvedValueOnce(createResponse(groupOnePageTwo))
      .mockResolvedValueOnce(createResponse(groupTwoRecords))

    const total = await syncPaginated(list, repository, {
      key: 'group',
      values: [10, 20],
    })

    expect(list).toHaveBeenNthCalledWith(1, {
      page: 1,
      page_size: 100,
      group: 10,
    })

    expect(list).toHaveBeenNthCalledWith(2, {
      page: 2,
      page_size: 100,
      group: 10,
    })

    expect(list).toHaveBeenNthCalledWith(3, {
      page: 1,
      page_size: 100,
      group: 20,
    })

    expect(repository.saveList).toHaveBeenNthCalledWith(1, 10, groupOnePageOne)

    expect(repository.saveList).toHaveBeenNthCalledWith(2, 10, groupOnePageTwo)

    expect(repository.saveList).toHaveBeenNthCalledWith(3, 20, groupTwoRecords)

    expect(total).toBe(3)
  })

  it('deletes cached records that are absent from the API response', async () => {
    const cachedRecords = [
      { id: 1, name: 'Record 1' },
      { id: 2, name: 'Record 2' },
      { id: 3, name: 'Stale record' },
    ]

    repository = createRepository(cachedRecords)

    list.mockResolvedValueOnce(
      createResponse([
        { id: 1, name: 'Updated record 1' },
        { id: 2, name: 'Updated record 2' },
      ]),
    )

    await syncPaginated(list, repository)

    expect(repository.deleteById).toHaveBeenCalledExactlyOnceWith(3)
  })

  it('does not delete records that were synchronized across different listParam values', async () => {
    const cachedRecords = [
      { id: 1, name: 'Group 1 member' },
      { id: 2, name: 'Group 2 member' },
      { id: 3, name: 'Stale member' },
    ]

    repository = createRepository(cachedRecords)

    list
      .mockResolvedValueOnce(createResponse([{ id: 1, name: 'Group 1 member' }]))
      .mockResolvedValueOnce(createResponse([{ id: 2, name: 'Group 2 member' }]))

    await syncPaginated(list, repository, {
      key: 'group',
      values: [10, 20],
    })

    expect(repository.deleteById).toHaveBeenCalledExactlyOnceWith(3)
  })

  it('does not delete cached records when an API request fails', async () => {
    const error = new Error('Network error')

    list.mockRejectedValueOnce(error)

    await expect(syncPaginated(list, repository)).rejects.toThrow('Network error')

    expect(repository.getAll).not.toHaveBeenCalled()
    expect(repository.deleteById).not.toHaveBeenCalled()
  })

  it('does not delete cached records when a later page request fails', async () => {
    const error = new Error('Network error')

    list
      .mockResolvedValueOnce(createResponse([{ id: 1, name: 'Record 1' }], 'next-page'))
      .mockRejectedValueOnce(error)

    await expect(syncPaginated(list, repository)).rejects.toThrow('Network error')

    expect(repository.getAll).not.toHaveBeenCalled()
    expect(repository.deleteById).not.toHaveBeenCalled()
  })

  it('does not delete cached records when saving a page fails', async () => {
    const error = new Error('Database error')

    vi.mocked(repository.saveList).mockRejectedValueOnce(error)

    list.mockResolvedValueOnce(createResponse([{ id: 1, name: 'Record 1' }]))

    await expect(syncPaginated(list, repository)).rejects.toThrow('Database error')

    expect(repository.getAll).not.toHaveBeenCalled()
    expect(repository.deleteById).not.toHaveBeenCalled()
  })

  it('propagates errors when retrieving cached records fails', async () => {
    const error = new Error('Database error')

    vi.mocked(repository.getAll).mockRejectedValueOnce(error)

    list.mockResolvedValueOnce(createResponse([{ id: 1, name: 'Record 1' }]))

    await expect(syncPaginated(list, repository)).rejects.toThrow('Database error')
  })

  it('returns zero when the API returns no records', async () => {
    list.mockResolvedValueOnce(createResponse([]))

    const total = await syncPaginated(list, repository)

    expect(total).toBe(0)
    expect(repository.saveList).toHaveBeenCalledWith([])
  })
})

describe('syncSingle', () => {
  interface TestUser {
    id: number
    email: string
  }

  let get: ReturnType<typeof vi.fn<SyncSingleFunction<TestUser>>>
  let repository: SyncSingleRepository<TestUser>

  beforeEach(() => {
    vi.clearAllMocks()

    get = vi.fn<SyncSingleFunction<TestUser>>()

    repository = {
      save: vi.fn<SyncSingleRepository<TestUser>['save']>(async (_record: TestUser) => undefined),
    }
  })

  it('fetches and saves a single record', async () => {
    const user = {
      id: 1,
      email: 'user@example.com',
    }

    get.mockResolvedValueOnce(user)

    const result = await syncSingle(get, repository)

    expect(get).toHaveBeenCalledOnce()
    expect(repository.save).toHaveBeenCalledExactlyOnceWith(user)

    expect(result).toEqual(user)
  })

  it('returns the record retrieved from the API', async () => {
    const user = {
      id: 1,
      email: 'user@example.com',
    }

    get.mockResolvedValueOnce(user)

    await expect(syncSingle(get, repository)).resolves.toBe(user)
  })

  it('does not save when the API request fails', async () => {
    const error = new Error('Network error')

    get.mockRejectedValueOnce(error)

    await expect(syncSingle(get, repository)).rejects.toThrow('Network error')

    expect(repository.save).not.toHaveBeenCalled()
  })

  it('propagates errors when saving the record fails', async () => {
    const error = new Error('Database error')

    get.mockResolvedValueOnce({
      id: 1,
      email: 'user@example.com',
    })

    vi.mocked(repository.save).mockRejectedValueOnce(error)

    await expect(syncSingle(get, repository)).rejects.toThrow('Database error')
  })
})
