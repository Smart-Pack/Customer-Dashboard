import apiClient from '@/api/client'
import { GROUP_MEMBERS } from '../endpoints'
import type {
  ApiDetailResponse,
  ItemNotFoundError,
  PaginatedResponse,
  PaginationQueryParams,
} from '@/api/types'
import type { GroupMember } from './groups'

export type GroupMemberListResult = PaginatedResponse<GroupMember>

export interface GroupMemberQueryParams extends PaginationQueryParams {
  group?: number
  has_admin_access?: boolean
  role?: 'owner' | 'admin' | 'member'
}

/**
 * Payload for updating a group member's role.
 */
export interface UpdateGroupMemberPayload {
  role: 'owner' | 'admin' | 'member'
}

export interface UpdateGroupMemberResponse {
  data: GroupMember
  message: string
}
/**
 * Fetches a paginated list of group members.
 *
 * @param params - Optional query parameters for filtering and pagination.
 * @param params.group - Filter members by group ID.
 * @param params.role - Filter members by group role.
 * @returns A promise resolving with the paginated list of group members.
 */
export const list = async (params?: GroupMemberQueryParams): Promise<GroupMemberListResult> => {
  const url = GROUP_MEMBERS.collectionWithQuery(params)
  const response = await apiClient.get<GroupMemberListResult>(url)

  return response.data
}

/**
 * Payload for inviting a user to a group.
 */
export interface SendGroupInvitePayload {
  email: string
  role: 'owner' | 'admin' | 'member'
}

/**
 * Sends an invitation to a user to join a group.
 *
 * Only group owners and administrators can send invitations.
 *
 * @param groupId - The ID of the group to invite the user to.
 * @param payload - The invitation details.
 * @param payload.email - The email address of the invited user.
 * @param payload.role - The role assigned to the invited user.
 * @returns A promise resolving with the API response detail message.
 */
export const sendInvite = async (
  groupId: string | number,
  payload: SendGroupInvitePayload,
): Promise<string> => {
  const response = await apiClient.post<ApiDetailResponse>(
    GROUP_MEMBERS.sendInvite(groupId),
    payload,
  )

  return response.data.detail
}

/**
 * Allows the current user to leave a group.
 *
 * @param id - The ID of the group membership to leave.
 * @returns A promise resolving with the API response detail message.
 */
export const leaveGroup = async (id: string | number): Promise<string> => {
  const response = await apiClient.delete<ApiDetailResponse>(GROUP_MEMBERS.leave(id))

  return response.data.detail
}

/**
 * Removes a user from a group.
 *
 * @param id - The ID of the group membership to remove.
 * @returns A promise resolving with the API response message.
 */
export const removeGroupMember = async (id: string | number): Promise<string> => {
  const response = await apiClient.delete<ApiDetailResponse>(GROUP_MEMBERS.detail(id))

  return response.data.detail
}

/**
 * Payload for updating a group member's role.
 */
export interface UpdateGroupMemberPayload {
  role: 'owner' | 'admin' | 'member'
}

/**
 * Updates a group member's role.
 *
 * @param id - The ID of the group membership to update.
 * @param payload - The updated group member details.
 * @returns A promise resolving with the API response detail message.
 * @throws An error if the membership is not found or the request fails.
 */

export const edit = async (
  id: string | number,
  payload: UpdateGroupMemberPayload,
): Promise<UpdateGroupMemberResponse> => {
  try {
    const response = await apiClient.patch<GroupMember>(GROUP_MEMBERS.detail(id), payload)

    return {
      data: response.data,
      message: `${response.data.user.full_name}'s role updated to ${response.data.role === 'admin' ? 'Administrator' : 'Member'} successfully.`,
    }
  } catch (error: unknown) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = 'Group member not found. They may have been deleted.'
      axiosError.reload = true
    }

    throw axiosError
  }
}
