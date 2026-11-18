import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  deleteBySmartPackId,
  deleteByTimestamp,
  getAll,
  getBySmartPackId,
  getPaginated,
  save,
  saveList,
} from '../bluetoothSensorMeasurements'

import type { SmartPackSensorRecord } from '@/types/bluetooth'

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

const mockBluetoothSensorRecord: SmartPackSensorRecord = {
  weight: 4500,
  steps: 1500,
  timestamp: '2026-11-13T10:00:00Z',
}

const mockCachedMeasurement = {
  ...mockBluetoothSensorRecord,
  smartpack_id: 10,
}

describe('Bluetooth Sensor Measurements Repository', () => {
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
    it('saves a Bluetooth sensor measurement to the database', async () => {
      await save(10, mockBluetoothSensorRecord)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO cached_bluetooth_sensor_measurements'),
        [
          10,
          mockBluetoothSensorRecord.timestamp,
          mockBluetoothSensorRecord.weight,
          mockBluetoothSensorRecord.steps,
        ],
        false,
      )
    })

    it('updates an existing measurement when its SmartPack ID and timestamp already exist', async () => {
      await save(10, mockBluetoothSensorRecord)

      const [query] = mocks.db.run.mock.calls[0]!

      expect(query).toContain('ON CONFLICT(smartpack_id, timestamp) DO UPDATE')
      expect(query).toContain('weight = excluded.weight')
      expect(query).toContain('steps = excluded.steps')
    })

    it('associates the measurement with the supplied SmartPack ID', async () => {
      await save(25, mockBluetoothSensorRecord)

      const [, values] = mocks.db.run.mock.calls[0]!

      expect(values?.[0]).toBe(25)
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(save(10, mockBluetoothSensorRecord)).rejects.toThrow(error)
    })
  })

  describe('saveList', () => {
    it('saves all measurements within a transaction', async () => {
      const measurements = [
        mockBluetoothSensorRecord,
        {
          ...mockBluetoothSensorRecord,
          timestamp: '2026-11-13T10:01:00Z',
          weight: 5000,
          steps: 1600,
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
        mockBluetoothSensorRecord,
        {
          ...mockBluetoothSensorRecord,
          timestamp: '2026-11-13T10:01:00Z',
        },
      ]

      await saveList(25, measurements)

      for (const [, values] of mocks.db.run.mock.calls) {
        expect(values?.[0]).toBe(25)
      }
    })

    it('rolls back the transaction when saving a measurement fails', async () => {
      const error = new Error('Failed to save measurement')

      mocks.db.run.mockResolvedValueOnce({}).mockRejectedValueOnce(error)

      const measurements = [
        mockBluetoothSensorRecord,
        {
          ...mockBluetoothSensorRecord,
          timestamp: '2026-11-13T10:01:00Z',
        },
      ]

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(saveList(10, measurements)).rejects.toThrow(error)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('preserves the original error when rollback also fails', async () => {
      const error = new Error('Failed to save measurement')
      const rollbackError = new Error('Failed to roll back')

      mocks.db.run.mockRejectedValue(error)
      mocks.db.rollbackTransaction.mockRejectedValue(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(saveList(10, [mockBluetoothSensorRecord])).rejects.toThrow(error)

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getAll', () => {
    it('returns all cached Bluetooth sensor measurements', async () => {
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

  describe('getBySmartPackId', () => {
    it('returns cached measurements belonging to a SmartPack', async () => {
      mocks.db.query.mockResolvedValue({
        values: [mockCachedMeasurement],
      })

      const result = await getBySmartPackId(10)

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE smartpack_id = ?'),
        [10],
      )

      expect(result).toEqual([mockCachedMeasurement])
    })

    it('returns an empty array when the SmartPack has no cached measurements', async () => {
      mocks.db.query.mockResolvedValue({ values: undefined })

      const result = await getBySmartPackId(10)

      expect(result).toEqual([])
    })

    it('orders measurements by timestamp in descending order', async () => {
      await getBySmartPackId(10)

      const [query] = mocks.db.query.mock.calls[0]!

      expect(query).toContain('ORDER BY timestamp DESC')
    })
  })

  describe('getPaginated', () => {
    const cachedMeasurements = [
      mockCachedMeasurement,
      {
        ...mockCachedMeasurement,
        timestamp: '2026-11-14T10:00:00Z',
        weight: 5000,
        steps: 2000,
      },
      {
        ...mockCachedMeasurement,
        timestamp: '2026-11-15T10:00:00Z',
        weight: 6000,
        steps: 3000,
      },
    ]

    beforeEach(() => {
      mocks.db.query.mockResolvedValue({
        values: cachedMeasurements,
      })
    })

    it('returns all cached measurements when they fit on one page', async () => {
      const result = await getPaginated(10, {
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

    it('retrieves measurements for the supplied SmartPack ID', async () => {
      await getPaginated(25, {
        page: 1,
        page_size: 10,
      })

      expect(mocks.db.query).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('WHERE smartpack_id = ?'),
        [25],
      )
    })

    it('paginates cached measurements', async () => {
      const result = await getPaginated(10, {
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

    it('uses default pagination values when none are provided', async () => {
      const result = await getPaginated(10, {})

      expect(result).toEqual({
        count: 3,
        next: null,
        previous: null,
        results: cachedMeasurements,
      })
    })

    it('returns an empty result when no measurements are cached', async () => {
      mocks.db.query.mockResolvedValue({ values: [] })

      const result = await getPaginated(999, {
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
      const result = await getPaginated(10, {
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
  })

  describe('clear', () => {
    it('deletes all cached Bluetooth sensor measurements', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_bluetooth_sensor_measurements',
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(clear()).rejects.toThrow(error)
    })
  })

  describe('deleteBySmartPackId', () => {
    it('deletes cached measurements belonging to a SmartPack', async () => {
      await deleteBySmartPackId(10)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_bluetooth_sensor_measurements WHERE smartpack_id = ?',
        [10],
      )
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteBySmartPackId(10)).rejects.toThrow(error)
    })
  })

  describe('deleteByTimestamp', () => {
    it('deletes a cached measurement by SmartPack ID and timestamp', async () => {
      await deleteByTimestamp(10, mockBluetoothSensorRecord.timestamp)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('DELETE FROM cached_bluetooth_sensor_measurements'),
        [10, mockBluetoothSensorRecord.timestamp],
      )

      const [query] = mocks.db.run.mock.calls[0]!

      expect(query).toContain('WHERE smartpack_id = ? AND timestamp = ?')
    })

    it('propagates database errors', async () => {
      const error = new Error('Database error')

      mocks.db.run.mockRejectedValue(error)

      await expect(deleteByTimestamp(10, mockBluetoothSensorRecord.timestamp)).rejects.toThrow(
        error,
      )
    })
  })
})
