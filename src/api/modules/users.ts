import apiClient from '@/api/client'
import { USERS } from '../endpoints'
import type { AxiosError } from 'axios'
import type { PaginatedResponse, PaginationQueryParams, ItemNotFoundError } from '@/api/types'

export type CreateUserPayload = {
  first_name: string
  last_name: string
  email: string
  phone: string
  profile_pic?: string
  role: 'staff' | 'admin'
  date_of_birth?: string
  gender: 'male' | 'female' | 'other'
}

type UpdatePasswordPayload = {
  current_password: string
  new_password: string
}

type PasswordErrorResponse = {
  current_password?: string[]
  detail?: string
}

export interface User {
  id: number
  unique_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  profile_pic: string | null
  account_type: 'customer' | 'internal'
  role: 'staff' | 'admin'
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other'
  changed_password_after_initial_login: boolean
  created_at: string
  updated_at: string
  two_factor_enabled: boolean
  status: string
  is_active: boolean
}

export type EditUserPayloadBase = {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
}

export type EditMePayload = EditUserPayloadBase & {
  profile_pic?: File
}

export type EditUserPayload = EditUserPayloadBase & {
  role: 'staff' | 'admin'
  is_active: boolean
}

export interface UserListItem {
  id: number
  unique_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  profile_pic: string | null
  account_type: 'customer' | 'internal'
  role: 'staff' | 'admin'
  gender: 'male' | 'female' | 'other'
  status: string
  created_at: string
}

export type UserListResult = PaginatedResponse<UserListItem>

export interface UserQueryParams extends PaginationQueryParams {
  account_type?: 'customer' | 'internal'
  is_active?: boolean
  role?: 'staff' | 'admin'
}

/**
 * Fetches information about the currently authenticated user.
 *
 * @returns The currently authenticated user's information.
 */
export const getMe = async () => {
  const response = await apiClient.get<User>(USERS.ME)
  return response.data
}

/**
 * Updates the authenticated user's password (used after they accept the terms).
 * Marks the initial-password flag as resolved so the user can continue into the dashboard.
 *
 * @param payload - Payload containing the current and new passwords.
 * @returns A promise resolving with a localized success message.
 * @throws The error is re-thrown after annotating messages for incorrect current
 * passwords or other validation failures.
 */
export const initialPassword = ({
  current_password,
  new_password,
}: UpdatePasswordPayload): Promise<string> => {
  const payload: UpdatePasswordPayload = {
    current_password,
    new_password,
  }

  return apiClient
    .post(USERS.INITIAL_PASSWORD, payload)
    .then(() => 'Password Changed successfully.')
    .catch((error: AxiosError<PasswordErrorResponse>) => {
      if (error.response?.status !== 400) {
        throw error
      }

      if (error.response.data?.current_password) {
        error.message = 'Current Password entered is incorrect.'
      }

      throw error
    })
}

/**
 * Updates information about the currently authenticated user.
 *
 * @param payload - The user fields to update.
 * @returns The updated user's information.
 */
export const editMe = async (payload: EditMePayload): Promise<User> => {
  const formData = new FormData()

  formData.append('first_name', payload.first_name)
  formData.append('last_name', payload.last_name)
  formData.append('email', payload.email)
  formData.append('phone', payload.phone.replace(/\s+/g, ''))
  formData.append('date_of_birth', payload.date_of_birth)
  formData.append('gender', payload.gender)

  if (payload.profile_pic) {
    formData.append('profile_pic', payload.profile_pic)
  }

  const headers = { 'Content-Type': 'multipart/form-data' }
  const response = await apiClient.patch<User>(USERS.ME, formData, { headers })

  return response.data
}

/**
 * Sets a new password for the authenticated user.
 *
 * @param payload - The password update payload.
 * @param payload.current_password - The user's current password.
 * @param payload.new_password - The user's new password.
 * @returns A promise that resolves with a success message.
 */
export const setPassword = (payload: UpdatePasswordPayload): Promise<string> => {
  return apiClient.post(USERS.SET_PASSWORD, payload).then(() => 'Password Changed successfully.')
}

/**
 * Creates a new user.
 *
 * @param payload - The user data to create.
 * @param payload.first_name - The user's first name.
 * @param payload.last_name - The user's last name.
 * @param payload.email - The user's email address.
 * @param payload.phone - The user's phone number.
 * @param payload.profile_pic - Optional profile picture URL.
 * @param payload.role - The user's internal role.
 * @param payload.date_of_birth - Optional date of birth.
 * @param payload.gender - The user's gender.
 * @returns A promise resolving with the created user and a success message.
 */
export const add = async (payload: CreateUserPayload): Promise<{ data: User; message: string }> => {
  const response = await apiClient.post<User>(USERS.COLLECTION, {
    ...payload,
    phone: payload.phone.replace(/\s+/g, ''),
  })

  return {
    data: response.data,
    message: `${payload.first_name} ${payload.last_name} Successfully added`,
  }
}

/**
 * Fetches a paginated list of users.
 *
 * @param {UserQueryParams} [params] - Optional query parameters for filtering and pagination.
 * @returns {Promise<UserListResult>} A promise that resolves with the paginated user list.
 */
export const list = async (params?: UserQueryParams): Promise<UserListResult> => {
  const url = USERS.collectionWithQuery(params)
  const response = await apiClient.get<UserListResult>(url)
  return response.data
}

/**
 * Fetches a single user by their ID.
 *
 * @param id - The ID of the user to fetch.
 * @returns A promise resolving with the requested user.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const getById = async ({ id }: { id: string | number }): Promise<User> => {
  try {
    const response = await apiClient.get<User>(USERS.detail(id))
    return response.data
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `User with ID ${id} not found. It may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}

/**
 * Updates an existing user.
 *
 * @param user - The user data to update.
 * @param user.id - The ID of the user.
 * @param user.first_name
 * @param user.last_name
 * @param user.email
 * @param user.phone
 * @param user.role
 * @param user.date_of_birth
 * @param user.gender
 * @param user.is_active
 * @param toggle - When true, toggles the user's active status instead of a regular update.
 * @returns A promise resolving with the updated user and success message.
 * @throws The error is re-thrown after annotating a 404 response.
 */
export const edit = async (
  user: User,
  toggle = false,
): Promise<{ data: User; message: string }> => {
  const { id, ...userData } = user

  let action = 'updated'
  const payload: EditUserPayload = {
    first_name: userData.first_name,
    last_name: userData.last_name,
    email: userData.email,
    phone: userData.phone.replace(/\s+/g, ''),
    role: userData.role,
    date_of_birth: userData.date_of_birth ?? '',
    gender: userData.gender,
    is_active: userData.is_active,
  }

  if (toggle) {
    payload.is_active = !user.is_active
    action = user.is_active ? 'suspended' : 'activated'
  }

  try {
    const response = await apiClient.patch<User>(USERS.detail(id), payload)

    return {
      data: response.data,
      message: `${user.first_name} ${user.last_name} Successfully ${action}`,
    }
  } catch (error) {
    const axiosError = error as ItemNotFoundError

    if (axiosError.response?.status === 404) {
      axiosError.message = `${user.first_name} ${user.last_name} not found. They may have been deleted.`
      axiosError.reload = true
    }

    throw axiosError
  }
}
