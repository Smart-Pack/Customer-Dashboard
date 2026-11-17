import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  get,
  getAll,
  getPaginated,
  getByGroupId,
  save,
  deleteById,
  saveList,
} from '../smartpacks'

import type { SmartPack } from '@/api/modules/smartpacks'

const mocks = vi.hoisted(() => {
  const db = {
    run: vi.fn<
      (statement: string, values?: unknown[], transaction?: boolean) => Promise<unknown>
    >(),
    query: vi.fn<(statement: string, values?: unknown[]) => Promise<{ values?: unknown[] }>>(),
    beginTransaction: vi.fn<() => Promise<void>>(),
    commitTransaction: vi.fn<() => Promise<void>>(),
    rollbackTransaction: vi.fn<() => Promise<void>>(),
  }

  return {
    getDatabase: vi.fn<() => Promise<typeof db>>(),
    db,
  }
})

vi.mock('../../database', () => ({
  getDatabase: mocks.getDatabase,
}))

const mockSmartPack: SmartPack = {
  id: 1,
  device_uid: '550e8400-e29b-41d4-a716-446655440000',
  hardware_model: 'SmartPack V1',
  imei: '123456789012345',
  firmware_version: '1.0.0',
  bluetooth_mac_address: 'AA:BB:CC:DD:EE:FF',
  last_seen: '2026-11-13T10:00:00Z',
  is_online: true,
  assigned_to: {
    id: 10,
    uuid: 'user-uuid-123',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+254712345678',
  },
  child_name: 'Jane Doe',
  group: {
    id: 20,
    name: 'Test Group',
  },
  created: '2026-11-13T09:00:00Z',
  updated: '2026-11-13T11:00:00Z',
}

const mockCachedSmartPack = {
  ...mockSmartPack,
  cached_at: '2026-11-13T12:00:00.000Z',
}

const mockSmartPackRow = {
  id: mockSmartPack.id,
  device_uid: mockSmartPack.device_uid,
  hardware_model: mockSmartPack.hardware_model,
  imei: mockSmartPack.imei,
  firmware_version: mockSmartPack.firmware_version,
  bluetooth_mac_address: mockSmartPack.bluetooth_mac_address,
  last_seen: mockSmartPack.last_seen,
  is_online: 1,

  assigned_user_id: mockSmartPack.assigned_to!.id,
  assigned_user_uuid: mockSmartPack.assigned_to!.uuid,
  assigned_user_full_name: mockSmartPack.assigned_to!.full_name,
  assigned_user_email: mockSmartPack.assigned_to!.email,
  assigned_user_phone: mockSmartPack.assigned_to!.phone,

  child_name: mockSmartPack.child_name,

  group_id: mockSmartPack.group!.id,
  group_name: mockSmartPack.group!.name,

  created: mockSmartPack.created,
  updated: mockSmartPack.updated,
  cached_at: mockCachedSmartPack.cached_at,
}

describe('SmartPacks Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getDatabase.mockResolvedValue(mocks.db)

    mocks.db.run.mockResolvedValue({})
    mocks.db.query.mockResolvedValue({ values: [] })
    mocks.db.beginTransaction.mockResolvedValue(undefined)
    mocks.db.commitTransaction.mockResolvedValue(undefined)
    mocks.db.rollbackTransaction.mockResolvedValue(undefined)
  })

  describe('save', () => {
    it('saves a SmartPack to the database', async () => {
      await save(mockSmartPack)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO cached_smartpacks'),
        [
          mockSmartPack.id,
          mockSmartPack.device_uid,
          mockSmartPack.hardware_model,
          mockSmartPack.imei,
          mockSmartPack.firmware_version,
          mockSmartPack.bluetooth_mac_address,
          mockSmartPack.last_seen,
          1,

          mockSmartPack.assigned_to!.id,
          mockSmartPack.assigned_to!.uuid,
          mockSmartPack.assigned_to!.full_name,
          mockSmartPack.assigned_to!.email,
          mockSmartPack.assigned_to!.phone,

          mockSmartPack.child_name,

          mockSmartPack.group!.id,
          mockSmartPack.group!.name,

          mockSmartPack.created,
          mockSmartPack.updated,
          expect.any(String),
        ],
        false,
      )
    })

    it('updates an existing SmartPack when its ID already exists', async () => {
      await save(mockSmartPack)

      const [query] = mocks.db.run.mock.calls[0]!

      expect(query).toContain('ON CONFLICT(id) DO UPDATE')
      expect(query).toContain('device_uid = excluded.device_uid')
      expect(query).toContain('hardware_model = excluded.hardware_model')
      expect(query).toContain('assigned_user_id = excluded.assigned_user_id')
      expect(query).toContain('group_id = excluded.group_id')
      expect(query).toContain('child_name = excluded.child_name')
    })

    it('saves a SmartPack without an assigned user or group', async () => {
      const smartPack: SmartPack = {
        ...mockSmartPack,
        assigned_to: null,
        group: null,
        bluetooth_mac_address: null,
      }

      await save(smartPack)

      const [, values] = mocks.db.run.mock.calls[0]!

      expect(values).toEqual([
        smartPack.id,
        smartPack.device_uid,
        smartPack.hardware_model,
        smartPack.imei,
        smartPack.firmware_version,
        null,
        smartPack.last_seen,
        1,

        null,
        null,
        null,
        null,
        null,

        smartPack.child_name,

        null,
        null,

        smartPack.created,
        smartPack.updated,
        expect.any(String),
      ])
    })

    it('saves the online status as an integer', async () => {
      await save({ ...mockSmartPack, is_online: false })

      const [, values] = mocks.db.run.mock.calls[0]!

      expect(values?.[7]).toBe(0)
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(save(mockSmartPack)).rejects.toThrow(error)
    })
  })

  describe('saveList', () => {
    it('saves all SmartPacks within a transaction', async () => {
      const smartPacks = [
        mockSmartPack,
        { ...mockSmartPack, id: 2, device_uid: 'another-device-uid' },
      ]

      await saveList(smartPacks)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).toHaveBeenCalledTimes(2)
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('commits an empty list without saving any SmartPacks', async () => {
      await saveList([])

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).not.toHaveBeenCalled()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('rolls back the transaction when saving a SmartPack fails', async () => {
      const error = new Error('Failed to save SmartPack')

      mocks.db.run.mockResolvedValueOnce({}).mockRejectedValueOnce(error)

      const smartPacks = [mockSmartPack, { ...mockSmartPack, id: 2 }]

      await expect(saveList(smartPacks)).rejects.toThrow(error)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
    })

    it('preserves the original error when rollback also fails', async () => {
      const error = new Error('Failed to save SmartPack')
      const rollbackError = new Error('Failed to roll back')

      mocks.db.run.mockRejectedValue(error)
      mocks.db.rollbackTransaction.mockRejectedValue(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(saveList([mockSmartPack])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getAll', () => {
    it('returns all cached SmartPacks with nested assigned user and group objects', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockSmartPackRow],
      })

      const result = await getAll()

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('ORDER BY id ASC'),
      )

      expect(result).toEqual([mockCachedSmartPack])
    })

    it('converts the online status to a boolean', async () => {
      mocks.db.query.mockResolvedValue({
        values: [{ ...mockSmartPackRow, is_online: 0 }],
      })

      const result = await getAll()

      expect(result[0]?.is_online).toBe(false)
    })

    it('returns null for assigned user and group when they are not associated', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          {
            ...mockSmartPackRow,
            assigned_user_id: null,
            assigned_user_uuid: null,
            assigned_user_full_name: null,
            assigned_user_email: null,
            assigned_user_phone: null,
            group_id: null,
            group_name: null,
          },
        ],
      })

      const result = await getAll()

      expect(result[0]?.assigned_to).toBeNull()
      expect(result[0]?.group).toBeNull()
    })

    it('returns an empty array when no SmartPacks are cached', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getAll()

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('returns a cached SmartPack by ID with nested objects', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockSmartPackRow],
      })

      const result = await get(mockSmartPack.id)

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE id = ?'),
        [mockSmartPack.id],
      )

      expect(result).toEqual(mockCachedSmartPack)
    })

    it('returns null when the SmartPack does not exist', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await get(999)

      expect(result).toBeNull()
    })
  })
  describe('getByGroupId', () => {
    it('returns SmartPacks belonging to the specified group', async () => {
      mocks.db.query.mockResolvedValue({
        values: [
          mockSmartPackRow,
          {
            ...mockSmartPackRow,
            id: 2,
            device_uid: '550e8400-e29b-41d4-a716-446655440001',
          },
        ],
      })

      const result = await getByGroupId(20)

      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE group_id = ?'),
        [20],
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(mockCachedSmartPack)
      expect(result[1]).toMatchObject({
        id: 2,
        device_uid: '550e8400-e29b-41d4-a716-446655440001',
        group: {
          id: 20,
          name: 'Test Group',
        },
      })
    })

    it('returns an empty array when the group has no SmartPacks', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await getByGroupId(20)

      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE group_id = ?'),
        [20],
      )

      expect(result).toEqual([])
    })

    it('returns an empty array when query values are undefined', async () => {
      mocks.db.query.mockResolvedValue({})

      const result = await getByGroupId(20)

      expect(result).toEqual([])
    })
  })
  describe('getPaginated', () => {
    const cachedSmartPacks = [
      mockSmartPackRow,
      {
        ...mockSmartPackRow,
        id: 2,
        device_uid: 'another-device-uid',
        assigned_user_id: 11,
        group_id: 21,
      },
      {
        ...mockSmartPackRow,
        id: 3,
        device_uid: 'unassigned-device-uid',
        assigned_user_id: null,
        assigned_user_uuid: null,
        assigned_user_full_name: null,
        assigned_user_email: null,
        assigned_user_phone: null,
        group_id: null,
        group_name: null,
      },
    ]

    beforeEach(() => {
      mocks.db.query.mockResolvedValue({ values: cachedSmartPacks })
    })

    it('returns all cached SmartPacks when no filters are provided', async () => {
      const result = await getPaginated({ page: 1, page_size: 10 })

      expect(result).toEqual({
        count: 3,
        next: null,
        previous: null,
        results: [
          mockCachedSmartPack,
          {
            ...mockCachedSmartPack,
            id: 2,
            device_uid: 'another-device-uid',
            assigned_to: {
              id: 11,
              uuid: mockSmartPackRow.assigned_user_uuid,
              full_name: mockSmartPackRow.assigned_user_full_name,
              email: mockSmartPackRow.assigned_user_email,
              phone: mockSmartPackRow.assigned_user_phone,
            },
            group: {
              id: 21,
              name: mockSmartPackRow.group_name,
            },
          },
          {
            ...mockCachedSmartPack,
            id: 3,
            device_uid: 'unassigned-device-uid',
            assigned_to: null,
            group: null,
          },
        ],
      })
    })

    it('filters SmartPacks by assigned user', async () => {
      const result = await getPaginated({
        assigned_to: 11,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(1)
      expect(result.results[0]?.id).toBe(2)
    })

    it('filters SmartPacks by group', async () => {
      const result = await getPaginated({
        group: 21,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(1)
      expect(result.results[0]?.id).toBe(2)
    })

    it('returns only assigned SmartPacks when is_assigned is true', async () => {
      const result = await getPaginated({
        is_assigned: true,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(2)
      expect(result.results.every((smartPack) => smartPack.assigned_to !== null)).toBe(true)
    })

    it('returns only unassigned SmartPacks when is_assigned is false', async () => {
      const result = await getPaginated({
        is_assigned: false,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(1)
      expect(result.results[0]?.assigned_to).toBeNull()
    })

    it('returns only SmartPacks with a group when has_group is true', async () => {
      const result = await getPaginated({
        has_group: true,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(2)
      expect(result.results.every((smartPack) => smartPack.group !== null)).toBe(true)
    })

    it('returns only SmartPacks without a group when has_group is false', async () => {
      const result = await getPaginated({
        has_group: false,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(1)
      expect(result.results[0]?.group).toBeNull()
    })

    it('applies multiple filters together', async () => {
      const result = await getPaginated({
        assigned_to: 10,
        group: 20,
        is_assigned: true,
        has_group: true,
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(1)
      expect(result.results[0]?.id).toBe(1)
    })

    it('returns an empty result when no SmartPacks match the filters', async () => {
      const result = await getPaginated({
        assigned_to: 999,
        page: 1,
        page_size: 10,
      })

      expect(result).toEqual({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })
    })

    it('paginates filtered SmartPacks', async () => {
      const result = await getPaginated({
        is_assigned: true,
        page: 2,
        page_size: 1,
      })

      expect(result).toEqual({
        count: 2,
        next: null,
        previous: '1',
        results: [
          expect.objectContaining({
            id: 2,
          }),
        ],
      })
    })

    it('returns an empty result when the requested page exceeds the available pages', async () => {
      const result = await getPaginated({
        page: 5,
        page_size: 1,
      })

      expect(result).toEqual({
        count: 3,
        next: null,
        previous: null,
        results: [],
      })
    })

    it('retrieves cached SmartPacks from the database', async () => {
      await getPaginated({ page: 1, page_size: 10 })

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('FROM cached_smartpacks'),
      )
    })
  })

  describe('clear', () => {
    it('deletes all cached SmartPacks', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith('DELETE FROM cached_smartpacks')
    })
  })

  describe('deleteById', () => {
    it('deletes a cached SmartPack by its ID', async () => {
      await deleteById(mockSmartPack.id)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_smartpacks WHERE id = ?',
        [mockSmartPack.id],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteById(mockSmartPack.id)).rejects.toThrow(error)
    })
  })
})
