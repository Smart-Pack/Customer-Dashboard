import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import GoogleLoginButton from '../GoogleLoginButton.vue'
import { googleLogin } from '@/api/modules/auth'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: vi.fn<typeof import('@/stores/modules/auth').useAuthStore>(),
}))
vi.mock('@/api/modules/auth', () => ({
  googleLogin: vi.fn<typeof import('@/api/modules/auth').googleLogin>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof import('@/composables/useGlobals').useGlobals>(),
}))

describe('GoogleLoginButton', () => {
  const notifySuccess = vi.fn<(message: string) => Promise<unknown>>()
  const notifyError = vi.fn<(message: string) => Promise<unknown>>()
  const push = vi.fn<Router['push']>()
  const fetchUser = vi.fn<ReturnType<typeof useAuthStore>['fetchUser']>()

  const GoogleSignInButtonStub = {
    template: `
      <button
        data-testid="google-sign-in-button"
        :disabled="disabled"
        :aria-busy="ariaBusy"
        @click="$emit('success', { credential: 'google-id-token' })"
      >
        Google Sign-In
      </button>
    `,
    props: {
      disabled: {
        type: Boolean,
        default: false,
      },
      ariaBusy: {
        type: [Boolean, String],
        default: false,
      },
    },
    emits: ['success', 'error'],
  }

  const wrapperFactory = () =>
    mount(GoogleLoginButton, {
      global: {
        stubs: {
          GoogleSignInButton: GoogleSignInButtonStub,
        },
      },
    })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useGlobals).mockReturnValue({
      $notifySuccess: notifySuccess,
      $notifyError: notifyError,
      $router: {
        push,
      },
    } as unknown as ReturnType<typeof useGlobals>)

    vi.mocked(useAuthStore).mockReturnValue({
      fetchUser,
    } as unknown as ReturnType<typeof useAuthStore>)

    vi.mocked(googleLogin).mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
    })
  })

  it('renders the Google Sign-In button', () => {
    const wrapper = wrapperFactory()

    expect(wrapper.find('[data-testid="google-sign-in-button"]').exists()).toBe(true)
    expect(wrapper.find('.submit-spinner').exists()).toBe(false)
  })

  it('authenticates successfully and redirects to the dashboard', async () => {
    const wrapper = wrapperFactory()

    await wrapper.find('[data-testid="google-sign-in-button"]').trigger('click')

    await vi.waitFor(() => {
      expect(googleLogin).toHaveBeenCalledWith({
        credential: 'google-id-token',
      })
    })

    expect(fetchUser).toHaveBeenCalled()
    expect(notifySuccess).toHaveBeenCalledWith('Google Sign-In successful.')
    expect(push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('shows the loading state while authenticating', async () => {
    let resolveLogin: (value: { access: string; refresh: string }) => void

    vi.mocked(googleLogin).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve
        }),
    )

    const wrapper = wrapperFactory()

    await wrapper.find('[data-testid="google-sign-in-button"]').trigger('click')

    expect(wrapper.find('.submit-spinner').exists()).toBe(true)
    expect(
      wrapper.find('[data-testid="google-sign-in-button"]').attributes('disabled'),
    ).toBeDefined()
    expect(wrapper.find('[data-testid="google-sign-in-button"]').attributes('aria-busy')).toBe(
      'true',
    )

    resolveLogin!({
      access: 'access-token',
      refresh: 'refresh-token',
    })

    await vi.waitFor(() => {
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })
  })

  it('shows an error when Google does not return a credential', async () => {
    const wrapper = wrapperFactory()

    await wrapper
      .findComponent(GoogleSignInButtonStub)
      .vm.$emit('success', { credential: undefined })

    expect(googleLogin).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledWith('Google Sign-In did not return a credential.')
  })

  it('shows the API error when Google login fails', async () => {
    vi.mocked(googleLogin).mockRejectedValue(new Error('Invalid Google credential.'))

    const wrapper = wrapperFactory()

    await wrapper.find('[data-testid="google-sign-in-button"]').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Invalid Google credential.')
    })

    expect(fetchUser).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('handles a Google Sign-In error', async () => {
    const wrapper = wrapperFactory()

    await wrapper.findComponent(GoogleSignInButtonStub).vm.$emit('error')

    expect(notifyError).toHaveBeenCalledWith('Google Sign-In failed. Please try again.')
  })
})
