import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificationPreferences } from '@/api/modules/notificationPreferences'

import { getDatabase } from '../../database'
import { clear, get, save } from '../notificationPreferences'

vi.mock('../../database', () => ({
  getDatabase: vi.fn<typeof import('../../database').getDatabase>(),
}))

/**
 * Mock SQLite database connection.
 */
const mockDatabase = {
  beginTransaction: vi.fn<() => Promise<void>>(),
  commitTransaction: vi.fn<() => Promise<void>>(),
  rollbackTransaction: vi.fn<() => Promise<void>>(),

  run: vi.fn<(statement: string, values?: unknown[], transaction?: boolean) => Promise<unknown>>(),

  query: vi.fn<
    (
      statement: string,
      values?: unknown[],
    ) => Promise<{
      values?: Record<string, unknown>[]
    }>
  >(),
}

/**
 * Sample notification preferences.
 */
const mockPreferences: NotificationPreferences = {
  id: 1,
  sms_phone_number: '0712345678',
  whatsapp_phone_number: '0723456789',
  preferred_general_channel: 'email',
  preferred_smartpack_channel: 'sms',
}

/**
 * Sample cached notification preferences row.
 */
const mockCachedPreferencesRow = {
  id: 1,
  sms_phone_number: mockPreferences.sms_phone_number,
  whatsapp_phone_number: mockPreferences.whatsapp_phone_number,
  preferred_general_channel: mockPreferences.preferred_general_channel,
  preferred_smartpack_channel: mockPreferences.preferred_smartpack_channel,
  cached_at: '2026-11-11T10:00:00.000Z',
}

describe('NotificationPreferencesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockDatabase.beginTransaction.mockResolvedValue(undefined)
    mockDatabase.commitTransaction.mockResolvedValue(undefined)
    mockDatabase.rollbackTransaction.mockResolvedValue(undefined)
    mockDatabase.run.mockResolvedValue(undefined)
    mockDatabase.query.mockResolvedValue({ values: [] })

    vi.mocked(getDatabase).mockResolvedValue(mockDatabase as never)
  })

  // ---------------------------------------------------------
  // save()
  // ---------------------------------------------------------

  describe('save()', () => {
    it('should save notification preferences inside a transaction', async () => {
      await save(mockPreferences)

      expect(getDatabase).toHaveBeenCalledOnce()
      expect(mockDatabase.beginTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.run).toHaveBeenCalledOnce()
      expect(mockDatabase.commitTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.rollbackTransaction).not.toHaveBeenCalled()
    })

    it('should insert the cached preferences with the local record ID', async () => {
      await save(mockPreferences)

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO cached_notification_preferences'),
        expect.any(Array),
        false,
      )

      const insertValues = mockDatabase.run.mock.calls[0]?.[1] as unknown[]

      expect(insertValues?.[0]).toBe(1)
    })

    it('should insert the correct notification preference fields', async () => {
      await save(mockPreferences)

      const insertValues = mockDatabase.run.mock.calls[0]?.[1] as unknown[]

      expect(insertValues).toEqual([
        1,
        mockPreferences.sms_phone_number,
        mockPreferences.whatsapp_phone_number,
        mockPreferences.preferred_general_channel,
        mockPreferences.preferred_smartpack_channel,
        expect.any(String),
      ])
    })

    it('should support empty SMS and WhatsApp phone numbers', async () => {
      const preferences = {
        ...mockPreferences,
        sms_phone_number: '',
        whatsapp_phone_number: '',
      }

      await save(preferences)

      const insertValues = mockDatabase.run.mock.calls[0]?.[1] as unknown[]

      expect(insertValues?.[1]).toBe('')
      expect(insertValues?.[2]).toBe('')
    })

    it('should generate a cached_at timestamp', async () => {
      await save(mockPreferences)

      const insertValues = mockDatabase.run.mock.calls[0]?.[1] as unknown[]
      const cachedAt = insertValues?.[5] as string

      expect(cachedAt).toEqual(expect.any(String))
      expect(new Date(cachedAt).toISOString()).toBe(cachedAt)
    })

    it('should rollback the transaction when saving fails', async () => {
      const error = new Error('Failed to insert notification preferences')

      mockDatabase.run.mockRejectedValueOnce(error)

      await expect(save(mockPreferences)).rejects.toThrow(error)

      expect(mockDatabase.beginTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mockDatabase.commitTransaction).not.toHaveBeenCalled()
    })

    it('should preserve the original error if rollback also fails', async () => {
      const saveError = new Error('Failed to insert notification preferences')
      const rollbackError = new Error('Rollback failed')

      mockDatabase.run.mockRejectedValueOnce(saveError)
      mockDatabase.rollbackTransaction.mockRejectedValueOnce(rollbackError)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(save(mockPreferences)).rejects.toThrow(saveError)

      expect(mockDatabase.rollbackTransaction).toHaveBeenCalledOnce()

      consoleSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------
  // get()
  // ---------------------------------------------------------

  describe('get()', () => {
    it('should return the cached notification preferences', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [mockCachedPreferencesRow],
      })

      const result = await get()

      expect(result).toEqual(mockPreferences)
    })

    it('should return null when no cached preferences exist', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [],
      })

      const result = await get()

      expect(result).toBeNull()
    })

    it('should retrieve preferences using the local record ID', async () => {
      await get()

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM cached_notification_preferences'),
        [1],
      )
    })

    it('should return empty phone numbers when none are configured', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [
          {
            ...mockCachedPreferencesRow,
            sms_phone_number: '',
            whatsapp_phone_number: '',
          },
        ],
      })

      const result = await get()

      expect(result?.sms_phone_number).toBe('')
      expect(result?.whatsapp_phone_number).toBe('')
    })

    it('should return the supported notification channels', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        values: [mockCachedPreferencesRow],
      })

      const result = await get()

      expect(result?.preferred_general_channel).toBe('email')
      expect(result?.preferred_smartpack_channel).toBe('sms')
    })
  })

  // ---------------------------------------------------------
  // clear()
  // ---------------------------------------------------------

  describe('clear()', () => {
    it('should delete the cached notification preferences', async () => {
      await clear()

      expect(getDatabase).toHaveBeenCalledOnce()

      expect(mockDatabase.run).toHaveBeenCalledWith(
        'DELETE FROM cached_notification_preferences',
        [],
        false,
      )
    })

    it('should not start a transaction when clearing preferences', async () => {
      await clear()

      expect(mockDatabase.beginTransaction).not.toHaveBeenCalled()
      expect(mockDatabase.commitTransaction).not.toHaveBeenCalled()
    })
  })
})
