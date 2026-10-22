import type { AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { PUSH_SUBSCRIPTIONS } from '../endpoints'
import {
  create,
  list,
  remove,
  type CreatePushSubscriptionPayload,
  type PushSubscription,
  type PushSubscriptionListResult,
} from '@/api/modules/pushSubscriptions'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    post: vi.fn<AxiosInstance['post']>(),
    delete: vi.fn<AxiosInstance['delete']>(),
  },
}))

const mockPushSubscription: PushSubscription = {
  id: 1,
  endpoint: 'https://push.example.com/subscription/123',
  subscription_info: {
    endpoint: 'https://push.example.com/subscription/123',
    expirationTime: null,
    keys: {
      p256dh: 'mock-p256dh-key',
      auth: 'mock-auth-key',
    },
  },
  created: '2026-10-20T08:00:00Z',
  updated: '2026-10-20T08:00:00Z',
}

describe('Push Subscriptions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('registers a browser push subscription successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockPushSubscription,
      } as never)

      const payload: CreatePushSubscriptionPayload = {
        endpoint: mockPushSubscription.endpoint,
        subscription_info: mockPushSubscription.subscription_info,
      }

      const response = await create(payload)

      expect(apiClient.post).toHaveBeenCalledWith(PUSH_SUBSCRIPTIONS.COLLECTION, payload)
      expect(response).toEqual(mockPushSubscription)
    })

    it('propagates an API error when registration fails', async () => {
      const error = new Error('Failed to register push subscription')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(
        create({
          endpoint: mockPushSubscription.endpoint,
          subscription_info: mockPushSubscription.subscription_info,
        }),
      ).rejects.toThrow('Failed to register push subscription')
    })
  })

  describe('list', () => {
    it('fetches a paginated list of push subscriptions', async () => {
      const result: PushSubscriptionListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [mockPushSubscription],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list()

      expect(apiClient.get).toHaveBeenCalledWith(PUSH_SUBSCRIPTIONS.COLLECTION)
      expect(response).toEqual(result)
    })

    it('returns an empty paginated list when no subscriptions exist', async () => {
      const result: PushSubscriptionListResult = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list()

      expect(apiClient.get).toHaveBeenCalledWith(PUSH_SUBSCRIPTIONS.COLLECTION)
      expect(response).toEqual(result)
    })

    it('propagates an API error when fetching subscriptions fails', async () => {
      const error = new Error('Failed to fetch push subscriptions')

      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(list()).rejects.toThrow('Failed to fetch push subscriptions')
    })
  })

  describe('remove', () => {
    it('removes a push subscription successfully using a numeric ID', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: {
          detail: 'Push subscription deleted successfully.',
        },
      } as never)

      const response = await remove(mockPushSubscription.id)

      expect(apiClient.delete).toHaveBeenCalledWith(
        PUSH_SUBSCRIPTIONS.detail(mockPushSubscription.id),
      )
      expect(response).toBe('Push subscription deleted successfully.')
    })

    it('removes a push subscription successfully using a string ID', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: {
          detail: 'Push subscription deleted successfully.',
        },
      } as never)

      const response = await remove(String(mockPushSubscription.id))

      expect(apiClient.delete).toHaveBeenCalledWith(
        PUSH_SUBSCRIPTIONS.detail(String(mockPushSubscription.id)),
      )
      expect(response).toBe('Push subscription deleted successfully.')
    })

    it('propagates an API error when removing a subscription fails', async () => {
      const error = new Error('Failed to remove push subscription')

      vi.mocked(apiClient.delete).mockRejectedValueOnce(error)

      await expect(remove(mockPushSubscription.id)).rejects.toThrow(
        'Failed to remove push subscription',
      )
    })
  })
})
