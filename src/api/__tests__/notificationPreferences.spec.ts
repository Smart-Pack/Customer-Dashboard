import type { AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { NOTIFICATION_PREFERENCES } from '../endpoints'
import {
  get,
  patch,
  type NotificationPreferences,
  type UpdateNotificationPreferencesPayload,
} from '@/api/modules/notificationPreferences'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    patch: vi.fn<AxiosInstance['patch']>(),
  },
}))

const mockPreferences: NotificationPreferences = {
  id: 1,
  sms_phone_number: '+254712345678',
  whatsapp_phone_number: '+254723456789',
  preferred_general_channel: 'email',
  preferred_smartpack_channel: 'whatsapp',
}

describe('Notification Preferences API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('fetches the authenticated user notification preferences successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockPreferences,
      } as never)

      const response = await get()

      expect(apiClient.get).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.ME)
      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(response).toEqual(mockPreferences)
    })

    it('propagates errors when fetching notification preferences fails', async () => {
      const error = new Error('Internal Server Error')

      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(get()).rejects.toBe(error)

      expect(apiClient.get).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.ME)
    })
  })

  describe('patch', () => {
    it('updates notification preferences successfully', async () => {
      const payload: UpdateNotificationPreferencesPayload = {
        preferred_general_channel: 'none',
        preferred_smartpack_channel: 'none',
      }

      const updatedPreferences: NotificationPreferences = {
        ...mockPreferences,
        ...payload,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedPreferences,
      } as never)

      const response = await patch(payload)

      expect(apiClient.patch).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.ME, payload)
      expect(apiClient.patch).toHaveBeenCalledTimes(1)
      expect(response).toEqual(updatedPreferences)
    })

    it('updates notification preferences to use email', async () => {
      const payload: UpdateNotificationPreferencesPayload = {
        preferred_general_channel: 'email',
        preferred_smartpack_channel: 'email',
      }

      const updatedPreferences: NotificationPreferences = {
        ...mockPreferences,
        ...payload,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedPreferences,
      } as never)

      const response = await patch(payload)

      expect(apiClient.patch).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.ME, payload)
      expect(response).toEqual(updatedPreferences)
    })

    it('propagates errors when updating notification preferences fails', async () => {
      const payload: UpdateNotificationPreferencesPayload = {
        preferred_general_channel: 'none',
        preferred_smartpack_channel: 'none',
      }

      const error = new Error('Internal Server Error')

      vi.mocked(apiClient.patch).mockRejectedValueOnce(error)

      await expect(patch(payload)).rejects.toBe(error)

      expect(apiClient.patch).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.ME, payload)
    })
  })
})
