import apiClient from '@/api/client'
import { GROUP_MEMBERS } from '../endpoints'
import type { ApiDetailResponse, PaginatedResponse, PaginationQueryParams } from '@/api/types'
import type { GroupMember } from './groups'

export type GroupMemberListResult = PaginatedResponse<GroupMember>

export interface GroupMemberQueryParams extends PaginationQueryParams {
  group?: number
  role?: 'owner' | 'admin' | 'member'
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
