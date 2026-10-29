import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/client'
import { NOTIFICATIONS } from '@/api/endpoints'
import type { ItemNotFoundError } from '@/api/types'
import { edit, getById, list } from '../modules/notifications'
import type {
  Notification,
  NotificationListResult,
  UpdateNotificationPayload,
} from '../modules/notifications'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    patch: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
}))

const mockNotification: Notification = {
  id: 1,
  notification_type: 'general',
  title: 'Test notification',
  body: 'This is a test notification.',
  url: '/dashboard',
  data: {},
  read_at: null,
  dismissed_at: null,
  is_read: false,
  is_dismissed: false,
  created: '2026-10-26T10:00:00Z',
  updated: '2026-10-26T10:00:00Z',
}

const mockPaginatedResponse: NotificationListResult = {
  count: 1,
  next: null,
  previous: null,
  results: [mockNotification],
}

const createApiError = (status: number): ItemNotFoundError =>
  Object.assign(new Error('Request failed'), {
    response: { status },
  }) as ItemNotFoundError

describe('notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('fetches notifications without query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockPaginatedResponse,
      })

      const result = await list()

      expect(apiClient.get).toHaveBeenCalledWith(NOTIFICATIONS.COLLECTION)
      expect(result).toEqual(mockPaginatedResponse)
    })

    it('fetches notifications with query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockPaginatedResponse,
      })

      const params = {
        page: 2,
        page_size: 10,
        is_read: false,
        is_dismissed: false,
        status: 'unread_not_dismissed' as const,
        notification_type: 'general',
      }

      const result = await list(params)

      const expectedUrl = NOTIFICATIONS.collectionWithQuery(params)

      expect(apiClient.get).toHaveBeenCalledWith(expectedUrl)

      const parsedUrl = new URL(expectedUrl, 'http://localhost')
      expect(parsedUrl.searchParams.get('page')).toBe('2')
      expect(parsedUrl.searchParams.get('page_size')).toBe('10')
      expect(parsedUrl.searchParams.get('is_read')).toBe('false')
      expect(parsedUrl.searchParams.get('is_dismissed')).toBe('false')
      expect(parsedUrl.searchParams.get('status')).toBe('unread_not_dismissed')
      expect(parsedUrl.searchParams.get('notification_type')).toBe('general')
      expect(result).toEqual(mockPaginatedResponse)
    })

    it('propagates errors when the request fails', async () => {
      const error = new Error('Network error')
      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(list()).rejects.toThrow('Network error')
    })
  })

  describe('getById', () => {
    it('fetches a notification by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockNotification,
      })

      const result = await getById({ id: 1 })

      expect(apiClient.get).toHaveBeenCalledWith(NOTIFICATIONS.detail(1))
      expect(result).toEqual(mockNotification)
    })

    it('supports string IDs', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockNotification,
      })

      await getById({ id: '1' })

      expect(apiClient.get).toHaveBeenCalledWith(NOTIFICATIONS.detail('1'))
    })

    it('sets a helpful message and reload flag when the notification is not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(createApiError(404))

      await expect(getById({ id: 99 })).rejects.toMatchObject({
        message: 'Notification with ID 99 not found. It may have been deleted.',
        reload: true,
        response: { status: 404 },
      })
    })

    it('propagates errors other than 404', async () => {
      const error = createApiError(500)
      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(getById({ id: 1 })).rejects.toBe(error)
    })
  })

  describe('edit', () => {
    it('updates a notification', async () => {
      const payload: UpdateNotificationPayload = {
        read_at: '2026-10-26T11:00:00Z',
      }

      const updatedNotification: Notification = {
        ...mockNotification,
        read_at: payload.read_at ?? null,
        is_read: true,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedNotification,
      })

      const result = await edit(1, payload)

      expect(apiClient.patch).toHaveBeenCalledWith(NOTIFICATIONS.detail(1), payload)
      expect(result).toEqual(updatedNotification)
    })

    it('supports dismissing a notification', async () => {
      const payload: UpdateNotificationPayload = {
        dismissed_at: '2026-10-26T11:00:00Z',
      }

      const updatedNotification: Notification = {
        ...mockNotification,
        dismissed_at: payload.dismissed_at ?? null,
        is_dismissed: true,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedNotification,
      })

      const result = await edit(1, payload)

      expect(apiClient.patch).toHaveBeenCalledWith(NOTIFICATIONS.detail(1), payload)
      expect(result).toEqual(updatedNotification)
    })

    it('allows clearing notification timestamps', async () => {
      const payload: UpdateNotificationPayload = {
        read_at: null,
        dismissed_at: null,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockNotification,
      })

      await edit(1, payload)

      expect(apiClient.patch).toHaveBeenCalledWith(NOTIFICATIONS.detail(1), payload)
    })

    it('sets a helpful message and reload flag when the notification is not found', async () => {
      vi.mocked(apiClient.patch).mockRejectedValueOnce(createApiError(404))

      await expect(edit(99, { read_at: '2026-10-26T11:00:00Z' })).rejects.toMatchObject({
        message: 'Notification with ID 99 not found. It may have been deleted.',
        reload: true,
        response: { status: 404 },
      })
    })

    it('propagates errors other than 404', async () => {
      const error = createApiError(500)
      vi.mocked(apiClient.patch).mockRejectedValueOnce(error)

      await expect(edit(1, { read_at: null })).rejects.toBe(error)
    })
  })
})
