import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { decodeCredential, type DecodedGoogleUser } from 'vue3-google-signin'
import GoogleSocialSignupButton, { type GoogleUser } from '../GoogleSocialSignupButton.vue'
import { useGlobals } from '@/composables/useGlobals'

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    login: vi.fn<typeof SocialLogin.login>(),
  },
}))

vi.mock('vue3-google-signin', () => ({
  decodeCredential: vi.fn<(credential: string) => DecodedGoogleUser>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof useGlobals>(),
}))

describe('GoogleSocialSignupButton', () => {
  const notifyError = vi.fn<(message: string) => Promise<unknown>>()
  const push = vi.fn<ReturnType<typeof useGlobals>['$router']['push']>()

  const googleUser: GoogleUser = {
    email: 'trevor@example.com',
    email_verified: true,
    given_name: 'Trevor',
    family_name: 'Muriuki',
    name: 'Trevor Muriuki',
    picture: 'https://example.com/profile.jpg',
    id: 'google-user-id',
  }

  const decodedGoogleUser: DecodedGoogleUser = {
    email: 'trevor@example.com',
    email_verified: true,
    given_name: 'Trevor',
    family_name: 'Muriuki',
    name: 'Trevor Muriuki',
    picture: 'https://example.com/profile.jpg',
    id: 'google-user-id',
    hd: '',
    iat: 1759222800,
    exp: 1759226400,
  }

  const GoogleSignupModalStub = {
    name: 'GoogleSignupModal',
    props: {
      credential: {
        type: String,
        required: true,
      },
      googleUser: {
        type: Object,
        required: true,
      },
    },
    template: `
      <div data-testid="google-signup-modal">
        <button data-testid="modal-close" @click="$emit('close')">
          Close
        </button>
        <button data-testid="modal-success" @click="$emit('success')">
          Success
        </button>
      </div>
    `,
  }

  const wrapperFactory = () =>
    mount(GoogleSocialSignupButton, {
      global: {
        stubs: {
          GoogleIcon: {
            template: '<span data-testid="google-icon" />',
          },
          GoogleSignupModal: GoogleSignupModalStub,
        },
      },
    })

  const mockOnlineResponse = (idToken = 'google-credential') => {
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

    mockOnlineResponse()

    vi.mocked(useGlobals).mockReturnValue({
      $notifyError: notifyError,
      $router: {
        push,
      },
    } as unknown as ReturnType<typeof useGlobals>)

    vi.mocked(decodeCredential).mockReturnValue(decodedGoogleUser)
  })

  it('renders the native Google signup button without the registration modal', () => {
    const wrapper = wrapperFactory()

    expect(wrapper.find('.google-sign-in-button').exists()).toBe(true)
    expect(wrapper.find('[data-testid="google-icon"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sign up with Google')
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(wrapper.find('.submit-spinner').exists()).toBe(false)
  })

  it('authenticates with Google and opens the registration modal', async () => {
    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(decodeCredential).toHaveBeenCalledWith('google-credential')
    })

    expect(SocialLogin.login).toHaveBeenCalledExactlyOnceWith({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
      },
    })

    const modal = wrapper.findComponent({
      name: 'GoogleSignupModal',
    })

    expect(modal.exists()).toBe(true)
    expect(modal.props('credential')).toBe('google-credential')
    expect(modal.props('googleUser')).toMatchObject(googleUser)

    expect(notifyError).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the loading state while native Google authentication is processing', async () => {
    let resolveLogin!: (value: Awaited<ReturnType<typeof SocialLogin.login>>) => void

    vi.mocked(SocialLogin.login).mockImplementation(
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

    resolveLogin({
      result: {
        responseType: 'online',
        idToken: 'google-credential',
      },
    } as Awaited<ReturnType<typeof SocialLogin.login>>)

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
        'Google Sign-Up did not return an online authentication response.',
      )
    })

    expect(decodeCredential).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows an error when Google does not return an ID token', async () => {
    mockOnlineResponse('')

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google Sign-Up did not return an ID token.')
    })

    expect(decodeCredential).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
  })

  it('shows an error when the decoded Google profile has no email', async () => {
    vi.mocked(decodeCredential).mockReturnValue({
      ...decodedGoogleUser,
      email: '',
    })

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google Sign-Up did not return an email address.')
    })

    expect(decodeCredential).toHaveBeenCalledWith('google-credential')
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('closes the registration modal when cancelled', async () => {
    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(true)
    })

    await wrapper.find('[data-testid="modal-close"]').trigger('click')

    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('redirects to login after successful registration', async () => {
    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(true)
    })

    await wrapper.find('[data-testid="modal-success"]').trigger('click')

    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).toHaveBeenCalledExactlyOnceWith({ name: 'login' })
  })

  it('clears the Google signup state after successful registration', async () => {
    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(true)
    })

    const modal = wrapper.findComponent({
      name: 'GoogleSignupModal',
    })

    expect(modal.props('credential')).toBe('google-credential')
    expect(modal.props('googleUser')).toMatchObject(googleUser)

    await wrapper.find('[data-testid="modal-success"]').trigger('click')

    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })

  it('handles native Google authentication failures', async () => {
    vi.mocked(SocialLogin.login).mockRejectedValue(
      new Error('Google authentication was cancelled.'),
    )

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google authentication was cancelled.')
    })

    expect(decodeCredential).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('handles non-Error exceptions during authentication', async () => {
    vi.mocked(SocialLogin.login).mockRejectedValue('Unexpected error')

    const wrapper = wrapperFactory()

    await wrapper.find('.google-sign-in-button').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Google Sign-Up failed.')
    })

    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
  })

  it('resets the loading state when authentication fails', async () => {
    vi.mocked(SocialLogin.login).mockRejectedValue(new Error('Google authentication failed.'))

    const wrapper = wrapperFactory()
    const button = wrapper.find('.google-sign-in-button')

    await button.trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })

    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBe('false')
  })
})
