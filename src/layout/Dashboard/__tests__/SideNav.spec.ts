import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { isSyncing, lastSyncedAt } from '@/services/database/sync'
import SideNav from '../SideNav.vue'
import { auth } from '@/api'
import type { ApiDetailResponse } from '@/api/types'
import { useAuthStore, useUiStore } from '@/stores'
import { mockUser } from '@/tests/constants'

const mocks = vi.hoisted(() => ({
  isMobile: false,
  startSyncScheduler:
    vi.fn<(options: { intervalMs: number; onError: (error: unknown) => void }) => void>(),

  stopSyncScheduler: vi.fn<() => void>(),

  triggerSync: vi.fn<() => Promise<void>>(),

  notifySuccess: vi.fn<(message: string) => void | Promise<void>>(),

  notifyError: vi.fn<(message: string) => void | Promise<void>>(),

  addAppListener:
    vi.fn<
      (
        event: string,
        callback: (state: { isActive: boolean }) => void,
      ) => Promise<{ remove: () => Promise<void> }>
    >(),

  removeAppListener: vi.fn<() => Promise<void>>(),

  appStateCallback: null as ((state: { isActive: boolean }) => void) | null,
  refreshLastSyncedAt: vi.fn<() => Promise<void>>(),
}))

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

vi.mock('@/api', () => ({
  auth: {
    logout: vi.fn<() => Promise<ApiDetailResponse>>(),
  },
}))

vi.mock('@/utils/platform', () => ({
  isMobile: () => mocks.isMobile,
}))

vi.mock('@/services/database/sync', async () => {
  const { ref } = await import('vue')

  return {
    startSyncScheduler: mocks.startSyncScheduler,
    stopSyncScheduler: mocks.stopSyncScheduler,
    triggerSync: mocks.triggerSync,
    isSyncing: ref(false),
    lastSyncedAt: ref<string | null>(null),
    refreshLastSyncedAt: mocks.refreshLastSyncedAt,
  }
})

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: mocks.notifySuccess,
    $notifyError: mocks.notifyError,
  }),
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mocks.addAppListener,
  },
}))

const stubs = {
  HomeIcon: {
    name: 'HomeIcon',
    template: '<svg data-testid="home-icon" />',
  },

  UserIcon: {
    name: 'UserIcon',
    template: '<svg data-testid="user-icon" />',
  },

  BackPackIcon: {
    name: 'BackPackIcon',
    template: '<svg data-testid="backpack-icon" />',
  },

  UserGroupIcon: {
    name: 'UserGroupIcon',
    template: '<svg data-testid="user-group-icon" />',
  },

  LogOutIcon: {
    name: 'LogOutIcon',
    template: '<svg data-testid="logout-icon" />',
  },

  LightModeIcon: {
    name: 'LightModeIcon',
    template: '<svg data-testid="light-mode-icon" />',
  },

  DarkModeIcon: {
    name: 'DarkModeIcon',
    template: '<svg data-testid="dark-mode-icon" />',
  },
  RefreshIcon: {
    name: 'RefreshIcon',
    template: '<svg data-testid="refresh-icon" />',
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

    mocks.isMobile = false

    mocks.startSyncScheduler.mockReset()
    mocks.stopSyncScheduler.mockReset()

    mocks.triggerSync.mockReset()
    mocks.triggerSync.mockResolvedValue(undefined)

    mocks.notifySuccess.mockReset()
    mocks.notifyError.mockReset()

    mocks.removeAppListener.mockReset()
    mocks.appStateCallback = null

    mocks.addAppListener.mockReset()
    mocks.addAppListener.mockImplementation((_event, callback) => {
      mocks.appStateCallback = callback

      return Promise.resolve({
        remove: mocks.removeAppListener,
      })
    })

    isSyncing.value = false
    lastSyncedAt.value = null

    mocks.refreshLastSyncedAt.mockReset()
    mocks.refreshLastSyncedAt.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders the Home menu item', () => {
      const wrapper = mountSideNav()

      expect(findMenuButton(wrapper, 'Home')).toBeDefined()
    })

    it('renders the SmartPack Management menu item', () => {
      const wrapper = mountSideNav()

      expect(findMenuButton(wrapper, 'SmartPack Management')).toBeDefined()
    })

    it('renders the My Profile menu item', () => {
      const wrapper = mountSideNav()

      expect(findMenuButton(wrapper, 'My Profile')).toBeDefined()
    })

    it('renders the Group Management menu item', () => {
      const wrapper = mountSideNav()

      expect(findMenuButton(wrapper, 'Group Management')).toBeDefined()
    })

    it('renders the Logout menu item', () => {
      const wrapper = mountSideNav()

      expect(findMenuButton(wrapper, 'Logout')).toBeDefined()
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

    it('navigates to SmartPack Management and closes the side navigation', async () => {
      currentRouteName = 'dashboard'
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      const smartPackButton = findMenuButton(wrapper, 'SmartPack Management')

      expect(smartPackButton).toBeDefined()

      await smartPackButton!.trigger('click')

      expect(uiStore.isSideNavOpen).toBe(false)
      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'smartpacks-parent',
      })
    })

    it('navigates to Group Management and closes the side navigation', async () => {
      currentRouteName = 'dashboard'
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      const groupManagementButton = findMenuButton(wrapper, 'Group Management')

      expect(groupManagementButton).toBeDefined()

      await groupManagementButton!.trigger('click')

      expect(uiStore.isSideNavOpen).toBe(false)
      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'groups-parent',
      })
    })

    it('navigates to Home and closes the side navigation', async () => {
      currentRouteName = 'my-profile'
      uiStore.isSideNavOpen = true

      const wrapper = mountSideNav()

      const homeButton = findMenuButton(wrapper, 'Home')

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

      const homeButton = findMenuButton(wrapper, 'Home')

      expect(homeButton).toBeDefined()

      await homeButton!.trigger('click')

      expect(routerPush).not.toHaveBeenCalled()
      expect(uiStore.isSideNavOpen).toBe(true)
    })
  })

  describe('logout', () => {
    it('logs out, clears the auth store, and redirects to login', async () => {
      vi.mocked(auth.logout).mockResolvedValue({
        detail: 'Successfully logged out.',
      })

      const clearStoreSpy = vi.spyOn(authStore, 'clearStore')

      const wrapper = mountSideNav()

      const logoutButton = findMenuButton(wrapper, 'Logout')

      expect(logoutButton).toBeDefined()

      await logoutButton!.trigger('click')
      await flushPromises()

      expect(auth.logout).toHaveBeenCalledTimes(1)
      expect(clearStoreSpy).toHaveBeenCalledTimes(1)

      expect(routerPush).toHaveBeenCalledExactlyOnceWith({
        name: 'login',
      })
    })

    it('clears the auth store and redirects when logout fails', async () => {
      vi.mocked(auth.logout).mockRejectedValue(new Error('Logout failed'))

      const clearStoreSpy = vi.spyOn(authStore, 'clearStore')

      const wrapper = mountSideNav()

      const logoutButton = findMenuButton(wrapper, 'Logout')

      expect(logoutButton).toBeDefined()

      await logoutButton!.trigger('click')
      await flushPromises()

      expect(auth.logout).toHaveBeenCalledTimes(1)
      expect(clearStoreSpy).toHaveBeenCalledTimes(1)

      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith({
        name: 'login',
      })
    })

    it('applies the extra class to the logout menu item', () => {
      const wrapper = mountSideNav()

      const logoutButton = findMenuButton(wrapper, 'Logout')

      expect(logoutButton).toBeDefined()
      expect(logoutButton!.element.parentElement?.classList.contains('lg:hidden')).toBe(true)
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

      const homeButton = findMenuButton(wrapper, 'Home')

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
  describe('mobile synchronization', () => {
    beforeEach(() => {
      mocks.isMobile = true
    })

    it('renders the Sync Now button on mobile', () => {
      const wrapper = mountSideNav()

      expect(wrapper.find('button[aria-label="Synchronize data now"]').exists()).toBe(true)

      expect(wrapper.findComponent({ name: 'RefreshIcon' }).exists()).toBe(true)
    })

    it('does not render the Sync Now button on desktop', () => {
      mocks.isMobile = false

      const wrapper = mountSideNav()

      expect(wrapper.find('button[aria-label="Synchronize data now"]').exists()).toBe(false)
    })

    it('renders Sync Now below the Logout button', () => {
      const wrapper = mountSideNav()

      const buttons = wrapper.findAll('nav button')

      const logoutIndex = buttons.findIndex((button) => button.text().includes('Logout'))

      const syncIndex = buttons.findIndex(
        (button) => button.attributes('aria-label') === 'Synchronize data now',
      )

      expect(logoutIndex).toBeGreaterThan(-1)
      expect(syncIndex).toBeGreaterThan(logoutIndex)
    })

    it('starts the sync scheduler on mobile mount', () => {
      mountSideNav()

      expect(mocks.startSyncScheduler).toHaveBeenCalledExactlyOnceWith({
        intervalMs: 30 * 60 * 1000,
        onError: expect.any(Function),
      })
    })

    it('registers an app-state listener on mobile mount', async () => {
      mountSideNav()

      await flushPromises()

      expect(mocks.addAppListener).toHaveBeenCalledExactlyOnceWith(
        'appStateChange',
        expect.any(Function),
      )
    })

    it('does not start synchronization services on desktop', () => {
      mocks.isMobile = false

      mountSideNav()

      expect(mocks.startSyncScheduler).not.toHaveBeenCalled()
      expect(mocks.addAppListener).not.toHaveBeenCalled()
    })

    it('triggers synchronization when the application becomes active', async () => {
      mountSideNav()

      await flushPromises()

      expect(mocks.appStateCallback).not.toBeNull()

      mocks.appStateCallback!({ isActive: true })

      expect(mocks.triggerSync).toHaveBeenCalledExactlyOnceWith()
    })

    it('does not trigger synchronization when the application becomes inactive', async () => {
      mountSideNav()

      await flushPromises()

      mocks.appStateCallback!({ isActive: false })

      expect(mocks.triggerSync).not.toHaveBeenCalled()
    })

    it('stops the scheduler when the component unmounts', () => {
      const wrapper = mountSideNav()

      wrapper.unmount()

      expect(mocks.stopSyncScheduler).toHaveBeenCalledExactlyOnceWith()
    })

    it('removes the app-state listener when the component unmounts', async () => {
      const wrapper = mountSideNav()

      await flushPromises()

      wrapper.unmount()

      expect(mocks.removeAppListener).toHaveBeenCalledExactlyOnceWith()
    })

    it('logs automatic synchronization failures without displaying notifications', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mountSideNav()

      const schedulerOptions = mocks.startSyncScheduler.mock.calls[0]?.[0]

      expect(schedulerOptions).toBeDefined()

      schedulerOptions!.onError(new Error('Automatic sync failed'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Automatic synchronization failed:',
        expect.any(Error),
      )

      expect(mocks.notifySuccess).not.toHaveBeenCalled()
      expect(mocks.notifyError).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
    it('refreshes the last synchronization timestamp on mobile mount', () => {
      mountSideNav()

      expect(mocks.refreshLastSyncedAt).toHaveBeenCalledExactlyOnceWith()
    })

    it('does not refresh the last synchronization timestamp on desktop', () => {
      mocks.isMobile = false

      mountSideNav()

      expect(mocks.refreshLastSyncedAt).not.toHaveBeenCalled()
    })

    it('displays the last successful synchronization timestamp', () => {
      lastSyncedAt.value = '2026-11-18T11:50:00.000Z'

      const wrapper = mountSideNav()

      expect(wrapper.text()).toContain('Last synced')
      expect(wrapper.text()).not.toContain('Never')
    })

    it('displays Never when no successful synchronization exists', () => {
      lastSyncedAt.value = null

      const wrapper = mountSideNav()

      expect(wrapper.text()).toContain('Never')
    })
  })

  describe('manual synchronization', () => {
    beforeEach(() => {
      mocks.isMobile = true
    })

    it('successfully synchronizes data and displays a success notification', async () => {
      mocks.triggerSync.mockResolvedValue(undefined)

      const wrapper = mountSideNav()

      const syncButton = wrapper.get('button[aria-label="Synchronize data now"]')

      await syncButton.trigger('click')
      await flushPromises()

      expect(mocks.triggerSync).toHaveBeenCalledExactlyOnceWith()

      expect(mocks.notifySuccess).toHaveBeenCalledExactlyOnceWith('Data synchronized successfully.')

      expect(mocks.notifyError).not.toHaveBeenCalled()
    })

    it('displays an error notification when synchronization fails', async () => {
      mocks.triggerSync.mockRejectedValue(new Error('Network unavailable'))

      const wrapper = mountSideNav()

      const syncButton = wrapper.get('button[aria-label="Synchronize data now"]')

      await syncButton.trigger('click')
      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith('Network unavailable')

      expect(mocks.notifySuccess).not.toHaveBeenCalled()
    })

    it('displays a fallback error message for non-Error failures', async () => {
      mocks.triggerSync.mockRejectedValue('Unknown failure')

      const wrapper = mountSideNav()

      const syncButton = wrapper.get('button[aria-label="Synchronize data now"]')

      await syncButton.trigger('click')
      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledExactlyOnceWith(
        'Unable to synchronize data. Please try again.',
      )
    })

    it('disables the Sync Now button while synchronization is running', async () => {
      let resolveSync!: () => void

      mocks.triggerSync.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            isSyncing.value = true

            resolveSync = () => {
              isSyncing.value = false
              resolve()
            }
          }),
      )

      const wrapper = mountSideNav()
      const syncButton = wrapper.find('button[aria-label="Synchronize data now"]')

      await syncButton.trigger('click')

      expect(syncButton.attributes('disabled')).toBeDefined()
      expect(wrapper.find('.submit-spinner').exists()).toBe(true)

      resolveSync()
      await flushPromises()

      expect(syncButton.attributes('disabled')).toBeUndefined()
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)
    })

    it('prevents multiple manual synchronization requests while one is running', async () => {
      let resolveSync!: () => void

      mocks.triggerSync.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            isSyncing.value = true

            resolveSync = () => {
              isSyncing.value = false
              resolve()
            }
          }),
      )

      const wrapper = mountSideNav()
      const syncButton = wrapper.find('button[aria-label="Synchronize data now"]')

      await syncButton.trigger('click')

      expect(mocks.triggerSync).toHaveBeenCalledTimes(1)

      await syncButton.trigger('click')

      expect(mocks.triggerSync).toHaveBeenCalledTimes(1)

      resolveSync()
      await flushPromises()

      expect(isSyncing.value).toBe(false)
    })
  })
})
