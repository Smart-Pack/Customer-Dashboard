import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthCardBottomLink from '../BottomLink.vue'

describe('AuthCardBottomLink', () => {
  const RouterLinkStub = {
    template: '<a :data-to="to.name"><slot /></a>',
    props: {
      to: {
        type: Object,
        required: true,
      },
    },
  }

  const GoogleLoginButtonStub = {
    template: '<button data-testid="google-login-button">Google Sign-In</button>',
  }

  const GoogleSignupButtonStub = {
    template: '<button data-testid="google-signup-button">Google Sign-Up</button>',
  }

  const wrapperFactory = (mode: 'create' | 'signIn') =>
    mount(AuthCardBottomLink, {
      props: {
        mode,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          GoogleLoginButton: GoogleLoginButtonStub,
          GoogleSignupButton: GoogleSignupButtonStub,
        },
      },
    })

  it('renders sign-in prompt, login route, and Google signup button in create mode', () => {
    const wrapper = wrapperFactory('create')

    expect(wrapper.find('span').text()).toContain('Already have an account?')
    expect(wrapper.find('a').text()).toBe('Sign in')
    expect(wrapper.find('a').attributes('data-to')).toBe('login')
    expect(wrapper.find('[data-testid="google-login-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="google-signup-button"]').exists()).toBe(true)
  })

  it('renders sign-up prompt, signup route, and Google login button in signIn mode', () => {
    const wrapper = wrapperFactory('signIn')

    expect(wrapper.find('span').text()).toContain("Don't have an account yet?")
    expect(wrapper.find('a').text()).toBe('Sign up')
    expect(wrapper.find('a').attributes('data-to')).toBe('signup')
    expect(wrapper.find('[data-testid="google-login-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="google-signup-button"]').exists()).toBe(false)
  })
})
