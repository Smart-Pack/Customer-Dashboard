import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'

import SideNav from '../SideNav.vue'
import { useAuthStore, useUiStore } from '@/stores'
import { mockUser } from '@/tests/constants'

const routerPush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const findMenuButton = (
  wrapper: VueWrapper,
  label: string,
): ReturnType<VueWrapper['findAll']>[number] | undefined => {
  return wrapper.findAll('button').find((button) => {
    const text = button
      .findAll('span')
      .map((span) => span.text())
      .join(' ')

    return text === label
  })
}
let currentRouteName: string | undefined = 'dashboard'

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()

  return {
    ...actual,

    useRouter: () => ({
      push: routerPush,
    }),

    useRoute: () => ({
      get name() {
        return currentRouteName
      },
    }),
  }
})

const stubs = {
  HomeIcon: {
    name: 'HomeIcon',
    template: '<svg data-testid="home-icon" />',
  },

  UserIcon: {
    name: 'UserIcon',
    template: '<svg data-testid="user-icon" />',
  },

  LightModeIcon: {
    name: 'LightModeIcon',
    template: '<svg data-testid="light-mode-icon" />',
  },

  DarkModeIcon: {
    name: 'DarkModeIcon',
    template: '<svg data-testid="dark-mode-icon" />',
  },
}

describe('SideNav', () => {
  let pinia: Pinia
  let authStore: ReturnType<typeof useAuthStore>
  let uiStore: ReturnType<typeof useUiStore>

  const mountSideNav = (): VueWrapper =>
    mount(SideNav, {
      global: {
        plugins: [pinia],
        stubs,
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
    uiStore.breadcrumbs = []
  })

  describe('rendering', () => {
    it('renders the Home menu item', () => {
      const wrapper = mountSideNav()

      expect(wrapper.text()).toContain('Home')
    })

    it('renders the My Profile menu item', () => {
      const wrapper = mountSideNav()

      expect(findMenuButton(wrapper, 'My Profile')).toBeDefined()
    })

    it('renders the authenticated user first name', () => {
      const wrapper = mountSideNav()

      expect(wrapper.text()).toContain('John')
    })

    it('renders the user icon when no profile picture exists', () => {
      const wrapper = mountSideNav()

      expect(wrapper.findComponent({ name: 'UserIcon' }).exists()).toBe(true)
    })

    it('renders the profile picture when available', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890)

      authStore.loggedInUser!.profile_pic = 'https://example.com/profile.jpg'

      const wrapper = mountSideNav()
      const image = wrapper.get('img')

      expect(image.attributes('src')).toBe('https://example.com/profile.jpg?v=1234567890')
      expect(image.attributes('alt')).toBe('Profile Picture')

      vi.restoreAllMocks()
    })

    it('renders the light mode icon when light mode is active', () => {
      uiStore.updateThemePreference(1)

      const wrapper = mountSideNav()

      expect(wrapper.findComponent({ name: 'LightModeIcon' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'DarkModeIcon' }).exists()).toBe(false)
    })

    it('renders the dark mode icon when dark mode is active', () => {
      uiStore.updateThemePreference(2)

      const wrapper = mountSideNav()

      expect(wrapper.findComponent({ name: 'DarkModeIcon' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'LightModeIcon' }).exists()).toBe(false)
    })
  })

  describe('side navigation visibility', () => {
    it('is hidden when the side navigation is closed', () => {
      uiStore.isSideNavOpen = false

      const wrapper = mountSideNav()

      expect(wrapper.find('nav').classes()).toContain('hidden')
    })

    it('is visible when the side navigation is open', () => {
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      expect(wrapper.find('nav').classes()).not.toContain('hidden')
    })
  })

  describe('theme', () => {
    it('switches to dark mode when light mode is active', async () => {
      uiStore.updateThemePreference(1)

      const wrapper = mountSideNav()

      const button = wrapper.get('button[aria-label="Switch to dark mode"]')

      await button.trigger('click')

      expect(uiStore.themePreference).toBe(2)
      expect(uiStore.isLightMode).toBe(false)
      expect(wrapper.findComponent({ name: 'DarkModeIcon' }).exists()).toBe(true)
    })

    it('switches to light mode when dark mode is active', async () => {
      uiStore.updateThemePreference(2)

      const wrapper = mountSideNav()

      const button = wrapper.get('button[aria-label="Switch to light mode"]')

      await button.trigger('click')

      expect(uiStore.themePreference).toBe(1)
      expect(uiStore.isLightMode).toBe(true)
      expect(wrapper.findComponent({ name: 'LightModeIcon' }).exists()).toBe(true)
    })
  })

  describe('navigation', () => {
    it('navigates to My Profile and closes the side navigation', async () => {
      currentRouteName = 'dashboard'
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      const profileButton = findMenuButton(wrapper, 'My Profile')

      expect(profileButton).toBeDefined()

      await profileButton!.trigger('click')

      expect(uiStore.isSideNavOpen).toBe(false)
      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'my-profile',
      })
    })

    it('navigates to Home and closes the side navigation', async () => {
      currentRouteName = 'my-profile'
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      const homeButton = wrapper.findAll('button').find((button) => button.text().includes('Home'))

      expect(homeButton).toBeDefined()

      await homeButton!.trigger('click')

      expect(uiStore.isSideNavOpen).toBe(false)
      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'dashboard',
      })
    })

    it('does not navigate when already on the selected route', async () => {
      currentRouteName = 'dashboard'
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      const homeButton = wrapper.findAll('button').find((button) => button.text().includes('Home'))

      expect(homeButton).toBeDefined()

      await homeButton!.trigger('click')

      expect(routerPush).not.toHaveBeenCalled()
      expect(uiStore.isSideNavOpen).toBe(true)
    })
  })

  describe('breadcrumbs', () => {
    it('highlights Home when the dashboard breadcrumb is active', () => {
      uiStore.breadcrumbs = [
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
      ]

      currentRouteName = 'dashboard'

      const wrapper = mountSideNav()

      const homeButton = wrapper.findAll('button').find((button) => button.text().includes('Home'))

      expect(homeButton).toBeDefined()
      expect(homeButton!.classes()).toContain('form-submit')
    })

    it('highlights My Profile when the profile breadcrumb is active', () => {
      uiStore.breadcrumbs = [
        {
          name: 'my-profile',
          breadcrumb: 'My Profile',
        },
      ]

      currentRouteName = 'my-profile'

      const wrapper = mountSideNav()

      const profileButton = findMenuButton(wrapper, 'My Profile')

      expect(profileButton).toBeDefined()
      expect(profileButton!.classes()).toContain('form-submit')
    })
  })
})
