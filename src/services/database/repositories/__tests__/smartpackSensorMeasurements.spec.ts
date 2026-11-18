import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  get,
  getAll,
  getPaginated,
  save,
  saveList,
  deleteById,
  deleteBySmartPackId,
} from '../smartpackSensorMeasurements'

import type { SmartPackSensorMeasurement } from '@/api/modules/smartpacks'

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

const mockSmartPackSensorMeasurement: SmartPackSensorMeasurement = {
  id: 1,
  steps: 1500,
  weight: 4500,
  timestamp: '2026-11-13T10:00:00Z',
  created: '2026-11-13T10:00:00Z',
  updated: '2026-11-13T10:00:00Z',
}

const mockCachedMeasurement = {
  ...mockSmartPackSensorMeasurement,
  smartpack_id: 10,
  cached_at: '2026-11-13T12:00:00.000Z',
}

describe('SmartPack Sensor Measurements Repository', () => {
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
    it('saves a sensor measurement to the database', async () => {
      await save(10, mockSmartPackSensorMeasurement)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO cached_smartpack_sensor_measurements'),
        [
          mockSmartPackSensorMeasurement.id,
          10,
          mockSmartPackSensorMeasurement.steps,
          mockSmartPackSensorMeasurement.weight,
          mockSmartPackSensorMeasurement.timestamp,
          mockSmartPackSensorMeasurement.created,
          mockSmartPackSensorMeasurement.updated,
          expect.any(String),
        ],
        false,
      )
    })

    it('updates an existing measurement when its ID already exists', async () => {
      await save(10, mockSmartPackSensorMeasurement)

      const [query] = mocks.db.run.mock.calls[0]!

      expect(query).toContain('ON CONFLICT(id) DO UPDATE')
      expect(query).toContain('smartpack_id = excluded.smartpack_id')
      expect(query).toContain('steps = excluded.steps')
      expect(query).toContain('weight = excluded.weight')
      expect(query).toContain('timestamp = excluded.timestamp')
      expect(query).toContain('created = excluded.created')
      expect(query).toContain('updated = excluded.updated')
      expect(query).toContain('cached_at = excluded.cached_at')
    })

    it('associates the measurement with the supplied SmartPack ID', async () => {
      await save(25, mockSmartPackSensorMeasurement)

      const [, values] = mocks.db.run.mock.calls[0]!

      expect(values?.[1]).toBe(25)
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(save(10, mockSmartPackSensorMeasurement)).rejects.toThrow(error)
    })
  })

  describe('saveList', () => {
    it('saves all measurements within a transaction', async () => {
      const measurements = [
        mockSmartPackSensorMeasurement,
        {
          ...mockSmartPackSensorMeasurement,
          id: 2,
          steps: 2000,
          weight: 5000,
        },
      ]

      await saveList(10, measurements)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).toHaveBeenCalledTimes(2)
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('commits an empty list without saving any measurements', async () => {
      await saveList(10, [])

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.run).not.toHaveBeenCalled()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('associates all measurements with the supplied SmartPack ID', async () => {
      const measurements = [
        mockSmartPackSensorMeasurement,
        {
          ...mockSmartPackSensorMeasurement,
          id: 2,
        },
      ]

      await saveList(25, measurements)

      for (const [, values] of mocks.db.run.mock.calls) {
        expect(values?.[1]).toBe(25)
      }
    })

    it('rolls back the transaction when saving a measurement fails', async () => {
      const error = new Error('Failed to save measurement')

      mocks.db.run.mockResolvedValueOnce({}).mockRejectedValueOnce(error)

      const measurements = [
        mockSmartPackSensorMeasurement,
        { ...mockSmartPackSensorMeasurement, id: 2 },
      ]

      await expect(saveList(10, measurements)).rejects.toThrow(error)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
    })

    it('preserves the original error when rollback also fails', async () => {
      const error = new Error('Failed to save measurement')
      const rollbackError = new Error('Failed to roll back')

      mocks.db.run.mockRejectedValue(error)
      mocks.db.rollbackTransaction.mockRejectedValue(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(saveList(10, [mockSmartPackSensorMeasurement])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getAll', () => {
    it('returns all cached sensor measurements', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockCachedMeasurement],
      })

      const result = await getAll()

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
      )

      expect(result).toEqual([mockCachedMeasurement])
    })

    it('returns an empty array when no measurements are cached', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getAll()

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('returns a cached measurement by ID', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockCachedMeasurement],
      })

      const result = await get(mockSmartPackSensorMeasurement.id)

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE id = ?'),
        [mockSmartPackSensorMeasurement.id],
      )

      expect(result).toEqual(mockCachedMeasurement)
    })

    it('returns null when the measurement does not exist', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await get(999)

      expect(result).toBeNull()
    })
  })

  describe('getPaginated', () => {
    const cachedMeasurements = [
      mockCachedMeasurement,
      {
        ...mockCachedMeasurement,
        id: 2,
        timestamp: '2026-11-14T10:00:00Z',
        steps: 2000,
      },
      {
        ...mockCachedMeasurement,
        id: 3,
        smartpack_id: 20,
        timestamp: '2026-11-15T10:00:00Z',
        steps: 3000,
      },
    ]

    beforeEach(() => {
      mocks.db.query.mockResolvedValue({ values: cachedMeasurements })
    })

    it('returns all cached measurements when no filters are provided', async () => {
      const result = await getPaginated({
        page: 1,
        page_size: 10,
      })

      expect(result).toEqual({
        count: 3,
        next: null,
        previous: null,
        results: cachedMeasurements,
      })
    })

    it('filters measurements by SmartPack ID', async () => {
      const result = await getPaginated({
        smartpack: 10,
        page: 1,
        page_size: 10,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('smartpack_id = ?'), [10])

      expect(result.count).toBe(3)
    })

    it('filters measurements by timestamp_gte', async () => {
      await getPaginated({
        timestamp_gte: '2026-11-14T00:00:00Z',
        page: 1,
        page_size: 10,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('timestamp >= ?'), [
        '2026-11-14T00:00:00Z',
      ])
    })

    it('filters measurements by timestamp_lte', async () => {
      await getPaginated({
        timestamp_lte: '2026-11-14T00:00:00Z',
        page: 1,
        page_size: 10,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('timestamp <= ?'), [
        '2026-11-14T00:00:00Z',
      ])
    })

    it('applies multiple filters together', async () => {
      await getPaginated({
        smartpack: 10,
        timestamp_gte: '2026-11-13T00:00:00Z',
        timestamp_lte: '2026-11-14T00:00:00Z',
        page: 1,
        page_size: 10,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('smartpack_id = ?'), [
        10,
        '2026-11-13T00:00:00Z',
        '2026-11-14T00:00:00Z',
      ])

      const [query] = mocks.db.query.mock.calls[0]!

      expect(query).toContain('timestamp >= ?')
      expect(query).toContain('timestamp <= ?')
      expect(query).toContain('ORDER BY timestamp DESC')
    })

    it('paginates cached measurements', async () => {
      const result = await getPaginated({
        page: 2,
        page_size: 1,
      })

      expect(result).toEqual({
        count: 3,
        next: '3',
        previous: '1',
        results: [cachedMeasurements[1]],
      })
    })

    it('returns an empty result when no measurements match the filters', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await getPaginated({
        smartpack: 999,
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

    it('returns an empty result when the requested page exceeds available pages', async () => {
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

    it('retrieves cached measurements from the database', async () => {
      await getPaginated({
        smartpack: 10,
        page: 1,
        page_size: 10,
      })

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('FROM cached_smartpack_sensor_measurements'),
        [10],
      )
    })
  })

  describe('clear', () => {
    it('deletes all cached sensor measurements', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_smartpack_sensor_measurements',
      )
    })
  })

  describe('deleteBySmartPackId', () => {
    it('deletes cached measurements belonging to a SmartPack', async () => {
      await deleteBySmartPackId(10)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_smartpack_sensor_measurements WHERE smartpack_id = ?',
        [10],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteBySmartPackId(10)).rejects.toThrow(error)
    })
  })

  describe('deleteById', () => {
    it('deletes a cached measurement by its ID', async () => {
      await deleteById(mockSmartPackSensorMeasurement.id)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_smartpack_sensor_measurements WHERE id = ?',
        [mockSmartPackSensorMeasurement.id],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteById(mockSmartPackSensorMeasurement.id)).rejects.toThrow(error)
    })
  })
})
