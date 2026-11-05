import type { AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { FCM_DEVICES } from '../endpoints'
import {
  create,
  list,
  remove,
  type CreateFCMDevicePayload,
  type FCMDevice,
  type FCMDeviceListResult,
} from '@/api/modules/fcmDevices'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    post: vi.fn<AxiosInstance['post']>(),
    delete: vi.fn<AxiosInstance['delete']>(),
  },
}))

const mockFCMDevice: FCMDevice = {
  device_id: '550e8400-e29b-41d4-a716-446655440000',
  token: 'mock-firebase-registration-token',
  is_active: true,
  created: '2026-10-20T08:00:00Z',
  updated: '2026-10-20T08:00:00Z',
}

describe('FCM Devices API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('registers an FCM device successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockFCMDevice,
      } as never)

      const payload: CreateFCMDevicePayload = {
        device_id: mockFCMDevice.device_id,
        token: mockFCMDevice.token,
      }

      const response = await create(payload)

      expect(apiClient.post).toHaveBeenCalledWith(FCM_DEVICES.COLLECTION, payload)
      expect(response).toEqual(mockFCMDevice)
    })

    it('propagates an API error when registration fails', async () => {
      const error = new Error('Failed to register FCM device')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(
        create({
          device_id: mockFCMDevice.device_id,
          token: mockFCMDevice.token,
        }),
      ).rejects.toThrow('Failed to register FCM device')
    })
  })

  describe('list', () => {
    it('fetches a paginated list of FCM devices', async () => {
      const result: FCMDeviceListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [mockFCMDevice],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list()

      expect(apiClient.get).toHaveBeenCalledWith(FCM_DEVICES.COLLECTION)
      expect(response).toEqual(result)
    })

    it('fetches FCM devices using query parameters', async () => {
      const params = {
        device_id: mockFCMDevice.device_id,
        page: 1,
      }

      const result: FCMDeviceListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [mockFCMDevice],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list(params)

      expect(apiClient.get).toHaveBeenCalledWith(FCM_DEVICES.collectionWithQuery(params))
      expect(response).toEqual(result)
    })

    it('returns an empty paginated list when no devices exist', async () => {
      const result: FCMDeviceListResult = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list()

      expect(apiClient.get).toHaveBeenCalledWith(FCM_DEVICES.COLLECTION)
      expect(response).toEqual(result)
    })

    it('propagates an API error when fetching devices fails', async () => {
      const error = new Error('Failed to fetch FCM devices')

      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(list()).rejects.toThrow('Failed to fetch FCM devices')
    })
  })

  describe('remove', () => {
    it('removes an FCM device successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: {
          detail: 'FCM device deleted successfully.',
        },
      } as never)

      const response = await remove(mockFCMDevice.device_id)

      expect(apiClient.delete).toHaveBeenCalledWith(FCM_DEVICES.detail(mockFCMDevice.device_id))
      expect(response).toBe('FCM device deleted successfully.')
    })

    it('propagates an API error when removing a device fails', async () => {
      const error = new Error('Failed to remove FCM device')

      vi.mocked(apiClient.delete).mockRejectedValueOnce(error)

      await expect(remove(mockFCMDevice.device_id)).rejects.toThrow('Failed to remove FCM device')
    })
  })
})
