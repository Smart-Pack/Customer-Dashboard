import apiClient from '@/api/client'
import { GROUPS } from '../endpoints'
import type {
  ApiDetailResponse,
  PaginatedResponse,
  PaginationQueryParams,
  ItemNotFoundError,
} from '@/api/types'

export interface CreateGroupPayload {
  name: string
}

export interface Group {
  id: number
  name: string
  total_users: number
  total_smartpacks: number
  created: string
  updated: string
}

export interface GroupMemberUser {
  id: number
  uuid: string
  full_name: string
  email: string
  phone: string
}

export interface GroupMember {
  id: number
  user: GroupMemberUser
  role: 'owner' | 'admin' | 'member'
  created: string
  updated: string
}

export interface GroupSmartPack {
  id: number
  device_uid: string
  hardware_model: string
  child_name: string
}

export interface GroupDetail {
  id: number
  name: string
  members: GroupMember[]
  smartpacks: GroupSmartPack[]
  created: string
  updated: string
}

export type GroupListResult = PaginatedResponse<Group>

export interface GroupQueryParams extends PaginationQueryParams {
  member?: number
  owner?: number
  role?: 'owner' | 'admin' | 'member'
  has_admin_access?: boolean
}

/**
 * Creates a new group.
 *
 * @param payload - The group data to create.
 * @param payload.name - The name of the group.
 * @returns A promise resolving with the created group and a success message.
 */
export const add = async (
  payload: CreateGroupPayload,
): Promise<{ data: Group; message: string }> => {
  const response = await apiClient.post<Group>(GROUPS.COLLECTION, payload)

  return {
    data: response.data,
    message: `Group "${payload.name}" successfully created.`,
  }
}

/**
 * Fetches a paginated list of groups available to the authenticated user.
 *
 * Customers can view groups where they are members, while internal admins
 * can view all groups.
 *
 * @param params - Optional query parameters for filtering and pagination.
 * @param params.member - Filter groups by member user ID.
 * @param params.owner - Filter groups by owner user ID.
 * @param params.has_admin_access - Filter groups by the current user's group role.
 * @returns A promise resolving with the paginated list of groups.
 */
export const list = async (params?: GroupQueryParams): Promise<GroupListResult> => {
  const url = GROUPS.collectionWithQuery(params)
  const response = await apiClient.get<GroupListResult>(url)

  return response.data
}

/**
 * Fetches a single group by its ID.
 *
 * @param id - The ID of the group to fetch.
 * @returns A promise resolving with the requested group and its members and SmartPacks.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const getById = async ({ id }: { id: string | number }): Promise<GroupDetail> => {
  try {
    const response = await apiClient.get<GroupDetail>(GROUPS.detail(id))
    return response.data
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `Group with ID ${id} not found. It may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}

/**
 * Deletes a group by its ID.
 *
 * @param id - The ID of the group to delete.
 * @returns A promise resolving with the response detail message.
 */
export const remove = async (id: string | number): Promise<string> => {
  const response = await apiClient.delete<ApiDetailResponse>(GROUPS.detail(id))

  return response.data.detail
}

/**
 * Updates an existing group.
 *
 * @param id - The ID of the group to update.
 * @param payload - The updated group data.
 * @returns A promise resolving with the updated group detail and a success message.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const edit = async (
  id: string | number,
  payload: CreateGroupPayload,
): Promise<{ data: GroupDetail; message: string }> => {
  try {
    const response = await apiClient.patch<GroupDetail>(GROUPS.detail(id), payload)

    return {
      data: response.data,
      message: `Group "${response.data.name}" successfully updated.`,
    }
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `Group with ID ${id} not found. It may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}
