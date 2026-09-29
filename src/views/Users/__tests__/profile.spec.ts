import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ProfileView from '@/views/Users/profile.vue'

const ProfileCardStub = {
  name: 'ProfileCard',
  template: '<div data-testid="profile-card" />',
}

const UpdatePasswordFormStub = {
  name: 'UpdatePasswordForm',
  template: '<div data-testid="update-password-form" />',
}

function wrapperFactory() {
  return mount(ProfileView, {
    global: {
      stubs: {
        ProfileCard: ProfileCardStub,
        UpdatePasswordForm: UpdatePasswordFormStub,
      },
    },
  })
}

describe('ProfileView', () => {
  it('renders the profile tab by default', () => {
    const wrapper = wrapperFactory()

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
  })

  it('switches to the password tab', async () => {
    const wrapper = wrapperFactory()

    await wrapper.get('[data-testid="password-tab"]').trigger('click')

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(true)
  })

  it('switches back to the profile tab', async () => {
    const wrapper = wrapperFactory()

    await wrapper.get('[data-testid="password-tab"]').trigger('click')
    await wrapper.get('[data-testid="profile-tab"]').trigger('click')

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
  })
})
