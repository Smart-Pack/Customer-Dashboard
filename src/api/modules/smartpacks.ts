import apiClient from '@/api/client'
import { SMARTPACKS } from '../endpoints'
import type { ItemNotFoundError, PaginatedResponse, PaginationQueryParams } from '@/api/types'

export interface SmartPackAssignedUser {
  id: number
  uuid: string
  full_name: string
  email: string
  phone: string
}

export interface SmartPack {
  id: number
  device_uid: string
  hardware_model: string
  imei: string
  firmware_version: string
  last_seen: string
  is_online: boolean
  assigned_to: SmartPackAssignedUser | null
  child_name: string
  created: string
  updated: string
}

export type SmartPackListItem = SmartPack

export interface SmartPackQueryParams extends PaginationQueryParams {
  assigned_to?: number
  is_assigned?: boolean
}

export type SmartPackListResult = PaginatedResponse<SmartPackListItem>

export type AssignSmartPackPayload = {
  assigned_to: number
}

/**
 * Fetches a paginated list of SmartPacks.
 *
 * @param {SmartPackQueryParams} [params] - Optional query parameters for filtering and pagination.
 * @returns A promise resolving with the paginated SmartPack list.
 */
export const list = async (params?: SmartPackQueryParams): Promise<SmartPackListResult> => {
  let url: string = SMARTPACKS.COLLECTION

  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    )

    url = `${url}?${query.toString()}`
  }

  const response = await apiClient.get<SmartPackListResult>(url)

  return response.data
}

/**
 * Fetches a single SmartPack by its ID.
 *
 * @param id - The ID of the SmartPack to fetch.
 * @returns A promise resolving with the requested SmartPack.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const getById = async ({ id }: { id: string | number }): Promise<SmartPack> => {
  try {
    const response = await apiClient.get<SmartPack>(SMARTPACKS.detail(id))
    return response.data
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `SmartPack with ID ${id} not found. It may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}

/**
 * Assigns a SmartPack to a customer.
 *
 * @param id - The ID of the SmartPack to assign.
 * @param payload - The customer assignment payload.
 * @returns A promise resolving with a success message.
 */
export const assign = async (
  id: string | number,
  payload: AssignSmartPackPayload,
): Promise<string> => {
  await apiClient.patch(SMARTPACKS.assign(id), payload)

  return 'SmartPack assigned successfully.'
}

/**
 * Unassigns a SmartPack from its current customer.
 *
 * @param id - The ID of the SmartPack to unassign.
 * @returns A promise resolving with a success message.
 */
export const unassign = async (id: string | number): Promise<string> => {
  await apiClient.patch(SMARTPACKS.unassign(id))

  return 'SmartPack unassigned successfully.'
}
