import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'

import TopBar from '../TopBar.vue'
import { auth } from '@/api'
import type { ApiDetailResponse } from '@/api/types'
import { useAuthStore, useUiStore } from '@/stores'
import { mockUser } from '@/tests/constants'

const routerPush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

let currentRouteName = 'dashboard'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),

  useRoute: () => ({
    get name() {
      return currentRouteName
    },
  }),

  RouterLink: {
    name: 'RouterLink',
    props: {
      to: {
        type: [String, Object],
        required: true,
      },
    },
    template: '<a><slot /></a>',
  },
}))

vi.mock('@/api', () => ({
  auth: {
    logout: vi.fn<() => Promise<ApiDetailResponse>>(),
  },
}))

const stubs = {
  SmartPackLogo: {
    name: 'SmartPackLogo',
    template: '<svg data-testid="smartpack-logo" />',
  },

  HamburgerIcon: {
    name: 'HamburgerIcon',
    template: '<svg data-testid="hamburger-icon" />',
  },

  CloseIcon: {
    name: 'CloseIcon',
    template: '<svg data-testid="close-icon" />',
  },

  LightModeIcon: {
    name: 'LightModeIcon',
    template: '<svg data-testid="light-mode-icon" />',
  },

  DarkModeIcon: {
    name: 'DarkModeIcon',
    template: '<svg data-testid="dark-mode-icon" />',
  },

  UserIcon: {
    name: 'UserIcon',
    template: '<svg data-testid="user-icon" />',
  },
}

describe('TopBar', () => {
  let pinia: Pinia
  let authStore: ReturnType<typeof useAuthStore>
  let uiStore: ReturnType<typeof useUiStore>

  const mountTopBar = (): VueWrapper =>
    mount(TopBar, {
      global: {
        plugins: [pinia],
        stubs: {
          ...stubs,
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

  beforeEach(() => {
    vi.clearAllMocks()

    currentRouteName = 'dashboard'

    pinia = createPinia()
    setActivePinia(pinia)

    authStore = useAuthStore(pinia)
    uiStore = useUiStore(pinia)

    authStore.loggedInUser = {
      ...mockUser,
      first_name: 'John',
      profile_pic: null,
      two_factor_enabled: false,
      changed_password_after_initial_login: true,
    }

    uiStore.isSideNavOpen = false
    uiStore.themePreference = 0
    uiStore.isLightMode = true
  })

  describe('rendering', () => {
    it('renders the dashboard title', () => {
      const wrapper = mountTopBar()

      expect(wrapper.text()).toContain('SMARTPACK')
    })

    it('renders the welcome message with the authenticated user first name', () => {
      const wrapper = mountTopBar()

      expect(wrapper.text()).toContain('Welcome')
      expect(wrapper.text()).toContain('John')
    })

    it('renders the user icon when no profile picture exists', () => {
      const wrapper = mountTopBar()

      expect(wrapper.findComponent({ name: 'UserIcon' }).exists()).toBe(true)
    })
    it('renders the profile picture when available', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890)

      authStore.loggedInUser!.profile_pic = 'https://example.com/profile.jpg'

      const wrapper = mountTopBar()
      const image = wrapper.get('img')

      expect(image.attributes('src')).toBe('https://example.com/profile.jpg?v=1234567890')
      expect(image.attributes('alt')).toBe('Profile Picture')

      vi.restoreAllMocks()
    })
  })

  describe('side navigation', () => {
    it('shows the hamburger icon when the side navigation is closed', () => {
      uiStore.isSideNavOpen = false

      const wrapper = mountTopBar()

      expect(wrapper.findComponent({ name: 'HamburgerIcon' }).exists()).toBe(true)

      expect(wrapper.findComponent({ name: 'CloseIcon' }).exists()).toBe(false)
    })

    it('shows the close icon when the side navigation is open', () => {
      uiStore.isSideNavOpen = true

      const wrapper = mountTopBar()

      expect(wrapper.findComponent({ name: 'CloseIcon' }).exists()).toBe(true)

      expect(wrapper.findComponent({ name: 'HamburgerIcon' }).exists()).toBe(false)
    })

    it('toggles the side navigation when the mobile button is clicked', async () => {
      const wrapper = mountTopBar()

      const button = wrapper.get('[data-testid="side-nav-toggle"]')

      expect(uiStore.isSideNavOpen).toBe(false)

      await button.trigger('click')

      expect(uiStore.isSideNavOpen).toBe(true)

      await button.trigger('click')

      expect(uiStore.isSideNavOpen).toBe(false)
    })

    it('updates the aria attributes when the side navigation state changes', async () => {
      const wrapper = mountTopBar()

      const button = wrapper.get('[data-testid="side-nav-toggle"]')

      expect(button.attributes('aria-expanded')).toBe('false')
      expect(button.attributes('aria-label')).toBe('Open navigation menu')

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('true')
      expect(button.attributes('aria-label')).toBe('Close navigation menu')
    })
  })

  describe('theme', () => {
    it('shows the light mode icon when light mode is active', () => {
      uiStore.updateThemePreference(1)

      const wrapper = mountTopBar()

      expect(wrapper.findComponent({ name: 'LightModeIcon' }).exists()).toBe(true)

      expect(wrapper.findComponent({ name: 'DarkModeIcon' }).exists()).toBe(false)
    })

    it('shows the dark mode icon when dark mode is active', () => {
      uiStore.updateThemePreference(2)

      const wrapper = mountTopBar()

      expect(wrapper.findComponent({ name: 'DarkModeIcon' }).exists()).toBe(true)

      expect(wrapper.findComponent({ name: 'LightModeIcon' }).exists()).toBe(false)
    })

    it('switches to dark mode when light mode is active', async () => {
      uiStore.updateThemePreference(1)

      const wrapper = mountTopBar()

      const themeButton = wrapper.get('[data-testid="theme-toggle"]')

      await themeButton.trigger('click')

      expect(uiStore.themePreference).toBe(2)
      expect(uiStore.isLightMode).toBe(false)

      expect(wrapper.findComponent({ name: 'DarkModeIcon' }).exists()).toBe(true)
    })

    it('switches to light mode when dark mode is active', async () => {
      uiStore.updateThemePreference(2)

      const wrapper = mountTopBar()

      const themeButton = wrapper.get('[data-testid="theme-toggle"]')

      await themeButton.trigger('click')

      expect(uiStore.themePreference).toBe(1)
      expect(uiStore.isLightMode).toBe(true)

      expect(wrapper.findComponent({ name: 'LightModeIcon' }).exists()).toBe(true)
    })
  })

  describe('account dropdown', () => {
    it('is closed initially', () => {
      const wrapper = mountTopBar()

      const dropdown = wrapper.get('#account-dropdown')

      expect(dropdown.classes()).toContain('lg:hidden')
      expect(dropdown.attributes('aria-hidden')).toBeUndefined()
    })

    it('opens when the account button is clicked', async () => {
      const wrapper = mountTopBar()

      const accountButton = wrapper.get('[data-testid="account-toggle"]')
      const dropdown = wrapper.get('#account-dropdown')

      expect(accountButton.attributes('aria-expanded')).toBe('false')
      expect(dropdown.classes()).toContain('lg:hidden')

      await accountButton.trigger('click')

      expect(accountButton.attributes('aria-expanded')).toBe('true')
      expect(dropdown.classes()).toContain('lg:block')
    })

    it('closes when the account button is clicked again', async () => {
      const wrapper = mountTopBar()

      const accountButton = wrapper.get('[data-testid="account-toggle"]')
      const dropdown = wrapper.get('#account-dropdown')

      await accountButton.trigger('click')

      expect(accountButton.attributes('aria-expanded')).toBe('true')

      await accountButton.trigger('click')

      expect(accountButton.attributes('aria-expanded')).toBe('false')
      expect(dropdown.classes()).toContain('lg:hidden')
    })
  })

  describe('profile navigation', () => {
    it('closes the dropdown and navigates to the profile page', async () => {
      const wrapper = mountTopBar()

      await wrapper.get('[data-testid="account-toggle"]').trigger('click')

      expect(wrapper.get('[data-testid="account-toggle"]').attributes('aria-expanded')).toBe('true')

      await wrapper.get('[data-testid="profile-button"]').trigger('click')

      await flushPromises()

      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'my-profile',
      })

      expect(wrapper.get('[data-testid="account-toggle"]').attributes('aria-expanded')).toBe(
        'false',
      )
    })

    it('does not navigate when already on the profile page', async () => {
      currentRouteName = 'my-profile'

      const wrapper = mountTopBar()

      await wrapper.get('[data-testid="account-toggle"]').trigger('click')
      await wrapper.get('[data-testid="profile-button"]').trigger('click')

      await flushPromises()

      expect(routerPush).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('logs out, clears the auth store, and redirects to login', async () => {
      vi.mocked(auth.logout).mockResolvedValue({
        detail: 'Successfully logged out.',
      })

      const clearStoreSpy = vi.spyOn(authStore, 'clearStore')

      const wrapper = mountTopBar()

      await wrapper.get('[data-testid="account-toggle"]').trigger('click')
      await wrapper.get('[data-testid="logout-button"]').trigger('click')

      await flushPromises()

      expect(auth.logout).toHaveBeenCalledTimes(1)
      expect(clearStoreSpy).toHaveBeenCalledTimes(1)

      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'login',
      })
    })

    it('clears the auth store and redirects when logout fails', async () => {
      vi.mocked(auth.logout).mockRejectedValue(new Error('Logout failed'))

      const clearStoreSpy = vi.spyOn(authStore, 'clearStore')

      const wrapper = mountTopBar()

      await wrapper.get('[data-testid="account-toggle"]').trigger('click')
      await wrapper.get('[data-testid="logout-button"]').trigger('click')

      await flushPromises()

      expect(auth.logout).toHaveBeenCalledTimes(1)
      expect(clearStoreSpy).toHaveBeenCalledTimes(1)

      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'login',
      })
    })
  })
})
