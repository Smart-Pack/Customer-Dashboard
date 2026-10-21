import apiClient from '@/api/client'
import { PUSH_SUBSCRIPTIONS } from '../endpoints'
import type { ApiDetailResponse, PaginatedResponse } from '@/api/types'

/**
 * Represents a browser's Web Push subscription.
 */
export interface PushSubscription {
  id: number
  endpoint: string
  subscription_info: PushSubscriptionJSON
  created_at: string
  updated_at: string
}

/**
 * Payload for registering a browser's Web Push subscription.
 */
export interface CreatePushSubscriptionPayload {
  endpoint: string
  subscription_info: PushSubscriptionJSON
}

/**
 * Result of listing Web Push subscriptions.
 */
export type PushSubscriptionListResult = PaginatedResponse<PushSubscription>

/**
 * Registers or updates the authenticated user's browser push subscription.
 *
 * @param payload - The browser-generated push subscription.
 * @returns A promise resolving to the saved subscription.
 */
export const create = async (
  payload: CreatePushSubscriptionPayload,
): Promise<PushSubscription> => {
  const response = await apiClient.post<PushSubscription>(
    PUSH_SUBSCRIPTIONS.COLLECTION,
    payload,
  )

  return response.data
}

/**
 * Fetches the authenticated user's registered browser push subscriptions.
 *
 * @returns A promise resolving to the paginated list of subscriptions.
 */
export const list = async (): Promise<PushSubscriptionListResult> => {
  const response = await apiClient.get<PushSubscriptionListResult>(
    PUSH_SUBSCRIPTIONS.COLLECTION,
  )

  return response.data
}

/**
 * Removes a registered browser push subscription.
 *
 * @param id - The ID of the subscription to remove.
 * @returns A promise resolving to the API response detail message.
 */
export const remove = async (id: string | number): Promise<string> => {
  const response = await apiClient.delete<ApiDetailResponse>(
    PUSH_SUBSCRIPTIONS.detail(id),
  )

  return response.data.detail
}
