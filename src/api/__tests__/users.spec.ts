import type { AxiosError, AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockUser } from '@/tests/constants'

import apiClient from '@/api/client'
import { USERS } from '@/api/endpoints'
import {
  add,
  editMe,
  edit,
  getMe,
  getById,
  initialPassword,
  list,
  registerCustomer,
  setPassword,
  type User,
  type UserListResult,
} from '@/api/modules/users'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn<AxiosInstance['get']>(),
    post: vi.fn<AxiosInstance['post']>(),
    patch: vi.fn<AxiosInstance['patch']>(),
  },
}))

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMe', () => {
    it('fetches the currently authenticated user', async () => {
      const user = mockUser

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: user,
      } as never)

      const response = await getMe()

      expect(apiClient.get).toHaveBeenCalledWith(USERS.ME)
      expect(response).toEqual(user)
    })
  })

  describe('editMe', () => {
    it('updates the currently authenticated user successfully', async () => {
      const payload = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+254712345678',
        date_of_birth: '2000-01-01',
        gender: 'female' as const,
      }

      const updatedUser: User = {
        ...mockUser,
        first_name: 'Jane',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        gender: 'female',
        updated_at: '2026-09-18T12:33:13.497Z',
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedUser,
      } as never)

      const response = await editMe(payload)

      expect(apiClient.patch).toHaveBeenCalledTimes(1)

      const [url, formData] = vi.mocked(apiClient.patch).mock.calls[0]!

      expect(url).toBe(USERS.ME)
      expect(formData).toBeInstanceOf(FormData)

      expect((formData as FormData).get('first_name')).toBe('Jane')
      expect((formData as FormData).get('last_name')).toBe('Doe')
      expect((formData as FormData).get('email')).toBe('jane@example.com')
      expect((formData as FormData).get('phone')).toBe('+254712345678')
      expect((formData as FormData).get('date_of_birth')).toBe('2000-01-01')
      expect((formData as FormData).get('gender')).toBe('female')

      expect(response).toEqual(updatedUser)
    })

    it('includes the profile picture when provided', async () => {
      const profilePic = new File(['image'], 'profile.jpg', {
        type: 'image/jpeg',
      })

      const payload = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+254712345678',
        date_of_birth: '2000-01-01',
        gender: 'female' as const,
        profile_pic: profilePic,
      }

      const updatedUser: User = {
        ...mockUser,
        first_name: 'Jane',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        profile_pic: 'https://example.com/profile.jpg',
        gender: 'female',
        updated_at: '2026-09-18T12:33:13.497Z',
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: updatedUser,
      } as never)

      await editMe(payload)

      const [, formData] = vi.mocked(apiClient.patch).mock.calls[0]!

      expect((formData as FormData).get('profile_pic')).toBe(profilePic)
    })

    it('uses the same endpoint as getMe', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {},
      } as never)

      const payload = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+254712345678',
        date_of_birth: '2000-01-01',
        gender: 'female' as const,
      }

      await editMe(payload)

      expect(apiClient.patch).toHaveBeenCalledWith(USERS.ME, expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    })
  })

  describe('initialPassword', () => {
    it('updates the initial password successfully', async () => {
      const payload = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce({} as never)

      const response = await initialPassword(payload)

      expect(apiClient.post).toHaveBeenCalledWith(USERS.INITIAL_PASSWORD, payload)
      expect(response).toBe('Password Changed successfully.')
    })

    it('sets an appropriate error message when the current password is incorrect', async () => {
      const payload = {
        current_password: 'WrongPassword123!',
        new_password: 'NewPassword123!',
      }

      const error = {
        response: {
          status: 400,
          data: {
            current_password: ['This password is incorrect.'],
          },
        },
        message: 'Request failed with status code 400',
      } as AxiosError<{
        current_password?: string[]
      }>

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(initialPassword(payload)).rejects.toMatchObject({
        message: 'Current Password entered is incorrect.',
      })

      expect(apiClient.post).toHaveBeenCalledWith(USERS.INITIAL_PASSWORD, payload)
    })

    it('rethrows other 400 validation errors without changing the error message', async () => {
      const payload = {
        current_password: 'OldPassword123!',
        new_password: 'weak',
      }

      const error = {
        response: {
          status: 400,
          data: {
            new_password: ['This password is too weak.'],
          },
        },
        message: 'Request failed with status code 400',
      } as AxiosError<{
        current_password?: string[]
        new_password?: string[]
      }>

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(initialPassword(payload)).rejects.toBe(error)

      expect(error.message).toBe('Request failed with status code 400')
    })

    it('rethrows non-400 errors', async () => {
      const payload = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      }

      const error = {
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
        message: 'Request failed with status code 500',
      } as AxiosError

      vi.mocked(apiClient.post).mockRejectedValueOnce(error)

      await expect(initialPassword(payload)).rejects.toBe(error)

      expect(apiClient.post).toHaveBeenCalledWith(USERS.INITIAL_PASSWORD, payload)
    })
  })
  describe('setPassword', () => {
    it('sets a new password for the authenticated user', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {},
      } as never)

      const payload = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      }

      const response = await setPassword(payload)

      expect(apiClient.post).toHaveBeenCalledWith(USERS.SET_PASSWORD, payload)
      expect(response).toBe('Password Changed successfully.')
    })
  })
  describe('add', () => {
    it('creates a new user successfully', async () => {
      const payload = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+254712345678',
        role: 'staff' as const,
        gender: 'female' as const,
        date_of_birth: '2000-01-01',
      }

      const createdUser: User = {
        ...mockUser,
        id: 2,
        first_name: 'Jane',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        gender: 'female',
        changed_password_after_initial_login: false,
        created_at: '2026-09-23T12:33:13.497Z',
        updated_at: '2026-09-23T12:33:13.497Z',
        two_factor_enabled: false,
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: createdUser,
      } as never)

      const response = await add(payload)

      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post).toHaveBeenCalledWith(USERS.COLLECTION, payload)

      expect(response).toEqual({
        data: createdUser,
        message: 'Jane Doe Successfully added',
      })
    })

    it('creates a user without an optional date of birth', async () => {
      const payload = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+254712345678',
        role: 'staff' as const,
        gender: 'male' as const,
      }

      const createdUser: User = {
        ...mockUser,
        id: 3,
        date_of_birth: null,
        changed_password_after_initial_login: false,
        created_at: '2026-09-23T12:33:13.497Z',
        updated_at: '2026-09-23T12:33:13.497Z',
        two_factor_enabled: false,
      }

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: createdUser,
      } as never)

      const response = await add(payload)

      expect(apiClient.post).toHaveBeenCalledWith(USERS.COLLECTION, payload)

      expect(response).toEqual({
        data: createdUser,
        message: 'John Doe Successfully added',
      })
    })
  })
  describe('list', () => {
    it('fetches a paginated list of users', async () => {
      const params = {
        account_type: 'internal' as const,
        is_active: true,
        role: 'staff' as const,
        page: 1,
        page_size: 20,
      }

      const responseData: UserListResult = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            ...mockUser,
            first_name: 'Jane',
            full_name: 'Jane Doe',
            email: 'jane@example.com',
            gender: 'female',
            created_at: '2026-09-23T12:01:29.621Z',
          },
        ],
      }

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: responseData,
      } as never)

      const response = await list(params)

      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(apiClient.get).toHaveBeenCalledWith(USERS.collectionWithQuery(params))
      expect(response).toEqual(responseData)
    })
  })
  describe('getById', () => {
    it('fetches a single user by ID', async () => {
      const id = 1

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockUser,
      })

      const result = await getById({ id })

      expect(apiClient.get).toHaveBeenCalledExactlyOnceWith(USERS.detail(id))
      expect(result).toEqual(mockUser)
    })

    it('throws an error when the user is not found', async () => {
      const id = 999
      const error = {
        response: {
          status: 404,
        },
      } as AxiosError

      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(getById({ id })).rejects.toEqual(
        expect.objectContaining({
          message: `User with ID ${id} not found. It may have been deleted.`,
          reload: true,
        }),
      )
    })

    it('rethrows errors other than 404', async () => {
      const error = new Error('Internal server error')

      vi.mocked(apiClient.get).mockRejectedValueOnce(error)

      await expect(getById({ id: 1 })).rejects.toThrow('Internal server error')
    })
  })
  describe('edit', () => {
    it('updates an existing user', async () => {
      const user = {
        ...mockUser,
        is_active: true,
      }

      const payload = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        date_of_birth: user.date_of_birth ?? '',
        gender: user.gender,
        is_active: user.is_active,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockUser,
      })

      const result = await edit(user)

      expect(apiClient.patch).toHaveBeenCalledExactlyOnceWith(USERS.detail(user.id), payload)

      expect(result).toEqual({
        data: mockUser,
        message: 'John Doe Successfully updated',
      })
    })

    it('suspends an active user when toggled', async () => {
      const user = {
        ...mockUser,
        is_active: true,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockUser,
      })

      const result = await edit(user, true)

      expect(apiClient.patch).toHaveBeenCalledExactlyOnceWith(
        USERS.detail(user.id),
        expect.objectContaining({
          is_active: false,
        }),
      )

      expect(result.message).toBe('John Doe Successfully suspended')
    })

    it('activates an inactive user when toggled', async () => {
      const user = {
        ...mockUser,
        is_active: false,
      }

      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: mockUser,
      })

      const result = await edit(user, true)

      expect(apiClient.patch).toHaveBeenCalledExactlyOnceWith(
        USERS.detail(user.id),
        expect.objectContaining({
          is_active: true,
        }),
      )

      expect(result.message).toBe('John Doe Successfully activated')
    })

    it('throws an error when the user is not found', async () => {
      const user = {
        ...mockUser,
        is_active: true,
      }

      const error = {
        response: { status: 404 },
      } as AxiosError

      vi.mocked(apiClient.patch).mockRejectedValueOnce(error)

      await expect(edit(user)).rejects.toEqual(
        expect.objectContaining({
          message: 'John Doe not found. They may have been deleted.',
          reload: true,
        }),
      )
    })

    it('rethrows errors other than 404', async () => {
      const user = {
        ...mockUser,
        is_active: true,
      }

      const error = new Error('Internal server error')

      vi.mocked(apiClient.patch).mockRejectedValueOnce(error)

      await expect(edit(user)).rejects.toThrow('Internal server error')
    })
  })
  describe('registerCustomer', () => {
    it('registers a new customer successfully', async () => {
      const payload = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+254712345678',
        gender: 'female' as const,
        date_of_birth: '2000-01-01',
      }

      const message =
        'Customer account created successfully. Please check your email for your initial password.'

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          detail: message,
        },
      } as never)

      const response = await registerCustomer(payload)

      expect(apiClient.post).toHaveBeenCalledTimes(1)
      expect(apiClient.post).toHaveBeenCalledWith(USERS.REGISTER, payload)

      expect(response).toEqual({
        message,
      })
    })

    it('registers a customer without an optional date of birth', async () => {
      const payload = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+254712345678',
        gender: 'male' as const,
      }

      const message =
        'Customer account created successfully. Please check your email for your initial password.'

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          detail: message,
        },
      } as never)

      const response = await registerCustomer(payload)

      expect(apiClient.post).toHaveBeenCalledWith(USERS.REGISTER, payload)

      expect(response).toEqual({
        message,
      })
    })
  })
})
