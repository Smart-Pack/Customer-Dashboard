import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ResetPassword from '@/views/Auth/ResetPassword.vue'
import AuthCard from '@/components/Base/AuthCard.vue'

describe('ResetPassword', () => {
  const mountComponent = () =>
    shallowMount(ResetPassword, {
      global: {
        mocks: {
          $route: {
            query: {
              uid: 'MQ',
              token: 'reset-token',
            },
          },
        },
      },
    })

  it('renders the AuthCard', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent(AuthCard).exists()).toBe(true)
  })

  it('configures the AuthCard correctly', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('heading')).toBe('Reset Password')
    expect(authCard.props('btnText')).toEqual({
      normal: 'RESET PASSWORD',
      loading: 'REQUESTING...',
    })
    expect(authCard.props('authFn')).toEqual(expect.any(Function))
    expect(authCard.props('customValidator')).toEqual(expect.any(Function))
  })

  it('configures the form fields correctly', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('formFields')).toEqual([
      {
        key: 'new_password',
        specificType: 'password',
        errorLabel: 'Password',
        label: 'New Password',
        extraAttrs: { ref: 'new_password' },
      },
      {
        key: 'confirm_password',
        specificType: 'password',
        errorLabel: 'Confirmation Password',
        label: 'Confirm Password',
        placeholder: 'Confirm Password',
      },
    ])
  })

  it('configures the current routes correctly', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('currentRoutes')).toEqual({
      prev: { label: 'Back to login', name: 'login' },
      next: { name: 'login' },
    })
  })

  it('passes the reset link parameters to AuthCard', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('extraParams')).toEqual({
      uid: 'MQ',
      token: 'reset-token',
    })
  })

  it('returns true when passwords match', () => {
    const wrapper = mountComponent()
    const setErrorField = vi.fn<(field: string, message: string) => void>()

    const result = wrapper.vm.ensurePasswordsMatch(
      {
        uid: 'MQ',
        token: 'reset-token',
        new_password: 'Password123!',
        confirm_password: 'Password123!',
      },
      setErrorField,
    )

    expect(result).toBe(true)
    expect(setErrorField).not.toHaveBeenCalled()
  })

  it('sets an error and returns false when passwords do not match', () => {
    const wrapper = mountComponent()
    const setErrorField = vi.fn<(field: string, message: string) => void>()

    const result = wrapper.vm.ensurePasswordsMatch(
      {
        uid: 'MQ',
        token: 'reset-token',
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
  })

  it('uses empty strings when reset link parameters are missing', () => {
    const wrapper = shallowMount(ResetPassword, {
      global: {
        mocks: {
          $route: {
            query: {},
          },
        },
      },
    })

    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('extraParams')).toEqual({
      uid: '',
      token: '',
    })
  })
})
