import apiClient from '@/api/client'
import { NOTIFICATION_PREFERENCES } from '../endpoints'

export type NotificationChannel = 'none' | 'sms' | 'whatsapp' | 'email'

export interface NotificationPreferences {
  id: number
  sms_phone_number: string
  whatsapp_phone_number: string
  preferred_general_channel: NotificationChannel
  preferred_smartpack_channel: NotificationChannel
}

export interface UpdateNotificationPreferencesPayload {
  preferred_general_channel?: NotificationChannel
  preferred_smartpack_channel?: NotificationChannel
}

/**
 * Fetches the authenticated user's notification preferences.
 *
 * Retrieves the preferred notification channels and configured phone numbers
 * for general and SmartPack notifications.
 *
 * @returns A promise resolving with the user's notification preferences.
 */
export const get = async (): Promise<NotificationPreferences> => {
  const response = await apiClient.get<NotificationPreferences>(NOTIFICATION_PREFERENCES.ME)

  return response.data
}

/**
 * Updates the authenticated user's notification preferences.
 *
 * SMS and WhatsApp require their corresponding phone numbers to be configured.
 * Phone numbers are managed through the appropriate phone verification endpoints.
 *
 * @param payload - The notification preference fields to update.
 * @param payload.preferred_general_channel - The preferred channel for general notifications.
 * @param payload.preferred_smartpack_channel - The preferred channel for SmartPack notifications.
 * @returns A promise resolving with the updated notification preferences.
 */
export const patch = async (
  payload: UpdateNotificationPreferencesPayload,
): Promise<NotificationPreferences> => {
  const response = await apiClient.patch<NotificationPreferences>(
    NOTIFICATION_PREFERENCES.ME,
    payload,
  )

  return response.data
}
