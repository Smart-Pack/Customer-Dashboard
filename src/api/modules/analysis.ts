import apiClient from '@/api/client'
import { ANALYSIS } from '../endpoints'

export interface AdminGeneralAnalysis {
  users: {
    total: number
    customers: number
    internal: number
  }
  smartpacks: {
    total: number
    assigned: number
    unassigned: number
  }
}

/**
 * Fetches general analysis for the admin dashboard.
 *
 * @returns General user and SmartPack analysis.
 */
export const getAdminGeneralAnalysis = async () => {
  const response = await apiClient.get<AdminGeneralAnalysis>(ANALYSIS.ADMIN_GENERAL)
  return response.data
}
