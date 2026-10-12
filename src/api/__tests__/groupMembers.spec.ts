// src/api/__tests__/groupMembers.spec.ts

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosInstance } from 'axios'
import apiClient from '@/api/client'
import { GROUP_MEMBERS } from '../endpoints'
import {
  edit,
  leaveGroup,
  list,
  removeGroupMember,
  sendInvite,
  verifyInvite,
} from '../modules/groupMembers'
import type {
  GroupMemberListResult,
  SendGroupInvitePayload,
  UpdateGroupMemberPayload,
  VerifyInvitePayload,
  VerifyInviteResponse,
} from '../modules/groupMembers'
import type { GroupMember } from '../modules/groups'
import type { ApiDetailResponse } from '@/api/types'

vi.mock('@/api/client', () => ({
  default: {
    delete: vi.fn<AxiosInstance['delete']>(),
    get: vi.fn<AxiosInstance['get']>(),
    patch: vi.fn<AxiosInstance['patch']>(),
    post: vi.fn<AxiosInstance['post']>(),
  },
}))

const mockGroupMembers: GroupMember[] = [
  {
    id: 1,
    user: {
      id: 1,
      uuid: '7b9f3c21-84d6-4a17-b2e8-51c7d9036f42',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+254712345678',
    },
    role: 'owner',
    created: '2026-10-01T08:00:00Z',
    updated: '2026-10-01T08:00:00Z',
  },
  {
    id: 2,
    user: {
      id: 2,
      uuid: '8c0a4d32-95e7-4b28-a3f9-62d8e0147a53',
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+254723456789',
    },
    role: 'member',
    created: '2026-10-01T09:00:00Z',
    updated: '2026-10-01T09:00:00Z',
  },
]

const mockGroupMemberList: GroupMemberListResult = {
  count: mockGroupMembers.length,
  next: null,
  previous: null,
  results: mockGroupMembers,
}

describe('groupMembers API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('fetches group members without query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockGroupMemberList,
      })

      const result = await list()

      expect(apiClient.get).toHaveBeenCalledWith(GROUP_MEMBERS.collectionWithQuery(undefined))
      expect(result).toEqual(mockGroupMemberList)
    })

    it('fetches group members with query parameters', async () => {
      const params = {
        page: 2,
        page_size: 10,
        group: 1,
        role: 'admin',
      } as const

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockGroupMemberList,
      })

      const result = await list(params)

      expect(apiClient.get).toHaveBeenCalledWith(GROUP_MEMBERS.collectionWithQuery(params))
      expect(result).toEqual(mockGroupMemberList)
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to fetch group members')

      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(list()).rejects.toThrow('Failed to fetch group members')
    })
  })

  describe('sendInvite', () => {
    const groupId = 1

    const payload: SendGroupInvitePayload = {
      email: 'jane@example.com',
      role: 'member',
    }

    const mockResponse: ApiDetailResponse = {
      detail: 'Invitation sent successfully.',
    }

    it('sends an invitation to a group member', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await sendInvite(groupId, payload)

      expect(apiClient.post).toHaveBeenCalledWith(GROUP_MEMBERS.sendInvite(groupId), payload)
      expect(result).toBe('Invitation sent successfully.')
    })

    it('supports a string group ID', async () => {
      const stringGroupId = '1'

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await sendInvite(stringGroupId, payload)

      expect(apiClient.post).toHaveBeenCalledWith(GROUP_MEMBERS.sendInvite(stringGroupId), payload)
      expect(result).toBe('Invitation sent successfully.')
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to send group invitation')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(sendInvite(groupId, payload)).rejects.toThrow('Failed to send group invitation')
    })
  })

  describe('leaveGroup', () => {
    const membershipId = 2

    const mockResponse: ApiDetailResponse = {
      detail: 'You have left the group "Family Group" successfully.',
    }

    it('allows the current user to leave a group', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await leaveGroup(membershipId)

      expect(apiClient.delete).toHaveBeenCalledExactlyOnceWith(GROUP_MEMBERS.leave(membershipId))
      expect(result).toBe('You have left the group "Family Group" successfully.')
    })

    it('supports a string membership ID', async () => {
      const stringMembershipId = '2'

      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await leaveGroup(stringMembershipId)

      expect(apiClient.delete).toHaveBeenCalledExactlyOnceWith(
        GROUP_MEMBERS.leave(stringMembershipId),
      )
      expect(result).toBe('You have left the group "Family Group" successfully.')
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to leave group')

      vi.mocked(apiClient.delete).mockRejectedValueOnce(error)

      await expect(leaveGroup(membershipId)).rejects.toThrow('Failed to leave group')
    })
  })

  describe('removeGroupMember', () => {
    const membershipId = 2

    const mockResponse: ApiDetailResponse = {
      detail: 'Group member removed successfully.',
    }

    it('removes a user from a group', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: mockResponse })

      const result = await removeGroupMember(membershipId)

      expect(apiClient.delete).toHaveBeenCalledExactlyOnceWith(GROUP_MEMBERS.detail(membershipId))
      expect(result).toBe('Group member removed successfully.')
    })

    it('supports a string membership ID', async () => {
      const stringMembershipId = '2'

      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: mockResponse })

      const result = await removeGroupMember(stringMembershipId)

      expect(apiClient.delete).toHaveBeenCalledExactlyOnceWith(
        GROUP_MEMBERS.detail(stringMembershipId),
      )
      expect(result).toBe('Group member removed successfully.')
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to remove group member')

      vi.mocked(apiClient.delete).mockRejectedValueOnce(error)

      await expect(removeGroupMember(membershipId)).rejects.toThrow('Failed to remove group member')
    })
  })

  describe('edit', () => {
    const membershipId = 2

    const payload: UpdateGroupMemberPayload = {
      role: 'admin',
    }

    const mockMember: GroupMember = {
      id: membershipId,
      user: {
        id: 10,
        uuid: '7b9f3c21-84d6-4a17-b2e8-51c7d9036f42',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '0712345678',
      },
      role: 'admin',
      created: '2026-10-01T10:00:00Z',
      updated: '2026-10-12T10:00:00Z',
    }

    const expectedMessage = "John Doe's role updated to Administrator successfully."

    it("updates a group member's role", async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockMember,
      })

      const result = await edit(membershipId, payload)

      expect(apiClient.patch).toHaveBeenCalledExactlyOnceWith(
        GROUP_MEMBERS.detail(membershipId),
        payload,
      )

      expect(result).toEqual({
        data: mockMember,
        message: expectedMessage,
      })
    })

    it('supports a string membership ID', async () => {
      const stringMembershipId = '2'

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockMember,
      })

      const result = await edit(stringMembershipId, payload)

      expect(apiClient.patch).toHaveBeenCalledExactlyOnceWith(
        GROUP_MEMBERS.detail(stringMembershipId),
        payload,
      )

      expect(result).toEqual({
        data: mockMember,
        message: expectedMessage,
      })
    })

    it('sets an error message and reload flag when the membership is not found', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not found',
      }

      vi.mocked(apiClient.patch).mockRejectedValueOnce(error)

      await expect(edit(membershipId, payload)).rejects.toMatchObject({
        message: 'Group member not found. They may have been deleted.',
        reload: true,
      })
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to update group member')

      vi.mocked(apiClient.patch).mockRejectedValueOnce(error)

      await expect(edit(membershipId, payload)).rejects.toThrow('Failed to update group member')
    })
  })
  describe('verifyInvite', () => {
    const payload: VerifyInvitePayload = {
      token: 'valid-invitation-token',
    }

    const mockInvitation: VerifyInviteResponse = {
      id: 1,
      group: {
        id: 10,
        name: 'SmartPack Team',
      },
      email: 'john.doe@example.com',
      role: 'member',
      invited_by: {
        id: 2,
        uuid: '7b9f3c21-84d6-4a17-b2e8-51c7d9036f42',
        full_name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+254712345678',
      },
      expires_at: '2026-10-19T10:00:00Z',
      is_expired: false,
    }

    it('verifies a group invitation', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockInvitation,
      })

      const result = await verifyInvite(payload)

      expect(apiClient.post).toHaveBeenCalledExactlyOnceWith(GROUP_MEMBERS.verifyInvite, payload)

      expect(result).toEqual(mockInvitation)
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to verify group invitation')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(verifyInvite(payload)).rejects.toThrow('Failed to verify group invitation')
    })
  })
})
