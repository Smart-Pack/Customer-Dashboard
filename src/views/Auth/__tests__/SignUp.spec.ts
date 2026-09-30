import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import SignUpView from '../SignUp.vue'
import AuthCard from '@/components/Base/AuthCard.vue'
import AuthCardBottomLink from '@/components/Auth/BottomLink.vue'

vi.mock('@/api/modules/users', () => ({
  registerCustomer: vi.fn<() => Promise<string>>(),
}))

vi.mock('@/data/forms/customerRegistrationFields', () => ({
  getCustomerRegistrationFields: vi.fn<() => Array<Record<string, unknown>>>(() => [
    {
      key: 'first_name',
      label: 'First Name',
      specificType: 'fname',
    },
    {
      key: 'last_name',
      label: 'Last Name',
      specificType: 'lname',
    },
    {
      key: 'email',
      label: 'Email Address',
      specificType: 'email',
    },
    {
      key: 'phone',
      label: 'Phone Number',
      specificType: 'phone',
    },
    {
      key: 'gender',
      label: 'Gender',
      specificType: 'gender',
    },
    {
      key: 'date_of_birth',
      label: 'Date Of Birth',
      errorLabel: 'DOB',
      type: 'date',
      rules: 'min_age:13',
    },
  ]),
}))

describe('SignUpView', () => {
  it('renders AuthCard with the correct props', () => {
    const wrapper = mount(SignUpView, {
      global: {
        stubs: {
          AuthCard: true,
        },
      },
    })

    const authCard = wrapper.findComponent(AuthCard)

    expect(authCard.exists()).toBe(true)
    expect(authCard.props('heading')).toBe('Sign Up')

    expect(authCard.props('btnText')).toEqual({
      normal: 'Register',
      loading: 'Registering...',
    })

    expect(authCard.props('authFn')).toEqual(expect.any(Function))

    expect(authCard.props('formFields')).toEqual([
      {
        key: 'first_name',
        label: 'First Name',
        specificType: 'fname',
      },
      {
        key: 'last_name',
        label: 'Last Name',
        specificType: 'lname',
      },
      {
        key: 'email',
        label: 'Email Address',
        specificType: 'email',
      },
      {
        key: 'phone',
        label: 'Phone Number',
        specificType: 'phone',
      },
      {
        key: 'gender',
        label: 'Gender',
        specificType: 'gender',
      },
      {
        key: 'date_of_birth',
        label: 'Date Of Birth',
        errorLabel: 'DOB',
        type: 'date',
        rules: 'min_age:13',
      },
    ])

    expect(authCard.props('currentRoutes')).toEqual({
      next: {
        name: 'login',
      },
    })

    expect(authCard.props('bottomComponent')).toBe(AuthCardBottomLink)

    expect(authCard.props('bottomComponentProps')).toEqual({
      mode: 'create',
    })

    expect(authCard.props('showErrors')).toBe(true)
  })
  it('enables scrolling on mount', async () => {
    const wrapper = mount(SignUpView, {
      global: {
        stubs: {
          AuthCard: true,
        },
      },
    })

    await nextTick()

    expect(wrapper.emitted('scroll-main')).toEqual([[true]])
  })

  it('disables scrolling before unmount', () => {
    const wrapper = mount(SignUpView, {
      global: {
        stubs: {
          AuthCard: true,
        },
      },
    })

    wrapper.unmount()

    expect(wrapper.emitted('scroll-main')).toContainEqual([false])
  })
})
