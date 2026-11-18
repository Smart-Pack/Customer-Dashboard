import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  deleteByModule,
  get,
  getAll,
  getLastSyncedAt,
  isFullySynced,
  save,
} from '../syncMetadata'

import type { SyncMetadata } from '../syncMetadata'

const mocks = vi.hoisted(() => {
  const db = {
    run: vi.fn<
      (statement: string, values?: unknown[], transaction?: boolean) => Promise<unknown>
    >(),
    query: vi.fn<(statement: string, values?: unknown[]) => Promise<{ values?: unknown[] }>>(),
  }

  return {
    getDatabase: vi.fn<() => Promise<typeof db>>(),
    db,
  }
})

vi.mock('../../database', () => ({
  getDatabase: mocks.getDatabase,
}))

const mockSyncMetadata: SyncMetadata = {
  module: 'smartpacks',
  last_synced_at: '2026-11-18T09:00:00.000Z',
  sync_status: 'success',
  last_attempted_at: '2026-11-18T09:00:00.000Z',
  last_error: null,
}

const mockMetadataRecords: SyncMetadata[] = [
  mockSyncMetadata,
  {
    module: 'groups',
    last_synced_at: '2026-11-18T10:00:00.000Z',
    sync_status: 'success',
    last_attempted_at: '2026-11-18T10:00:00.000Z',
    last_error: null,
  },
  {
    module: 'notifications',
    last_synced_at: null,
    sync_status: 'idle',
    last_attempted_at: null,
    last_error: null,
  },
]

describe('Sync Metadata Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getDatabase.mockResolvedValue(mocks.db)

    mocks.db.run.mockResolvedValue({})
    mocks.db.query.mockResolvedValue({ values: [] })
  })

  // ---------------------------------------------------------
  // get
  // ---------------------------------------------------------

  describe('get', () => {
    it('returns synchronization metadata for a module', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockSyncMetadata],
      })

      const result = await get('smartpacks')

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE module = ?'),
        ['smartpacks'],
      )

      expect(result).toEqual(mockSyncMetadata)
    })

    it('returns null when no metadata exists for the module', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await get('smartpacks')

      expect(result).toBeNull()
    })

    it('returns null when query values are undefined', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await get('smartpacks')

      expect(result).toBeNull()
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.query.mockRejectedValue(error)

      await expect(get('smartpacks')).rejects.toThrow(error)
    })
  })

  // ---------------------------------------------------------
  // getLastSyncedAt
  // ---------------------------------------------------------

  describe('getLastSyncedAt', () => {
    it('returns the latest successful synchronization timestamp', async () => {
      mocks.db.query.mockResolvedValue({
        values: mockMetadataRecords,
      })

      const result = await getLastSyncedAt()

      expect(result).toBe('2026-11-18T10:00:00.000Z')
    })

    it('returns null when no metadata records exist', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await getLastSyncedAt()

      expect(result).toBeNull()
    })

    it('returns null when no module has a successful synchronization timestamp', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          {
            ...mockSyncMetadata,
            last_synced_at: null,
            sync_status: 'failed',
          },
          {
            ...mockSyncMetadata,
            module: 'groups',
            last_synced_at: null,
            sync_status: 'idle',
          },
        ],
      })

      const result = await getLastSyncedAt()

      expect(result).toBeNull()
    })

    it('uses previous successful timestamps even when modules have failed', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          {
            ...mockSyncMetadata,
            last_synced_at: '2026-11-18T09:00:00.000Z',
            sync_status: 'failed',
            last_error: 'Network unavailable',
          },
          {
            ...mockSyncMetadata,
            module: 'groups',
            last_synced_at: '2026-11-18T10:00:00.000Z',
            sync_status: 'success',
          },
        ],
      })

      const result = await getLastSyncedAt()

      expect(result).toBe('2026-11-18T10:00:00.000Z')
    })

    it('ignores null timestamps', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          {
            ...mockSyncMetadata,
            last_synced_at: null,
            sync_status: 'idle',
          },
          mockSyncMetadata,
        ],
      })

      const result = await getLastSyncedAt()

      expect(result).toBe(mockSyncMetadata.last_synced_at)
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.query.mockRejectedValue(error)

      await expect(getLastSyncedAt()).rejects.toThrow(error)
    })
  })

  // ---------------------------------------------------------
  // isFullySynced
  // ---------------------------------------------------------

  describe('isFullySynced', () => {
    it('returns true when all modules have successfully synchronized', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          mockSyncMetadata,
          {
            ...mockSyncMetadata,
            module: 'groups',
          },
        ],
      })

      const result = await isFullySynced()

      expect(result).toBe(true)
    })

    it('returns false when no metadata records exist', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await isFullySynced()

      expect(result).toBe(false)
    })

    it('returns false when at least one module is idle', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          mockSyncMetadata,
          {
            ...mockSyncMetadata,
            module: 'groups',
            sync_status: 'idle',
          },
        ],
      })

      const result = await isFullySynced()

      expect(result).toBe(false)
    })

    it('returns false when at least one module has failed', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          mockSyncMetadata,
          {
            ...mockSyncMetadata,
            module: 'groups',
            sync_status: 'failed',
          },
        ],
      })

      const result = await isFullySynced()

      expect(result).toBe(false)
    })

    it('returns false when at least one module is syncing', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          mockSyncMetadata,
          {
            ...mockSyncMetadata,
            module: 'groups',
            sync_status: 'syncing',
          },
        ],
      })

      const result = await isFullySynced()

      expect(result).toBe(false)
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.query.mockRejectedValue(error)

      await expect(isFullySynced()).rejects.toThrow(error)
    })
  })

  // ---------------------------------------------------------
  // getAll
  // ---------------------------------------------------------

  describe('getAll', () => {
    it('returns synchronization metadata for all modules', async () => {
      const metadata: SyncMetadata[] = [
        mockSyncMetadata,
        {
          ...mockSyncMetadata,
          module: 'groups',
        },
      ]

      mocks.db.query.mockResolvedValue({
        values: metadata,
      })

      const result = await getAll()

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('ORDER BY module ASC'),
      )

      expect(result).toEqual(metadata)
    })

    it('returns an empty array when no metadata exists', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getAll()

      expect(result).toEqual([])
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.query.mockRejectedValue(error)

      await expect(getAll()).rejects.toThrow(error)
    })
  })

  // ---------------------------------------------------------
  // save
  // ---------------------------------------------------------

  describe('save', () => {
    it('creates synchronization metadata for a new module', async () => {
      await save(mockSyncMetadata)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO sync_metadata'),
        [
          mockSyncMetadata.module,
          mockSyncMetadata.last_synced_at,
          mockSyncMetadata.sync_status,
          mockSyncMetadata.last_attempted_at,
          mockSyncMetadata.last_error,
        ],
        false,
      )
    })

    it('updates existing metadata when the module already exists', async () => {
      await save(mockSyncMetadata)

      const [statement] = mocks.db.run.mock.calls[0]!

      expect(statement).toContain('ON CONFLICT(module) DO UPDATE')
      expect(statement).toContain('last_synced_at = excluded.last_synced_at')
      expect(statement).toContain('sync_status = excluded.sync_status')
      expect(statement).toContain('last_attempted_at = excluded.last_attempted_at')
      expect(statement).toContain('last_error = excluded.last_error')
    })

    it('preserves existing metadata fields when they are omitted', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockSyncMetadata],
      })

      await save({
        module: 'smartpacks',
        sync_status: 'syncing',
      })

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO sync_metadata'),
        [
          'smartpacks',
          mockSyncMetadata.last_synced_at,
          'syncing',
          mockSyncMetadata.last_attempted_at,
          mockSyncMetadata.last_error,
        ],
        false,
      )
    })

    it('uses default values when no existing metadata is found', async () => {
      await save({
        module: 'groups',
        sync_status: 'syncing',
      })

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO sync_metadata'),
        ['groups', null, 'syncing', null, null],
        false,
      )
    })

    it('clears the previous error when last_error is explicitly set to null', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          {
            ...mockSyncMetadata,
            last_error: 'Previous synchronization failed',
          },
        ],
      })

      await save({
        module: 'smartpacks',
        sync_status: 'success',
        last_error: null,
      })

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO sync_metadata'),
        [
          'smartpacks',
          mockSyncMetadata.last_synced_at,
          'success',
          mockSyncMetadata.last_attempted_at,
          null,
        ],
        false,
      )
    })

    it('propagates database errors when retrieving existing metadata', async () => {
      const error = new Error('Failed to retrieve metadata')

      mocks.db.query.mockRejectedValue(error)

      await expect(save(mockSyncMetadata)).rejects.toThrow(error)

      expect(mocks.db.run).not.toHaveBeenCalled()
    })

    it('propagates database errors when saving metadata', async () => {
      const error = new Error('Failed to save metadata')

      mocks.db.run.mockRejectedValue(error)

      await expect(save(mockSyncMetadata)).rejects.toThrow(error)
    })
  })

  // ---------------------------------------------------------
  // deleteByModule
  // ---------------------------------------------------------

  describe('deleteByModule', () => {
    it('deletes synchronization metadata for a module', async () => {
      await deleteByModule('smartpacks')

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('DELETE FROM sync_metadata'),
        ['smartpacks'],
        false,
      )

      expect(mocks.db.run.mock.calls[0]![0]).toContain('WHERE module = ?')
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteByModule('smartpacks')).rejects.toThrow(error)
    })
  })

  // ---------------------------------------------------------
  // clear
  // ---------------------------------------------------------

  describe('clear', () => {
    it('deletes all synchronization metadata', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith('DELETE FROM sync_metadata', [], false)
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(clear()).rejects.toThrow(error)
    })
  })
})
