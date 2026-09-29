import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuthCard from '@/components/Base/AuthCard.vue'
import TwoFactor from '@/views/Auth/TwoFactor.vue'

const mocks = vi.hoisted(() => ({
  request: vi.fn<() => Promise<unknown>>(),
  push: vi.fn<() => Promise<unknown>>(),
  notifySuccess: vi.fn<(message: string) => void>(),
  notifyError: vi.fn<(message: string) => void>(),
  verifyTwoFaToken: vi.fn<(payload: { otp: string }) => Promise<void>>(),
}))

vi.mock('@/api', () => ({
  twoFactor: {
    request: mocks.request,
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mocks.notifySuccess,
    $notifyError: mocks.notifyError,
  }),
}))

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => ({
    hasChangedPassword: true,
    verifyTwoFaToken: mocks.verifyTwoFaToken,
  }),
}))

describe('TwoFactor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountComponent = () => shallowMount(TwoFactor)

  const mountComponentWithSlot = () =>
    shallowMount(TwoFactor, {
      global: {
        stubs: {
          AuthCard: {
            props: [
              'heading',
              'description',
              'btnText',
              'authFn',
              'formFields',
              'currentRoutes',
              'resolveNextRoute',
            ],
            template: '<div><slot /></div>',
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

    expect(authCard.props('heading')).toBe('Enter OTP')
    expect(authCard.props('description')).toBe('Please enter the OTP sent to your email.')
  })

  it('passes the correct button text', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('btnText')).toEqual({
      loading: 'LOADING...',
      normal: 'VERIFY',
    })
  })

  it('passes the OTP form field configuration', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('formFields')).toMatchObject([
      {
        key: 'otp',
        type: 'text',
        rules: 'required|digits:6',
        errorLabel: 'OTP code',
        label: 'OTP',
        placeholder: 'Enter OTP',
        extraAttrs: {
          autofocus: true,
          inputmode: 'numeric',
          maxlength: 6,
        },
      },
    ])
  })

  it('passes the correct navigation routes', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('currentRoutes')).toEqual({
      prev: { label: 'Back to log in', name: 'login' },
      next: { name: 'dashboard' },
    })
  })

  it('passes the two-factor verification function', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('authFn')).toBe(mocks.verifyTwoFaToken)
  })

  it('passes the next-route resolver', () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.props('resolveNextRoute')).toEqual(expect.any(Function))
  })

  it('disables the resend button while the cooldown is active', () => {
    const wrapper = mountComponentWithSlot()
    const button = wrapper.find('button')

    expect(button.attributes('disabled')).toBeDefined()
  })

  it('displays the cooldown remaining time', () => {
    const wrapper = mountComponentWithSlot()

    expect(wrapper.text()).toContain('Resend in 60s')
  })

  it('continues to the next route when the password has been changed', async () => {
    const wrapper = mountComponent()
    const authCard = wrapper.findComponent(AuthCard)

    const resolveNextRoute = authCard.props('resolveNextRoute') as () => Promise<boolean>

    const result = await resolveNextRoute()

    expect(result).toBe(true)
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
