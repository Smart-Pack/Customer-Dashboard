import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoute, type Router } from 'vue-router'
import { SocialLogin } from '@capgo/capacitor-social-login'
import GoogleSocialLoginButton from '../GoogleSocialLoginButton.vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    login: vi.fn<typeof SocialLogin.login>(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn<typeof import('vue-router').useRoute>(),
}))

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: vi.fn<typeof import('@/stores/modules/auth').useAuthStore>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof import('@/composables/useGlobals').useGlobals>(),
}))

describe('GoogleSocialLoginButton', () => {
  const notifySuccess = vi.fn<(message: string) => Promise<unknown>>()
  const notifyError = vi.fn<(message: string) => Promise<unknown>>()
  const push = vi.fn<Router['push']>()
  const googleLogIn = vi.fn<ReturnType<typeof useAuthStore>['googleLogIn']>()

  const wrapperFactory = () =>
    mount(GoogleSocialLoginButton, {
      global: {
        stubs: {
          GoogleIcon: {
            template: '<span data-testid="google-icon" />',
          },
        },
      },
    })

  const mockOnlineResponse = (idToken = 'google-id-token') => {
    vi.mocked(SocialLogin.login).mockResolvedValue({
      result: {
        responseType: 'online',
        idToken,
      },
    } as Awaited<ReturnType<typeof SocialLogin.login>>)
  }

  const mockOfflineResponse = () => {
    vi.mocked(SocialLogin.login).mockResolvedValue({
      result: {
        responseType: 'offline',
        serverAuthCode: 'google-server-auth-code',
      },
    } as Awaited<ReturnType<typeof SocialLogin.login>>)
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRoute).mockReturnValue({
      query: {},
    } as ReturnType<typeof useRoute>)

    vi.mocked(useGlobals).mockReturnValue({
      $notifySuccess: notifySuccess,
      $notifyError: notifyError,
      $router: {
        push,
      },
    } as unknown as ReturnType<typeof useGlobals>)

    vi.mocked(useAuthStore).mockReturnValue({
      googleLogIn,
    } as unknown as ReturnType<typeof useAuthStore>)

    mockOnlineResponse()
    googleLogIn.mockResolvedValue('Google Sign-In successful.')
  })

  it('renders the Google Sign-In button', () => {
    const wrapper = wrapperFactory()

    expect(wrapper.find('.google-sign-in-button').exists()).toBe(true)
    expect(wrapper.find('[data-testid="google-icon"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sign in with Google')
    expect(wrapper.find('.submit-spinner').exists()).toBe(false)
  })

  it('authenticates successfully and redirects to the dashboard', async () => {
    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(googleLogIn).toHaveBeenCalledExactlyOnceWith('google-id-token')
    })

    expect(SocialLogin.login).toHaveBeenCalledExactlyOnceWith({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
      },
    })

    expect(notifySuccess).toHaveBeenCalledWith('Google Sign-In successful.')
    expect(push).toHaveBeenCalledExactlyOnceWith({ name: 'dashboard' })
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('preserves the redirect query after successful Google Sign-In', async () => {
    const redirect = '/dashboard/groups?token=invitation-token'

    vi.mocked(useRoute).mockReturnValue({
      query: { redirect },
    } as unknown as ReturnType<typeof useRoute>)

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledExactlyOnceWith({
        name: 'dashboard',
        query: { redirect },
      })
    })

    expect(notifySuccess).toHaveBeenCalledWith('Google Sign-In successful.')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('does not preserve a non-string redirect query', async () => {
    vi.mocked(useRoute).mockReturnValue({
      query: {
        redirect: ['/dashboard/groups', '/dashboard/smartpacks'],
      },
    } as unknown as ReturnType<typeof useRoute>)

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledExactlyOnceWith({
        name: 'dashboard',
      })
    })
  })

  it('shows the loading state while authenticating', async () => {
    let resolveLogin!: (value: string) => void

    googleLogIn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve
        }),
    )

    const wrapper = wrapperFactory()
    const button = wrapper.find('.google-sign-in-button')

    await button.trigger('click')

    expect(wrapper.find('.submit-spinner').exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')

    resolveLogin('Google Sign-In successful.')

    await vi.waitFor(() => {
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })

    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBe('false')
  })

  it('shows an error when Google returns an offline authentication response', async () => {
    mockOfflineResponse()

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        'Google Sign-In did not return an online authentication response.',
      )
    })

    expect(googleLogIn).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('shows an error when Google does not return an ID token', async () => {
    mockOnlineResponse('')

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google Sign-In did not return an ID token.')
    })

    expect(googleLogIn).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the store error when backend Google authentication fails', async () => {
    googleLogIn.mockRejectedValue(new Error('Invalid Google credential.'))

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Invalid Google credential.')
    })

    expect(push).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('handles errors when native Google Sign-In fails', async () => {
    vi.mocked(SocialLogin.login).mockRejectedValue(
      new Error('Google authentication was cancelled.'),
    )

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google authentication was cancelled.')
    })

    expect(googleLogIn).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('handles non-Error exceptions', async () => {
    vi.mocked(SocialLogin.login).mockRejectedValue('Unexpected error')

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google Sign-In failed.')
    })

    expect(googleLogIn).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('resets the loading state when authentication fails', async () => {
    vi.mocked(SocialLogin.login).mockRejectedValue(new Error('Google authentication failed.'))

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })

    expect(wrapper.find('.google-sign-in-button').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.google-sign-in-button').attributes('aria-busy')).toBe('false')
  })
})
