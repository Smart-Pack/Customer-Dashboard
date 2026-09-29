import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'

import DashboardLayout from '../index.vue'
import { useAuthStore, useUiStore } from '@/stores'

const USER_REFRESH_INTERVAL = 10 * 60 * 1000

const stubs = {
  TopBar: {
    name: 'TopBar',
    template: '<header data-testid="top-bar" />',
  },

  SideNav: {
    name: 'SideNav',
    template: '<nav data-testid="side-nav" />',
  },

  ContentHeader: {
    name: 'ContentHeader',
    template: '<header data-testid="content-header" />',
  },

  ContentFooter: {
    name: 'ContentFooter',
    template: '<footer data-testid="content-footer" />',
  },

  RouterView: {
    name: 'RouterView',
    template: '<div data-testid="router-view" />',
  },
}

describe('DashboardLayout', () => {
  let pinia: Pinia
  let uiStore: ReturnType<typeof useUiStore>
  let authStore: ReturnType<typeof useAuthStore>
  let fetchUserMock: ReturnType<typeof vi.fn<() => Promise<void>>>

  const mountDashboardLayout = (): VueWrapper =>
    mount(DashboardLayout, {
      global: {
        plugins: [pinia],
        stubs,
      },
    })

  beforeEach(() => {
    vi.useFakeTimers()

    pinia = createPinia()
    setActivePinia(pinia)

    uiStore = useUiStore(pinia)
    authStore = useAuthStore(pinia)

    fetchUserMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    authStore.fetchUser = fetchUserMock as unknown as typeof authStore.fetchUser

    uiStore.swalBackdrop = false
    uiStore.isSideNavOpen = false
    uiStore.isLightMode = true

    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders the dashboard layout components', () => {
      const wrapper = mountDashboardLayout()

      expect(wrapper.find('[data-testid="top-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="side-nav"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="content-header"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="content-footer"]').exists()).toBe(true)
    })

    it('does not render the notification backdrop when disabled', () => {
      const wrapper = mountDashboardLayout()

      expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
    })

    it('renders the notification backdrop when enabled', () => {
      uiStore.swalBackdrop = true

      const wrapper = mountDashboardLayout()

      const backdrop = wrapper.find('div.fixed.inset-0[aria-hidden="true"]')

      expect(backdrop.exists()).toBe(true)
      expect(backdrop.classes()).toContain('z-[1040]')
    })

    it('does not render the side navigation backdrop when the side navigation is closed', () => {
      uiStore.isSideNavOpen = false

      const wrapper = mountDashboardLayout()

      expect(wrapper.find('div.fixed.inset-0.z-\\[40\\]').exists()).toBe(false)
    })

    it('renders the side navigation backdrop when the side navigation is open', () => {
      uiStore.isSideNavOpen = true

      const wrapper = mountDashboardLayout()

      const backdrop = wrapper.find('div.fixed.inset-0.z-\\[40\\]')

      expect(backdrop.exists()).toBe(true)
      expect(backdrop.attributes('aria-hidden')).toBe('true')
    })
  })

  describe('initialization', () => {
    it('clears the notification backdrop on mount', () => {
      uiStore.swalBackdrop = true

      mountDashboardLayout()

      expect(uiStore.swalBackdrop).toBe(false)
    })

    it('closes the side navigation on mount', () => {
      uiStore.isSideNavOpen = true

      mountDashboardLayout()

      expect(uiStore.isSideNavOpen).toBe(false)
    })

    it('applies light mode on mount', () => {
      uiStore.isLightMode = true

      mountDashboardLayout()

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('applies dark mode on mount', () => {
      uiStore.isLightMode = false

      mountDashboardLayout()

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('theme synchronization', () => {
    it('adds the dark class when light mode changes to dark mode', async () => {
      const wrapper = mountDashboardLayout()

      uiStore.isLightMode = false

      await wrapper.vm.$nextTick()

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('removes the dark class when dark mode changes to light mode', async () => {
      uiStore.isLightMode = false

      const wrapper = mountDashboardLayout()

      expect(document.documentElement.classList.contains('dark')).toBe(true)

      uiStore.isLightMode = true

      await wrapper.vm.$nextTick()

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })
  describe('user refresh', () => {
    it('does not fetch the user immediately on mount', () => {
      mountDashboardLayout()

      expect(fetchUserMock).not.toHaveBeenCalled()
    })

    it('does not fetch the user before the interval has elapsed', () => {
      mountDashboardLayout()

      vi.advanceTimersByTime(USER_REFRESH_INTERVAL - 1)

      expect(fetchUserMock).not.toHaveBeenCalled()
    })

    it('fetches the user once the interval has elapsed', () => {
      mountDashboardLayout()

      vi.advanceTimersByTime(USER_REFRESH_INTERVAL)

      expect(fetchUserMock).toHaveBeenCalledTimes(1)
    })

    it('keeps fetching the user on every interval', () => {
      mountDashboardLayout()

      vi.advanceTimersByTime(USER_REFRESH_INTERVAL * 3)

      expect(fetchUserMock).toHaveBeenCalledTimes(3)
    })

    it('suppresses errors from a failed refresh', async () => {
      fetchUserMock.mockRejectedValue(new Error('Network error'))

      mountDashboardLayout()

      await vi.advanceTimersByTimeAsync(USER_REFRESH_INTERVAL)

      expect(fetchUserMock).toHaveBeenCalledTimes(1)
    })

    it('continues refreshing after a failed refresh', async () => {
      fetchUserMock.mockRejectedValueOnce(new Error('Network error'))

      mountDashboardLayout()

      await vi.advanceTimersByTimeAsync(USER_REFRESH_INTERVAL * 2)

      expect(fetchUserMock).toHaveBeenCalledTimes(2)
    })

    it('stops refreshing when the layout is unmounted', () => {
      const wrapper = mountDashboardLayout()

      wrapper.unmount()

      vi.advanceTimersByTime(USER_REFRESH_INTERVAL * 3)

      expect(fetchUserMock).not.toHaveBeenCalled()
    })

    it('does not stack timers when the layout is remounted', () => {
      mountDashboardLayout().unmount()
      mountDashboardLayout()

      vi.advanceTimersByTime(USER_REFRESH_INTERVAL)

      expect(fetchUserMock).toHaveBeenCalledTimes(1)
    })
  })
})
