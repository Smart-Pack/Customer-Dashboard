import type { AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiClient from '@/api/client'
import { ANALYSIS } from '@/api/endpoints'
import { getAdminGeneralAnalysis, type AdminGeneralAnalysis } from '@/api/modules/analysis'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
  },
}))

describe('Analysis API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAdminGeneralAnalysis', () => {
    it('fetches general admin analysis', async () => {
      const analysis: AdminGeneralAnalysis = {
        users: {
          total: 10,
          customers: 7,
          internal: 3,
        },
        smartpacks: {
          total: 8,
          assigned: 6,
          unassigned: 2,
        },
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: analysis,
      } as never)

      const response = await getAdminGeneralAnalysis()

      expect(apiClient.get).toHaveBeenCalledWith(ANALYSIS.ADMIN_GENERAL)
      expect(response).toEqual(analysis)
    })
  })
})
