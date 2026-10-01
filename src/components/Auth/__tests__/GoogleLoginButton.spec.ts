import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import GoogleLoginButton from '../GoogleLoginButton.vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: vi.fn<typeof import('@/stores/modules/auth').useAuthStore>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof import('@/composables/useGlobals').useGlobals>(),
}))

describe('GoogleLoginButton', () => {
  const notifySuccess = vi.fn<(message: string) => Promise<unknown>>()
  const notifyError = vi.fn<(message: string) => Promise<unknown>>()
  const push = vi.fn<Router['push']>()
  const googleLogIn = vi.fn<ReturnType<typeof useAuthStore>['googleLogIn']>()

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
      googleLogIn,
    } as unknown as ReturnType<typeof useAuthStore>)

    googleLogIn.mockResolvedValue('Google Sign-In successful.')
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
      expect(googleLogIn).toHaveBeenCalledExactlyOnceWith('google-id-token')
    })

    expect(notifySuccess).toHaveBeenCalledWith('Google Sign-In successful.')
    expect(push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('shows the loading state while authenticating', async () => {
    let resolveLogin: (value: string) => void

    googleLogIn.mockImplementation(
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

    resolveLogin!('Google Sign-In successful.')

    await vi.waitFor(() => {
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })
  })

  it('shows an error when Google does not return a credential', async () => {
    const wrapper = wrapperFactory()

    await wrapper
      .findComponent(GoogleSignInButtonStub)
      .vm.$emit('success', { credential: undefined })

    expect(googleLogIn).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledWith('Google Sign-In did not return a credential.')
  })

  it('shows the store error when Google login fails', async () => {
    googleLogIn.mockRejectedValue(new Error('Invalid Google credential.'))

    const wrapper = wrapperFactory()

    await wrapper.find('[data-testid="google-sign-in-button"]').trigger('click')

    await vi.waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Invalid Google credential.')
    })

    expect(push).not.toHaveBeenCalled()
  })

  it('handles a Google Sign-In error', async () => {
    const wrapper = wrapperFactory()

    await wrapper.findComponent(GoogleSignInButtonStub).vm.$emit('error')

    expect(notifyError).toHaveBeenCalledWith('Google Sign-In failed. Please try again.')
  })
})
