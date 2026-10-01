import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GoogleSignupButton, { type GoogleUser } from '../GoogleSignupButton.vue'
import { decodeCredential, type DecodedGoogleUser } from 'vue3-google-signin'
import { useGlobals } from '@/composables/useGlobals'

vi.mock('vue3-google-signin', () => ({
  GoogleSignInButton: {
    name: 'GoogleSignInButton',
    template: '<button @click="$emit(\'success\', successResponse)">Google Sign Up</button>',
    props: {
      successResponse: {
        type: Object,
        default: () => ({
          credential: 'google-credential',
        }),
      },
    },
  },
  decodeCredential: vi.fn<(credential: string) => DecodedGoogleUser>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: vi.fn<typeof useGlobals>(),
}))

describe('GoogleSignupButton', () => {
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
    template:
      '<div data-testid="google-signup-modal">' +
      '<button data-testid="modal-close" @click="$emit(\'close\')">Close</button>' +
      '<button data-testid="modal-success" @click="$emit(\'success\')">Success</button>' +
      '</div>',
  }

  const wrapperFactory = () =>
    mount(GoogleSignupButton, {
      global: {
        stubs: {
          GoogleSignupModal: GoogleSignupModalStub,
        },
      },
    })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useGlobals).mockReturnValue({
      $notifyError: notifyError,
      $router: {
        push,
      },
    } as unknown as ReturnType<typeof useGlobals>)

    vi.mocked(decodeCredential).mockReturnValue(decodedGoogleUser)
  })

  it('renders the Google signup button without the registration modal', () => {
    const wrapper = wrapperFactory()

    expect(wrapper.findComponent({ name: 'GoogleSignInButton' }).exists()).toBe(true)
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(wrapper.find('.submit-spinner').exists()).toBe(false)
  })

  it('opens the registration modal with the decoded Google user after successful signup', async () => {
    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('success', {
      credential: 'google-credential',
    })

    await wrapper.vm.$nextTick()

    expect(decodeCredential).toHaveBeenCalledWith('google-credential')

    const modal = wrapper.findComponent({
      name: 'GoogleSignupModal',
    })

    expect(modal.exists()).toBe(true)
    expect(modal.props('credential')).toBe('google-credential')
    expect(modal.props('googleUser')).toMatchObject(googleUser)
  })

  it('shows an error when Google does not return a credential', async () => {
    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('success', {
      credential: '',
    })

    await wrapper.vm.$nextTick()

    expect(decodeCredential).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(notifyError).toHaveBeenCalledWith('Google Sign-Up did not return a credential.')
  })

  it('shows an error when the decoded Google profile has no email', async () => {
    vi.mocked(decodeCredential).mockReturnValue({
      ...decodedGoogleUser,
      email: '',
    })

    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('success', {
      credential: 'google-credential',
    })

    await wrapper.vm.$nextTick()

    expect(decodeCredential).toHaveBeenCalledWith('google-credential')
    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(notifyError).toHaveBeenCalledWith('Google Sign-Up did not return an email address.')
  })

  it('shows an error when Google Sign-Up fails', async () => {
    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('error')

    await wrapper.vm.$nextTick()

    expect(notifyError).toHaveBeenCalledWith('Google Sign-Up failed. Please try again.')
  })

  it('closes the registration modal when cancelled', async () => {
    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('success', {
      credential: 'google-credential',
    })

    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="modal-close"]').trigger('click')

    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
  })

  it('redirects to login after successful registration', async () => {
    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('success', {
      credential: 'google-credential',
    })

    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="modal-success"]').trigger('click')

    expect(wrapper.find('[data-testid="google-signup-modal"]').exists()).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })

  it('clears the Google signup state after successful registration', async () => {
    const wrapper = wrapperFactory()
    const googleButton = wrapper.findComponent({ name: 'GoogleSignInButton' })

    googleButton.vm.$emit('success', {
      credential: 'google-credential',
    })

    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent({
      name: 'GoogleSignupModal',
    })

    expect(modal.props('credential')).toBe('google-credential')

    await wrapper.find('[data-testid="modal-success"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })
})
