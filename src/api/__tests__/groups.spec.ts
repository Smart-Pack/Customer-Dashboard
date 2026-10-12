import type { AxiosError, AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { GROUPS } from '../endpoints'
import {
  add,
  list,
  getById,
  remove,
  edit,
  type CreateGroupPayload,
  type Group,
  type GroupDetail,
  type GroupListResult,
  type GroupQueryParams,
} from '@/api/modules/groups'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    post: vi.fn<AxiosInstance['post']>(),
    patch: vi.fn<AxiosInstance['patch']>(),
    delete: vi.fn<AxiosInstance['delete']>(),
  },
}))

const mockGroup: Group = {
  id: 1,
  name: 'SmartPack Family',
  total_users: 2,
  total_smartpacks: 1,
  created: '2026-10-01T08:00:00Z',
  updated: '2026-10-02T08:00:00Z',
}

const mockGroupDetail: GroupDetail = {
  id: 1,
  name: 'SmartPack Family',
  members: [
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
  ],
  smartpacks: [
    {
      id: 1,
      device_uid: 'SP-001',
      hardware_model: 'SmartPack V1',
      child_name: 'Zuri',
    },
  ],
  created: '2026-10-01T08:00:00Z',
  updated: '2026-10-02T08:00:00Z',
}

describe('Groups API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('add', () => {
    it('creates a new group successfully', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockGroup,
      } as never)

      const payload: CreateGroupPayload = {
        name: mockGroup.name,
      }

      const response = await add(payload)

      expect(apiClient.post).toHaveBeenCalledWith(GROUPS.COLLECTION, payload)
      expect(response).toEqual({
        data: mockGroup,
        message: `Group "${payload.name}" successfully created.`,
      })
    })
  })

  describe('list', () => {
    it('fetches a paginated list of groups without params', async () => {
      const result: GroupListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [mockGroup],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list()

      expect(apiClient.get).toHaveBeenCalledWith(GROUPS.collectionWithQuery(undefined))
      expect(response).toEqual(result)
    })

    it('fetches groups with query params', async () => {
      const result: GroupListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [mockGroup],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const params: GroupQueryParams = {
        member: 1,
        owner: 1,
        has_admin_access: true,
        page: 2,
      }

      const response = await list(params)

      expect(apiClient.get).toHaveBeenCalledWith(GROUPS.collectionWithQuery(params))
      expect(response).toEqual(result)
    })
  })

  describe('getById', () => {
    it('fetches a single group by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockGroupDetail,
      } as never)

      const response = await getById({ id: mockGroupDetail.id })

      expect(apiClient.get).toHaveBeenCalledWith(GROUPS.detail(mockGroupDetail.id))
      expect(response).toEqual(mockGroupDetail)
    })

    it('annotates and rethrows a 404 error', async () => {
      const axiosError = {
        response: { status: 404 },
        message: 'Not Found',
      } as AxiosError

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      await expect(getById({ id: mockGroup.id })).rejects.toMatchObject({
        message: `Group with ID ${mockGroup.id} not found. It may have been deleted.`,
        reload: true,
      })
    })

    it('rethrows non-404 errors without modifying the error message', async () => {
      const axiosError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as AxiosError

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      await expect(getById({ id: mockGroup.id })).rejects.toMatchObject({
        message: 'Internal Server Error',
      })

      expect(axiosError).not.toHaveProperty('reload')
    })
  })

  describe('remove', () => {
    it('deletes a group successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: {
          detail: 'Group deleted successfully.',
        },
      } as never)

      const response = await remove(mockGroup.id)

      expect(apiClient.delete).toHaveBeenCalledWith(GROUPS.detail(mockGroup.id))
      expect(response).toBe('Group deleted successfully.')
    })
  })

  describe('edit', () => {
    it('updates an existing group successfully', async () => {
      const updatedGroup: GroupDetail = {
        ...mockGroupDetail,
        name: 'Updated SmartPack Family',
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedGroup,
      } as never)

      const payload: CreateGroupPayload = {
        name: updatedGroup.name,
      }

      const response = await edit(mockGroup.id, payload)

      expect(apiClient.patch).toHaveBeenCalledWith(GROUPS.detail(mockGroup.id), payload)
      expect(response).toEqual({
        data: updatedGroup,
        message: `Group "${updatedGroup.name}" successfully updated.`,
      })
    })

    it('annotates and rethrows a 404 error', async () => {
      const axiosError = {
        response: { status: 404 },
        message: 'Not Found',
      } as AxiosError

      vi.mocked(apiClient.patch).mockRejectedValueOnce(axiosError)

      await expect(edit(mockGroup.id, { name: 'Updated SmartPack Family' })).rejects.toMatchObject({
        message: `Group with ID ${mockGroup.id} not found. It may have been deleted.`,
        reload: true,
      })
    })

    it('rethrows non-404 errors without modifying the error message', async () => {
      const axiosError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as AxiosError

      vi.mocked(apiClient.patch).mockRejectedValueOnce(axiosError)

      await expect(edit(mockGroup.id, { name: 'Updated SmartPack Family' })).rejects.toMatchObject({
        message: 'Internal Server Error',
      })

      expect(axiosError).not.toHaveProperty('reload')
    })
  })
})
