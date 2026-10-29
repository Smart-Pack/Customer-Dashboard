import apiClient from '@/api/client'
import { NOTIFICATIONS } from '../endpoints'
import type { PaginatedResponse, PaginationQueryParams, ItemNotFoundError } from '@/api/types'

export interface Notification {
  id: number
  notification_type: string
  title: string
  body: string
  url: string
  data: string | Record<string, unknown> | null
  read_at: string | null
  dismissed_at: string | null
  is_read: boolean
  is_dismissed: boolean
  created: string
  updated: string
}

export type NotificationListResult = PaginatedResponse<Notification>

export type NotificationStatus =
  'unread_not_dismissed' | 'read_not_dismissed' | 'unread_dismissed' | 'read_dismissed'

export interface NotificationQueryParams extends PaginationQueryParams {
  created?: string
  created__gt?: string
  created__lt?: string
  is_dismissed?: boolean
  is_read?: boolean
  notification_type?: string
  page_size?: number
  status?: NotificationStatus
  user?: number
}

export interface UpdateNotificationPayload {
  read_at?: string | null
  dismissed_at?: string | null
}

/**
 * Fetches a paginated list of notifications available to the authenticated user.
 *
 * Supports filtering by creation time, read status, dismissal status,
 * notification type, status, and recipient.
 *
 * @param params - Optional filtering and pagination parameters.
 * @returns A promise resolving with the paginated notifications.
 */
export const list = async (params?: NotificationQueryParams): Promise<NotificationListResult> => {
  const url = NOTIFICATIONS.collectionWithQuery(params)
  const response = await apiClient.get<NotificationListResult>(url)

  return response.data
}

/**
 * Retrieves a notification by its ID.
 *
 * @param id - The ID of the notification to retrieve.
 * @returns A promise resolving with the notification.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const getById = async ({ id }: { id: string | number }): Promise<Notification> => {
  try {
    const response = await apiClient.get<Notification>(NOTIFICATIONS.detail(id))

    return response.data
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `Notification with ID ${id} not found. It may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}

/**
 * Updates a notification's read or dismissed timestamp.
 *
 * @param id - The ID of the notification to update.
 * @param payload - The read_at and/or dismissed_at timestamp to update.
 * @returns A promise resolving with the updated notification.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const edit = async (
  id: string | number,
  payload: UpdateNotificationPayload,
): Promise<Notification> => {
  try {
    const response = await apiClient.patch<Notification>(NOTIFICATIONS.detail(id), payload)

    return response.data
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `Notification with ID ${id} not found. It may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}
