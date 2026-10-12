// src/api/__tests__/groupMembers.spec.ts

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosInstance } from 'axios'
import apiClient from '@/api/client'
import { GROUP_MEMBERS } from '../endpoints'
import { leaveGroup, list, sendInvite } from '../modules/groupMembers'
import type { GroupMemberListResult, SendGroupInvitePayload } from '../modules/groupMembers'
import type { GroupMember } from '../modules/groups'
import type { ApiDetailResponse } from '@/api/types'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
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
      detail: 'You have left the group successfully.',
    }

    it('allows the current user to leave a group', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await leaveGroup(membershipId)

      expect(apiClient.post).toHaveBeenCalledWith(GROUP_MEMBERS.leave(membershipId))
      expect(result).toBe('You have left the group successfully.')
    })

    it('supports a string membership ID', async () => {
      const stringMembershipId = '2'

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await leaveGroup(stringMembershipId)

      expect(apiClient.post).toHaveBeenCalledWith(GROUP_MEMBERS.leave(stringMembershipId))
      expect(result).toBe('You have left the group successfully.')
    })

    it('propagates API errors', async () => {
      const error = new Error('Failed to leave group')

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(leaveGroup(membershipId)).rejects.toThrow('Failed to leave group')
    })
  })
})
