import type { AxiosError, AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockUser } from '@/tests/constants'

import apiClient from '@/api/client'
import { SMARTPACKS } from '@/api/endpoints'
import {
  list,
  getById,
  assign,
  unassign,
  type SmartPack,
  type SmartPackListResult,
  type SmartPackQueryParams,
} from '@/api/modules/smartpacks'
import type { ItemNotFoundError } from '@/api/types'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    patch: vi.fn<AxiosInstance['patch']>(),
  },
}))

const mockSmartPack: SmartPack = {
  id: 1,
  device_uid: 'SP-0001',
  hardware_model: 'SP-X1',
  imei: '490154203237518',
  firmware_version: '1.4.2',
  last_seen: '2026-09-18T12:33:13.497Z',
  is_online: true,
  assigned_to: {
    id: mockUser.id,
    uuid: mockUser.unique_id,
    full_name: mockUser.full_name,
    email: mockUser.email,
    phone: mockUser.phone,
  },
  child_name: 'Amara',
  created: '2026-01-05T09:00:00.000Z',
  updated: '2026-09-18T12:33:13.497Z',
}

describe('SmartPacks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('fetches a paginated list of SmartPacks without params', async () => {
      const result: SmartPackListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [mockSmartPack],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const response = await list()

      expect(apiClient.get).toHaveBeenCalledWith(SMARTPACKS.COLLECTION)
      expect(response).toEqual(result)
    })

    it('appends query params as a query string when provided', async () => {
      const result: SmartPackListResult = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: result,
      } as never)

      const params: SmartPackQueryParams = {
        assigned_to: mockUser.id,
        page: 2,
      }

      const response = await list(params)

      expect(apiClient.get).toHaveBeenCalledWith(
        `${SMARTPACKS.COLLECTION}?assigned_to=${mockUser.id}&page=2`,
      )
      expect(response).toEqual(result)
    })
  })

  describe('getById', () => {
    it('fetches a single SmartPack by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockSmartPack,
      } as never)

      const response = await getById({ id: mockSmartPack.id })

      expect(apiClient.get).toHaveBeenCalledWith(SMARTPACKS.detail(mockSmartPack.id))
      expect(response).toEqual(mockSmartPack)
    })

    it('annotates and rethrows a 404 error', async () => {
      const axiosError = {
        response: { status: 404 },
      } as AxiosError

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      await expect(getById({ id: mockSmartPack.id })).rejects.toMatchObject({
        message: `SmartPack with ID ${mockSmartPack.id} not found. It may have been deleted.`,
        reload: true,
      })
    })

    it('rethrows non-404 errors unmodified', async () => {
      const axiosError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as ItemNotFoundError

      vi.mocked(apiClient.get).mockRejectedValueOnce(axiosError)

      await expect(getById({ id: mockSmartPack.id })).rejects.toMatchObject({
        message: 'Internal Server Error',
      })

      await expect(getById({ id: mockSmartPack.id })).rejects.not.toHaveProperty('reload')
    })
  })

  describe('assign', () => {
    it('assigns a SmartPack to a user', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {},
      } as never)

      const payload = { assigned_to: mockUser.id }

      const response = await assign(mockSmartPack.id, payload)

      expect(apiClient.patch).toHaveBeenCalledWith(SMARTPACKS.assign(mockSmartPack.id), payload)
      expect(response).toBe('SmartPack assigned successfully.')
    })
  })

  describe('unassign', () => {
    it('unassigns a SmartPack from its current user', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {},
      } as never)

      const response = await unassign(mockSmartPack.id)

      expect(apiClient.patch).toHaveBeenCalledWith(SMARTPACKS.unassign(mockSmartPack.id))
      expect(response).toBe('SmartPack unassigned successfully.')
    })
  })
})
