import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useRoute } from 'vue-router'
import LoginView from '../Login.vue'
import AuthCard from '@/components/Base/AuthCard.vue'
import AuthCardBottomLink from '@/components/Auth/BottomLink.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn<typeof import('vue-router').useRoute>(),
}))

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
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRoute).mockReturnValue({
      query: {},
    } as unknown as ReturnType<typeof useRoute>)
  })

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
    expect(authCard.props('bottomComponent')).toBe(AuthCardBottomLink)
    expect(authCard.props('bottomComponentProps')).toEqual({
      mode: 'signIn',
    })

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

  it('preserves the redirect query when navigating to 2FA', () => {
    const redirect = '/dashboard/groups?token=invitation-token'

    vi.mocked(useRoute).mockReturnValue({
      query: { redirect },
    } as unknown as ReturnType<typeof useRoute>)

    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          AuthCard: true,
        },
      },
    })

    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('currentRoutes')).toEqual({
      prev: {
        label: 'Forgot Password?',
        name: 'forgot-password',
      },
      next: {
        name: '2fa',
        query: { redirect },
      },
    })
  })
})
