import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import LoginView from '../Login.vue'
import AuthCard from '@/components/Base/AuthCard.vue'

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: vi.fn<
    () => {
      loginBtn: string
      logIn: () => Promise<string>
    }
  >(() => ({
    loginBtn: 'Log In',
    logIn: vi.fn<() => Promise<string>>(),
  })),
}))

describe('LoginView', () => {
  it('renders AuthCard with the correct props', () => {
    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthCard: true,
        },
      },
    })

    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.exists()).toBe(true)
    expect(authCard.props('heading')).toBe('Sign In')
    expect(authCard.props('btnText')).toBe('Log In')
    expect(authCard.props('authFn')).toEqual(expect.any(Function))

    expect(authCard.props('formFields')).toEqual([
      {
        key: 'email',
        specificType: 'email',
        label: 'Email Address',
        extraAttrs: {
          autofocus: true,
        },
      },
      {
        key: 'password',
        label: 'Password',
        specificType: 'password',
      },
    ])

    expect(authCard.props('currentRoutes')).toEqual({
      prev: {
        label: 'Forgot Password?',
        name: 'forgot-password',
      },
      next: {
        name: '2fa',
      },
    })
  })
})
