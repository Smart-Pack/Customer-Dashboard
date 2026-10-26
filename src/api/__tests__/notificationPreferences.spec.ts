import type { AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import {
  clearSmsPhoneNumber,
  get,
  patch,
  requestSmsOtp,
  verifySmsOtp,
  type NotificationPreferences,
  type PhoneNumberOperationResponse,
  type RequestSmsOtpPayload,
  type UpdateNotificationPreferencesPayload,
  type VerifySmsOtpPayload,
} from '@/api/modules/notificationPreferences'
import { NOTIFICATION_PREFERENCES } from '../endpoints'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    patch: vi.fn<AxiosInstance['patch']>(),
    delete: vi.fn<AxiosInstance['delete']>(),
    post: vi.fn<AxiosInstance['post']>(),
  },
}))

const mockPreferences: NotificationPreferences = {
  id: 1,
  sms_phone_number: '+254712345678',
  whatsapp_phone_number: '+254723456789',
  preferred_general_channel: 'email',
  preferred_smartpack_channel: 'whatsapp',
}

const mockOperationResponse: PhoneNumberOperationResponse = {
  message: 'Operation completed successfully.',
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

  describe('clearSmsPhoneNumber', () => {
    it('clears the authenticated user SMS phone number successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: mockOperationResponse,
      } as never)

      const response = await clearSmsPhoneNumber()

      expect(apiClient.delete).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.SMS.CLEAR)
      expect(apiClient.delete).toHaveBeenCalledTimes(1)
      expect(response).toEqual(mockOperationResponse)
    })

    it('propagates errors when clearing the SMS phone number fails', async () => {
      const error = new Error('Unable to clear SMS phone number')

      vi.mocked(apiClient.delete).mockRejectedValueOnce(error)

      await expect(clearSmsPhoneNumber()).rejects.toBe(error)

      expect(apiClient.delete).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.SMS.CLEAR)
    })
  })

  describe('requestSmsOtp', () => {
    const payload: RequestSmsOtpPayload = {
      sms_phone_number: '+254712345678',
    }

    it('requests an SMS verification OTP successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockOperationResponse,
      } as never)

      const response = await requestSmsOtp(payload)

      expect(apiClient.post).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.SMS.REQUEST_OTP, payload)
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(response).toEqual(mockOperationResponse)
    })

    it('propagates errors when requesting an SMS verification OTP fails', async () => {
      const error = new Error('Unable to send SMS verification OTP')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(requestSmsOtp(payload)).rejects.toBe(error)

      expect(apiClient.post).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.SMS.REQUEST_OTP, payload)
    })
  })

  describe('verifySmsOtp', () => {
    const payload: VerifySmsOtpPayload = {
      otp: '123456',
    }

    it('verifies an SMS OTP and updates the phone number successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockOperationResponse,
      } as never)

      const response = await verifySmsOtp(payload)

      expect(apiClient.post).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.SMS.VERIFY_OTP, payload)
      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(response).toEqual(mockOperationResponse)
    })

    it('propagates errors when SMS OTP verification fails', async () => {
      const error = new Error('Invalid or expired SMS verification OTP')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(verifySmsOtp(payload)).rejects.toBe(error)

      expect(apiClient.post).toHaveBeenCalledWith(NOTIFICATION_PREFERENCES.SMS.VERIFY_OTP, payload)
    })
  })
})
