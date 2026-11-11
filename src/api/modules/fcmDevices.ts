import apiClient from '@/api/client'
import { FCM_DEVICES } from '../endpoints'
import type { ApiDetailResponse, PaginatedResponse, PaginationQueryParams } from '@/api/types'

/**
 * Represents a registered Firebase Cloud Messaging device.
 */
export interface FCMDevice {
  id: number
  device_id: string
  token: string
  is_active: boolean
  created: string
  updated: string
}

/**
 * Payload for registering or updating an FCM device.
 */
export interface CreateFCMDevicePayload {
  device_id: string
  token: string
}

/**
 * Query parameters for listing FCM devices.
 */
export interface FCMDeviceQueryParams extends PaginationQueryParams {
  device_id?: string
}

/**
 * Result of listing registered FCM devices.
 */
export type FCMDeviceListResult = PaginatedResponse<FCMDevice>

/**
 * Registers or updates the authenticated user's FCM device.
 *
 * @param payload - The device UUID and Firebase registration token.
 * @returns A promise resolving to the saved device registration.
 */
export const create = async (payload: CreateFCMDevicePayload): Promise<FCMDevice> => {
  const response = await apiClient.post<FCMDevice>(FCM_DEVICES.COLLECTION, payload)

  return response.data
}

/**
 * Fetches the authenticated user's registered FCM devices.
 *
 * @param params - Optional query parameters for filtering and pagination.
 * @param params.device_id - Filter devices by their unique installation UUID.
 * @returns A promise resolving to the paginated list of devices.
 */
export const list = async (params?: FCMDeviceQueryParams): Promise<FCMDeviceListResult> => {
  const url = FCM_DEVICES.collectionWithQuery(params)
  const response = await apiClient.get<FCMDeviceListResult>(url)

  return response.data
}

/**
 * Removes a registered FCM device.
 *
 * @param deviceId - The persistent UUID identifying the app installation.
 * @returns A promise resolving to the API response detail message.
 */
export const remove = async (deviceId: string): Promise<string> => {
  const response = await apiClient.delete<ApiDetailResponse>(FCM_DEVICES.detail(deviceId))

  return response.data.detail
}
