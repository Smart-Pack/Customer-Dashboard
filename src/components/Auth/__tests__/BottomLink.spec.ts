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

  const wrapperFactory = (mode: 'create' | 'signIn') =>
    mount(AuthCardBottomLink, {
      props: {
        mode,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

  it('renders sign-in prompt and login route in create mode', () => {
    const wrapper = wrapperFactory('create')

    expect(wrapper.find('span').text()).toContain('Already have an account?')
    expect(wrapper.find('a').text()).toBe('Sign in')
    expect(wrapper.find('a').attributes('data-to')).toBe('login')
  })

  it('renders sign-up prompt and signup route in signIn mode', () => {
    const wrapper = wrapperFactory('signIn')

    expect(wrapper.find('span').text()).toContain("Don't have an account yet?")
    expect(wrapper.find('a').text()).toBe('Sign up')
    expect(wrapper.find('a').attributes('data-to')).toBe('signup')
  })
})
