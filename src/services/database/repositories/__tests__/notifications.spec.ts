import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

import {
  save,
  saveList,
  replaceList,
  getById,
  getAll,
  getPaginated,
  markAsRead,
  markAsUnread,
  dismiss,
  deleteById,
  clear,
} from '../notifications'

import type { Notification } from '@/api/modules/notifications'

const mocks = vi.hoisted(() => {
  const db = {
    run: vi.fn<SQLiteDBConnection['run']>(),
    query: vi.fn<SQLiteDBConnection['query']>(),
    beginTransaction: vi.fn<SQLiteDBConnection['beginTransaction']>(),
    commitTransaction: vi.fn<SQLiteDBConnection['commitTransaction']>(),
    rollbackTransaction: vi.fn<SQLiteDBConnection['rollbackTransaction']>(),
  }

  return {
    db,
    getDatabase: vi.fn<() => Promise<typeof db>>(),
  }
})

vi.mock('../../database', () => ({
  getDatabase: mocks.getDatabase,
}))

const mockNotification: Notification = {
  id: 1,
  notification_type: 'general',
  title: 'Test notification',
  body: 'This is a test notification.',
  url: '/dashboard/notifications/1',
  data: {
    source: 'test',
    reference: 123,
  },
  read_at: null,
  dismissed_at: null,
  is_read: false,
  is_dismissed: false,
  created: '2026-11-18T08:00:00.000Z',
  updated: '2026-11-18T08:00:00.000Z',
}

const mockNotificationTwo: Notification = {
  id: 2,
  notification_type: 'smartpack',
  title: 'SmartPack assigned',
  body: 'A SmartPack has been assigned to you.',
  url: '/dashboard/smartpacks/2',
  data: '{"smartpack_id":2}',
  read_at: '2026-11-18T08:10:00.000Z',
  dismissed_at: null,
  is_read: true,
  is_dismissed: false,
  created: '2026-11-18T08:05:00.000Z',
  updated: '2026-11-18T08:10:00.000Z',
}

const mockNotificationRow = {
  ...mockNotification,
  data: JSON.stringify(mockNotification.data),
  is_read: 0,
  is_dismissed: 0,
  cached_at: '2026-11-18T08:01:00.000Z',
}

describe('notifications repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getDatabase.mockResolvedValue(mocks.db)

    mocks.db.run.mockResolvedValue({
      changes: { changes: 1 },
    })

    mocks.db.query.mockResolvedValue({
      values: [],
    })

    mocks.db.beginTransaction.mockResolvedValue({ changes: {} })
    mocks.db.commitTransaction.mockResolvedValue({ changes: {} })
    mocks.db.rollbackTransaction.mockResolvedValue({ changes: {} })
  })

  // ---------------------------------------------------------
  // Save
  // ---------------------------------------------------------

  describe('save', () => {
    it('should save a notification', async () => {
      await save(mockNotification)

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('INSERT INTO cached_notifications'),
        [
          mockNotification.id,
          mockNotification.notification_type,
          mockNotification.title,
          mockNotification.body,
          mockNotification.url,
          JSON.stringify(mockNotification.data),
          mockNotification.read_at,
          mockNotification.dismissed_at,
          0,
          0,
          mockNotification.created,
          mockNotification.updated,
          expect.any(String),
        ],
        false,
      )
    })

    it('should serialize notification data', async () => {
      await save(mockNotification)

      const values = mocks.db.run.mock.calls[0]?.[1]

      expect(values?.[5]).toBe(JSON.stringify(mockNotification.data))
    })

    it('should preserve null notification data', async () => {
      await save({
        ...mockNotification,
        data: null,
      })

      const values = mocks.db.run.mock.calls[0]?.[1]

      expect(values?.[5]).toBeNull()
    })

    it('should persist boolean fields as integers', async () => {
      await save({
        ...mockNotification,
        is_read: true,
        is_dismissed: true,
      })

      const values = mocks.db.run.mock.calls[0]?.[1]

      expect(values?.[8]).toBe(1)
      expect(values?.[9]).toBe(1)
    })

    it('should use an upsert query', async () => {
      await save(mockNotification)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(id) DO UPDATE'),
        expect.any(Array),
        false,
      )
    })

    it('should execute the operation inside a transaction', async () => {
      await save(mockNotification)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })
  })

  // ---------------------------------------------------------
  // Save list
  // ---------------------------------------------------------

  describe('saveList', () => {
    it('should save multiple notifications', async () => {
      await saveList([mockNotification, mockNotificationTwo])

      expect(mocks.db.run).toHaveBeenCalledTimes(2)

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('should serialize data for each notification', async () => {
      await saveList([mockNotification, mockNotificationTwo])

      const firstValues = mocks.db.run.mock.calls[0]?.[1]
      const secondValues = mocks.db.run.mock.calls[1]?.[1]

      expect(firstValues?.[5]).toBe(JSON.stringify(mockNotification.data))
      expect(secondValues?.[5]).toBe(JSON.stringify(mockNotificationTwo.data))
    })

    it('should save an empty list without inserting records', async () => {
      await saveList([])

      expect(mocks.db.run).not.toHaveBeenCalled()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('should roll back the transaction when saving fails', async () => {
      mocks.db.run.mockRejectedValueOnce(new Error('Database error'))

      await expect(saveList([mockNotification])).rejects.toThrow('Database error')

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------
  // Replace list
  // ---------------------------------------------------------

  describe('replaceList', () => {
    it('should delete existing notifications before inserting new ones', async () => {
      await replaceList([mockNotification, mockNotificationTwo])

      expect(mocks.db.run).toHaveBeenCalledTimes(3)

      expect(mocks.db.run).toHaveBeenNthCalledWith(1, 'DELETE FROM cached_notifications', [], false)

      expect(mocks.db.run).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO cached_notifications'),
        expect.any(Array),
        false,
      )

      expect(mocks.db.run).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO cached_notifications'),
        expect.any(Array),
        false,
      )
    })

    it('should execute replacement inside a transaction', async () => {
      await replaceList([mockNotification])

      expect(mocks.db.beginTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('should clear existing notifications when given an empty list', async () => {
      await replaceList([])

      expect(mocks.db.run).toHaveBeenCalledExactlyOnceWith(
        'DELETE FROM cached_notifications',
        [],
        false,
      )

      expect(mocks.db.commitTransaction).toHaveBeenCalledOnce()
    })

    it('should roll back the replacement when insertion fails', async () => {
      mocks.db.run
        .mockResolvedValueOnce({ changes: { changes: 1 } })
        .mockRejectedValueOnce(new Error('Insert failed'))

      await expect(replaceList([mockNotification])).rejects.toThrow('Insert failed')

      expect(mocks.db.rollbackTransaction).toHaveBeenCalledOnce()
      expect(mocks.db.commitTransaction).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------
  // Get by ID
  // ---------------------------------------------------------

  describe('getById', () => {
    it('should retrieve a notification by ID', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [mockNotificationRow],
      })

      const result = await getById(1)

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [1])

      expect(result).toEqual({
        ...mockNotification,
        cached_at: mockNotificationRow.cached_at,
      })
    })

    it('should deserialize notification data', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [mockNotificationRow],
      })

      const result = await getById(1)

      expect(result?.data).toEqual(mockNotification.data)
    })

    it('should normalize boolean fields', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [
          {
            ...mockNotificationRow,
            is_read: 1,
            is_dismissed: 1,
          },
        ],
      })

      const result = await getById(1)

      expect(result?.is_read).toBe(true)
      expect(result?.is_dismissed).toBe(true)
    })

    it('should return null when the notification does not exist', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [],
      })

      const result = await getById(999)

      expect(result).toBeNull()
    })

    it('should return null when query values are undefined', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: undefined,
      })

      const result = await getById(999)

      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------
  // Get all
  // ---------------------------------------------------------

  describe('getAll', () => {
    it('should retrieve all cached notifications', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [
          mockNotificationRow,
          {
            ...mockNotificationTwo,
            data: JSON.stringify(mockNotificationTwo.data),
            is_read: 1,
            is_dismissed: 0,
            cached_at: '2026-11-18T08:11:00.000Z',
          },
        ],
      })

      const result = await getAll()

      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created DESC, id DESC'),
      )

      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe(1)
      expect(result[0]?.data).toEqual(mockNotification.data)
      expect(result[1]?.id).toBe(2)
      expect(result[1]?.is_read).toBe(true)
    })

    it('should return an empty array when no notifications exist', async () => {
      const result = await getAll()

      expect(result).toEqual([])
    })

    it('should return an empty array when query values are undefined', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: undefined,
      })

      const result = await getAll()

      expect(result).toEqual([])
    })

    it('should preserve invalid JSON data as a string', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [
          {
            ...mockNotificationRow,
            data: 'invalid-json',
          },
        ],
      })

      const result = await getAll()

      expect(result[0]?.data).toBe('invalid-json')
    })
  })

  // ---------------------------------------------------------
  // Get paginated
  // ---------------------------------------------------------

  describe('getPaginated', () => {
    it('should retrieve paginated notifications', async () => {
      mocks.db.query.mockResolvedValueOnce({
        values: [
          mockNotificationRow,
          {
            ...mockNotificationTwo,
            data: JSON.stringify(mockNotificationTwo.data),
            is_read: 1,
            is_dismissed: 0,
            cached_at: '2026-11-18T08:11:00.000Z',
          },
        ],
      })

      const result = await getPaginated({
        page: 1,
        page_size: 10,
      })

      expect(result.count).toBe(2)
      expect(result.next).toBeNull()
      expect(result.previous).toBeNull()
      expect(result.results).toHaveLength(2)
    })

    it('should filter by notification type', async () => {
      await getPaginated({
        notification_type: 'smartpack',
      })

      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('notification_type = ?'),
        ['smartpack'],
      )
    })

    it('should filter by read status', async () => {
      await getPaginated({
        is_read: false,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('is_read = ?'), [0])
    })

    it('should filter by dismissed status', async () => {
      await getPaginated({
        is_dismissed: true,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('is_dismissed = ?'), [1])
    })

    it('should filter by created date', async () => {
      await getPaginated({
        created: '2026-11-18',
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('created = ?'), [
        '2026-11-18',
      ])
    })

    it('should filter by created greater than', async () => {
      await getPaginated({
        created__gt: '2026-11-17T00:00:00.000Z',
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('created > ?'), [
        '2026-11-17T00:00:00.000Z',
      ])
    })

    it('should filter by created less than', async () => {
      await getPaginated({
        created__lt: '2026-11-19T00:00:00.000Z',
      })

      expect(mocks.db.query).toHaveBeenCalledWith(expect.stringContaining('created < ?'), [
        '2026-11-19T00:00:00.000Z',
      ])
    })

    it.each([
      ['unread_not_dismissed', 0, 0],
      ['read_not_dismissed', 1, 0],
      ['unread_dismissed', 0, 1],
      ['read_dismissed', 1, 1],
    ] as const)('should filter by status: %s', async (status, isRead, isDismissed) => {
      await getPaginated({
        status,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_read = ? AND is_dismissed = ?'),
        [isRead, isDismissed],
      )
    })

    it('should combine multiple filters', async () => {
      await getPaginated({
        notification_type: 'smartpack',
        is_read: false,
        is_dismissed: false,
      })

      expect(mocks.db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_read = ? AND is_dismissed = ? AND notification_type = ?'),
        [0, 0, 'smartpack'],
      )
    })

    it('should return an empty result when no notifications exist', async () => {
      const result = await getPaginated({
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
  })

  // ---------------------------------------------------------
  // Mark as read
  // ---------------------------------------------------------

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      await markAsRead(1)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('SET is_read = 1'),
        [expect.any(String), expect.any(String), 1],
        false,
      )
    })

    it('should use the supplied read timestamp', async () => {
      const readAt = '2026-11-18T09:00:00.000Z'

      await markAsRead(1, readAt)

      expect(mocks.db.run).toHaveBeenCalledWith(expect.any(String), [readAt, readAt, 1], false)
    })
  })

  // ---------------------------------------------------------
  // Mark as unread
  // ---------------------------------------------------------

  describe('markAsUnread', () => {
    it('should mark a notification as unread', async () => {
      await markAsUnread(1)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('SET is_read = 0'),
        [expect.any(String), 1],
        false,
      )
    })

    it('should clear the read timestamp', async () => {
      await markAsUnread(1)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('read_at = NULL'),
        expect.any(Array),
        false,
      )
    })
  })

  // ---------------------------------------------------------
  // Dismiss
  // ---------------------------------------------------------

  describe('dismiss', () => {
    it('should dismiss a notification', async () => {
      await dismiss(1)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('SET is_dismissed = 1'),
        [expect.any(String), expect.any(String), 1],
        false,
      )
    })

    it('should use the supplied dismissal timestamp', async () => {
      const dismissedAt = '2026-11-18T09:30:00.000Z'

      await dismiss(1, dismissedAt)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.any(String),
        [dismissedAt, dismissedAt, 1],
        false,
      )
    })
  })

  // ---------------------------------------------------------
  // Delete by ID
  // ---------------------------------------------------------

  describe('deleteById', () => {
    it('should delete a notification by ID', async () => {
      await deleteById(1)

      expect(mocks.db.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cached_notifications'),
        [1],
        false,
      )

      expect(mocks.db.run.mock.calls[0]?.[0]).toContain('WHERE id = ?')
    })
  })

  // ---------------------------------------------------------
  // Clear
  // ---------------------------------------------------------

  describe('clear', () => {
    it('should delete all cached notifications', async () => {
      await clear()

      expect(mocks.db.run).toHaveBeenCalledWith('DELETE FROM cached_notifications', [], false)
    })
  })
})
