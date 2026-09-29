import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ForgotPassword from '@/views/Auth/ForgotPassword.vue'
import type { ForgotPasswordRequest } from '@/api/modules/auth'
import AuthCard from '@/components/Base/AuthCard.vue'

describe('ForgotPassword', () => {
  const forgotPassword = vi.fn<(data: ForgotPasswordRequest) => Promise<string>>()

  const mountComponent = () =>
    shallowMount(ForgotPassword, {
      global: {
        mocks: {
          $api: {
            auth: {
              forgotPassword,
            },
          },
        },
      },
    })

  it('renders the AuthCard', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent(AuthCard).exists()).toBe(true)
  })

  it('passes the correct heading and description', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('heading')).toBe('Forgot Password?')
    expect(authCard.props('description')).toBe('Enter your email to reset your password.')
  })

  it('passes the correct button text', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('btnText')).toEqual({
      normal: 'RESET PASSWORD',
      loading: 'REQUESTING...',
    })
  })

  it('passes the email form field configuration', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('formFields')).toEqual([
      {
        key: 'email',
        specificType: 'email',
        label: 'Email Address',
        extraAttrs: { autofocus: true },
      },
    ])
  })

  it('passes the correct navigation routes', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('currentRoutes')).toEqual({
      prev: { label: 'Back to Login', name: 'login' },
      next: { name: 'login' },
    })
  })

  it('passes the forgot password API function', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('authFn')).toEqual(expect.any(Function))
  })
})
