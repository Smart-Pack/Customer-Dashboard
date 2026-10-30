import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  const GoogleSocialLoginButtonStub = {
    template: '<button data-testid="google-social-login-button">Native Google Sign-In</button>',
  }

  const GoogleSignupButtonStub = {
    template: '<button data-testid="google-signup-button">Google Sign-Up</button>',
  }

  const GoogleSocialSignupButtonStub = {
    template: '<button data-testid="google-social-signup-button">Native Google Sign-Up</button>',
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
          GoogleSocialLoginButton: GoogleSocialLoginButtonStub,
          GoogleSignupButton: GoogleSignupButtonStub,
          GoogleSocialSignupButton: GoogleSocialSignupButtonStub,
        },
      },
    })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('web mode', () => {
    it('renders the Google signup button in create mode', () => {
      vi.stubEnv('MODE', 'test')

      const wrapper = wrapperFactory('create')

      expect(wrapper.find('span').text()).toContain('Already have an account?')
      expect(wrapper.find('a').text()).toBe('Sign in')
      expect(wrapper.find('a').attributes('data-to')).toBe('login')

      expect(wrapper.find('[data-testid="google-signup-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="google-social-signup-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-login-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-social-login-button"]').exists()).toBe(false)
    })

    it('renders the Google login button in signIn mode', () => {
      vi.stubEnv('MODE', 'test')

      const wrapper = wrapperFactory('signIn')

      expect(wrapper.find('span').text()).toContain("Don't have an account yet?")
      expect(wrapper.find('a').text()).toBe('Sign up')
      expect(wrapper.find('a').attributes('data-to')).toBe('signup')

      expect(wrapper.find('[data-testid="google-login-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="google-social-login-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-signup-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-social-signup-button"]').exists()).toBe(false)
    })
  })

  describe('mobile mode', () => {
    it('renders the native Google signup button in create mode', () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = wrapperFactory('create')

      expect(wrapper.find('span').text()).toContain('Already have an account?')
      expect(wrapper.find('a').text()).toBe('Sign in')
      expect(wrapper.find('a').attributes('data-to')).toBe('login')

      expect(wrapper.find('[data-testid="google-social-signup-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="google-signup-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-login-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-social-login-button"]').exists()).toBe(false)
    })

    it('renders the native Google login button in signIn mode', () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = wrapperFactory('signIn')

      expect(wrapper.find('span').text()).toContain("Don't have an account yet?")
      expect(wrapper.find('a').text()).toBe('Sign up')
      expect(wrapper.find('a').attributes('data-to')).toBe('signup')

      expect(wrapper.find('[data-testid="google-social-login-button"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="google-login-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-signup-button"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="google-social-signup-button"]').exists()).toBe(false)
    })
  })
})
