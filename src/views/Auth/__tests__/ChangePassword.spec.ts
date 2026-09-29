import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuthCard from '@/components/Base/AuthCard.vue'
import TermsAgreement from '@/components/Auth/TermsAgreement.vue'
import ChangePassword from '@/views/Auth/ChangePassword.vue'

const mocks = vi.hoisted(() => ({
  initialPassword: vi.fn<() => Promise<unknown>>(),
  fetchUser: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/api/modules/users', () => ({
  initialPassword: mocks.initialPassword,
}))

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    fetchUser: mocks.fetchUser,
  }),
}))

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountComponent = () => shallowMount(ChangePassword)

  it('renders the AuthCard', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent(AuthCard).exists()).toBe(true)
  })

  it('passes the correct heading and description', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('heading')).toBe('Finalize Account')
    expect(authCard.props('description')).toBe(
      'Set a new password and accept the terms and conditions so you can access the dashboard.',
    )
  })

  it('passes the correct button text', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('btnText')).toEqual({
      normal: 'CHANGE PASSWORD',
      loading: 'REQUESTING...',
    })
  })

  it('passes the password form fields', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('formFields')).toMatchObject([
      {
        key: 'current_password',
        specificType: 'password',
        errorLabel: 'Current Password',
        label: 'Current Password',
        placeholder: 'Current Password',
      },
      {
        key: 'new_password',
        specificType: 'password',
        errorLabel: 'Password',
        label: 'New Password',
      },
      {
        key: 'confirm_password',
        specificType: 'password',
        errorLabel: 'Confirmation Password',
        label: 'Confirm Password',
        placeholder: 'Confirm Password',
      },
      {
        key: 'has_accepted',
        type: 'checkbox',
        label: '',
        extraAttrs: {
          inputClass: '!h-1 invisible',
        },
      },
    ])
  })

  it('passes the correct navigation routes', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('currentRoutes')).toEqual({
      prev: { label: 'Back to login', name: 'login' },
      next: { name: 'dashboard' },
    })
  })

  it('passes the initial password function', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('authFn')).toBe(mocks.initialPassword)
  })

  it('passes the custom password validator', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('customValidator')).toEqual(expect.any(Function))
  })

  it('passes the user update function as the next-route resolver', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('resolveNextRoute')).toEqual(expect.any(Function))
  })

  it('does not render TermsAgreement initially', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent(TermsAgreement).exists()).toBe(false)
  })

  it('emits change-size true when mounted', () => {
    const wrapper = mountComponent()

    expect(wrapper.emitted('change-size')).toEqual([[true]])
  })

  it('emits change-size false when unmounted', () => {
    const wrapper = mountComponent()

    expect(wrapper.emitted('change-size')).toEqual([[true]])

    wrapper.unmount()

    expect(wrapper.emitted('change-size')).toEqual([[false]])
  })

  it('returns false and sets an error when passwords do not match', async () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    const customValidator = authCard.props('customValidator') as (
      values: {
        new_password: string
        confirm_password: string
      },
      setErrorField: (field: string, message: string) => void,
    ) => Promise<boolean>

    const setErrorField = vi.fn<(field: string, message: string) => void>()

    const result = await customValidator(
      {
        new_password: 'Password123!',
        confirm_password: 'DifferentPassword123!',
      },
      setErrorField,
    )

    expect(result).toBe(false)

    expect(setErrorField).toHaveBeenCalledWith(
      'confirm_password',
      'Confirmation password does not match',
    )

    expect(wrapper.findComponent(TermsAgreement).exists()).toBe(false)
  })

  it('opens TermsAgreement when passwords match but terms have not been accepted', async () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    const customValidator = authCard.props('customValidator') as (
      values: {
        new_password: string
        confirm_password: string
      },
      setErrorField: (field: string, message: string) => void,
    ) => Promise<boolean>

    const setErrorField = vi.fn<(field: string, message: string) => void>()

    const validationPromise = customValidator(
      {
        new_password: 'Password123!',
        confirm_password: 'Password123!',
      },
      setErrorField,
    )

    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(TermsAgreement).exists()).toBe(true)

    expect(setErrorField).not.toHaveBeenCalled()

    expect(validationPromise).toBeInstanceOf(Promise)
  })

  it('returns true when terms are accepted', async () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    const customValidator = authCard.props('customValidator') as (
      values: {
        new_password: string
        confirm_password: string
      },
      setErrorField: (field: string, message: string) => void,
    ) => Promise<boolean>

    const setErrorField = vi.fn<(field: string, message: string) => void>()

    const validationPromise = customValidator(
      {
        new_password: 'Password123!',
        confirm_password: 'Password123!',
      },
      setErrorField,
    )

    await wrapper.vm.$nextTick()

    const termsAgreement = wrapper.findComponent(TermsAgreement)

    expect(termsAgreement.exists()).toBe(true)

    termsAgreement.vm.$emit('confirmed', true)

    const result = await validationPromise

    expect(result).toBe(true)
    expect(setErrorField).toHaveBeenCalledWith('has_accepted', '')
    expect(wrapper.findComponent(TermsAgreement).exists()).toBe(false)
  })

  it('returns false and sets an error when terms are rejected', async () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    const customValidator = authCard.props('customValidator') as (
      values: {
        new_password: string
        confirm_password: string
      },
      setErrorField: (field: string, message: string) => void,
    ) => Promise<boolean>

    const setErrorField = vi.fn<(field: string, message: string) => void>()

    const validationPromise = customValidator(
      {
        new_password: 'Password123!',
        confirm_password: 'Password123!',
      },
      setErrorField,
    )

    await wrapper.vm.$nextTick()

    const termsAgreement = wrapper.findComponent(TermsAgreement)

    termsAgreement.vm.$emit('confirmed', false)

    const result = await validationPromise

    expect(result).toBe(false)

    expect(setErrorField).toHaveBeenCalledWith(
      'has_accepted',
      'Must Agree to terms and conditions to proceed',
    )

    expect(wrapper.findComponent(TermsAgreement).exists()).toBe(false)
  })

  it('updates the user after successful password change', async () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    const resolveNextRoute = authCard.props('resolveNextRoute') as () => Promise<boolean>

    mocks.fetchUser.mockResolvedValue(undefined)

    const result = await resolveNextRoute()

    expect(result).toBe(true)
    expect(mocks.fetchUser).toHaveBeenCalledTimes(1)
  })
})
