import type { AxiosError } from 'axios'

export interface ApiDetailResponse {
  detail: string
}

export interface Api {
  auth: typeof import('@/api/modules/auth')
  twoFactor: typeof import('@/api/modules/twoFactor')
  users: typeof import('@/api/modules/users')
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PaginationQueryParams {
  page?: number
  page_size?: number
}

export type ItemNotFoundError = AxiosError & {
  reload?: boolean
}
