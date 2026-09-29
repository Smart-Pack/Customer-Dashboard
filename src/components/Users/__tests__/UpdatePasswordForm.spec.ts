import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentPublicInstance } from 'vue'

import UpdatePasswordForm from '@/components/Users/UpdatePasswordForm.vue'
import { setPassword, type User } from '@/api/modules/users'

vi.mock('@/api/modules/users', () => ({
  setPassword:
    vi.fn<(payload: { current_password: string; new_password: string }) => Promise<string>>(),
}))

const mockNotifySuccess = vi.hoisted(() => vi.fn<(message: string) => void>())
const mockNotifyError = vi.hoisted(() => vi.fn<(message: string) => void>())
const mockSetFieldError = vi.hoisted(() => vi.fn<(field: string, message: string) => void>())
const mockResetForm = vi.hoisted(() =>
  vi.fn<(options?: { values?: Record<string, string> }) => void>(),
)
const mockFormValues = vi.hoisted(() => ({
  current_password: 'CurrentPassword123!',
  new_password: 'NewPassword123!',
  confirm_password: 'NewPassword123!',
}))
const mockSubmitCallback = vi.hoisted(() => ({
  value: null as ((values: typeof mockFormValues) => Promise<void>) | null,
}))

const mockAuthStore = vi.hoisted(() => ({
  loggedInUser: {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+254712345678',
    profile_pic: null,
    account_type: 'customer' as const,
    role: 'staff' as const,
    date_of_birth: '2000-01-01',
    gender: 'male' as const,
    changed_password_after_initial_login: false,
    created_at: '2026-09-15T12:33:13.497Z',
    updated_at: '2026-09-15T12:33:13.497Z',
    two_factor_enabled: true,
    status: 'active',
  },
  setLoggedInUser: vi.fn<(user: User) => void>(),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mockNotifySuccess,
    $notifyError: mockNotifyError,
  }),
}))

vi.mock('vee-validate', () => ({
  useForm: vi.fn<
    () => {
      handleSubmit: (
        callback: (values: typeof mockFormValues) => Promise<void>,
      ) => () => Promise<void>
      resetForm: typeof mockResetForm
      setFieldError: typeof mockSetFieldError
    }
  >(() => ({
    handleSubmit: (callback: (values: typeof mockFormValues) => Promise<void>) => {
      mockSubmitCallback.value = callback

      return () => callback(mockFormValues)
    },
    resetForm: mockResetForm,
    setFieldError: mockSetFieldError,
  })),
}))
vi.mock('@/components/Base/InputField.vue', () => ({
  default: {
    name: 'InputField',
    props: ['modelValue', 'name', 'specificType', 'placeholder', 'errorLabel', 'autofocus'],
    emits: ['update:modelValue'],
    template: '<input :name="name" />',
  },
}))

describe('UpdatePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const wrapperFactory = (): VueWrapper<ComponentPublicInstance> => mount(UpdatePasswordForm)

  describe('rendering', () => {
    it('renders the password fields', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.find('input[name="current_password"]').exists()).toBe(true)
      expect(wrapper.find('input[name="new_password"]').exists()).toBe(true)
      expect(wrapper.find('input[name="confirm_password"]').exists()).toBe(true)
    })

    it('renders the update password button', () => {
      const wrapper = wrapperFactory()

      expect(wrapper.text()).toContain('Update Password')
    })
  })

  describe('password update', () => {
    it('updates the password successfully', async () => {
      vi.mocked(setPassword).mockResolvedValueOnce('Password Changed successfully.')

      const wrapper = wrapperFactory()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(setPassword).toHaveBeenCalledWith({
        current_password: 'CurrentPassword123!',
        new_password: 'NewPassword123!',
      })

      expect(mockAuthStore.setLoggedInUser).toHaveBeenCalledWith(
        expect.objectContaining({
          changed_password_after_initial_login: true,
        }),
      )

      expect(mockNotifySuccess).toHaveBeenCalledWith('Password updated successfully.')
    })

    it('updates the authenticated user password-change state', async () => {
      vi.mocked(setPassword).mockResolvedValueOnce('Password Changed successfully.')

      const wrapper = wrapperFactory()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthStore.setLoggedInUser).toHaveBeenCalledWith({
        ...mockAuthStore.loggedInUser,
        changed_password_after_initial_login: true,
      })
    })
  })

  describe('password confirmation', () => {
    it('sets an error when passwords do not match', async () => {
      wrapperFactory()

      await mockSubmitCallback.value!({
        current_password: 'CurrentPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'DifferentPassword123!',
      })

      expect(mockSetFieldError).toHaveBeenCalledWith(
        'confirm_password',
        'Confirmation Password does not match',
      )

      expect(setPassword).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('shows an API error notification when the password update fails', async () => {
      vi.mocked(setPassword).mockRejectedValueOnce(new Error('Current password is incorrect.'))

      wrapperFactory()

      await mockSubmitCallback.value!({
        current_password: 'CurrentPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!',
      })

      expect(setPassword).toHaveBeenCalledWith({
        current_password: 'CurrentPassword123!',
        new_password: 'NewPassword123!',
      })

      expect(mockNotifyError).toHaveBeenCalledWith('Current password is incorrect.')
    })

    it('shows a default error when an unknown error is thrown', async () => {
      vi.mocked(setPassword).mockRejectedValueOnce('unknown error')

      wrapperFactory()

      await mockSubmitCallback.value!({
        current_password: 'CurrentPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!',
      })

      expect(setPassword).toHaveBeenCalledWith({
        current_password: 'CurrentPassword123!',
        new_password: 'NewPassword123!',
      })

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to update your password.')
    })
  })
})
