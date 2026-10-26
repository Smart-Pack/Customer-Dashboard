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

export interface RequestSmsOtpPayload {
  sms_phone_number: string
}

export interface VerifySmsOtpPayload {
  otp: string
}

export interface PhoneNumberOperationResponse {
  message: string
}

/**
 * Fetches the authenticated user's notification preferences.
 *
 * @returns The user's notification preferences.
 */
export const get = async (): Promise<NotificationPreferences> => {
  const response = await apiClient.get<NotificationPreferences>(NOTIFICATION_PREFERENCES.ME)

  return response.data
}

/**
 * Updates the authenticated user's notification preferences.
 *
 * Phone numbers are managed through their respective verification endpoints.
 *
 * @param payload - The notification channel preferences to update.
 * @returns The updated notification preferences.
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

/**
 * Clears the authenticated user's SMS phone number.
 *
 * The operation fails if either general or SmartPack notifications
 * currently use SMS.
 *
 * @returns The API response message.
 */
export const clearSmsPhoneNumber = async (): Promise<PhoneNumberOperationResponse> => {
  const response = await apiClient.delete<PhoneNumberOperationResponse>(
    NOTIFICATION_PREFERENCES.SMS.CLEAR,
  )

  return response.data
}

/**
 * Requests an OTP to verify a new SMS phone number.
 *
 * The submitted number must differ from the currently linked SMS number.
 *
 * @param payload - The new phone number to verify.
 * @returns The API response message.
 */
export const requestSmsOtp = async (
  payload: RequestSmsOtpPayload,
): Promise<PhoneNumberOperationResponse> => {
  const response = await apiClient.post<PhoneNumberOperationResponse>(
    NOTIFICATION_PREFERENCES.SMS.REQUEST_OTP,
    payload,
  )

  return response.data
}

/**
 * Verifies an OTP and updates the authenticated user's SMS phone number.
 *
 * @param payload - The new phone number and its verification OTP.
 * @returns The API response message.
 */
export const verifySmsOtp = async (
  payload: VerifySmsOtpPayload,
): Promise<PhoneNumberOperationResponse> => {
  const response = await apiClient.post<PhoneNumberOperationResponse>(
    NOTIFICATION_PREFERENCES.SMS.VERIFY_OTP,
    payload,
  )

  return response.data
}
