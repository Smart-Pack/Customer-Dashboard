import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
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

const NotificationsStub = {
  name: 'Notifications',
  template: '<div data-testid="notifications" />',
}

async function wrapperFactory(query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/dashboard/profile',
        component: ProfileView,
      },
    ],
  })

  await router.push({
    path: '/dashboard/profile',
    query,
  })

  await router.isReady()

  const wrapper = mount(ProfileView, {
    global: {
      plugins: [router],
      stubs: {
        ProfileCard: ProfileCardStub,
        UpdatePasswordForm: UpdatePasswordFormStub,
        Notifications: NotificationsStub,
      },
    },
  })

  return { wrapper, router }
}

describe('ProfileView', () => {
  it('renders the profile tab by default when no query parameter is provided', async () => {
    const { wrapper } = await wrapperFactory()

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="notifications"]').exists()).toBe(false)
  })

  it('renders the password tab when the query parameter is password', async () => {
    const { wrapper } = await wrapperFactory({ tabs: 'password' })

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="notifications"]').exists()).toBe(false)
  })

  it('renders the notifications tab when the query parameter is notifications', async () => {
    const { wrapper } = await wrapperFactory({ tabs: 'notifications' })

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="notifications"]').exists()).toBe(true)
  })

  it('renders the profile tab when the query parameter is profile', async () => {
    const { wrapper } = await wrapperFactory({ tabs: 'profile' })

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="notifications"]').exists()).toBe(false)
  })

  it('falls back to the profile tab when the query parameter is invalid', async () => {
    const { wrapper } = await wrapperFactory({ tabs: 'invalid' })

    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="notifications"]').exists()).toBe(false)
  })

  it('updates the query parameter when switching to the password tab', async () => {
    const { wrapper, router } = await wrapperFactory()

    await wrapper.get('[data-testid="password-tab"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tabs).toBe('password')
    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(true)
  })

  it('updates the query parameter when switching to the notifications tab', async () => {
    const { wrapper, router } = await wrapperFactory()

    await wrapper.get('[data-testid="notifications-tab"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tabs).toBe('notifications')
    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="notifications"]').exists()).toBe(true)
  })

  it('switches back to the profile tab and updates the query parameter', async () => {
    const { wrapper, router } = await wrapperFactory({ tabs: 'password' })

    await wrapper.get('[data-testid="profile-tab"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tabs).toBe('profile')
    expect(wrapper.find('[data-testid="profile-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="update-password-form"]').exists()).toBe(false)
  })

  it('preserves other query parameters when switching tabs', async () => {
    const { wrapper, router } = await wrapperFactory({
      tabs: 'profile',
      source: 'notification-bell',
    })

    await wrapper.get('[data-testid="notifications-tab"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tabs).toBe('notifications')
    expect(router.currentRoute.value.query.source).toBe('notification-bell')
  })
})
