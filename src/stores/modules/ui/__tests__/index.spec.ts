import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useUiStore } from '../index'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '(prefers-color-scheme: light)',
      onchange: null,
      addListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
      dispatchEvent: vi.fn<() => boolean>(),
    }))
  })

  describe('initial state', () => {
    it('sets swalBackdrop to false', () => {
      const store = useUiStore()

      expect(store.swalBackdrop).toBe(false)
    })

    it('sets side navigation to closed', () => {
      const store = useUiStore()

      expect(store.isSideNavOpen).toBe(false)
    })

    it('sets theme preference to system', () => {
      const store = useUiStore()

      expect(store.themePreference).toBe(0)
    })

    it('detects light mode from the system preference', () => {
      const store = useUiStore()

      expect(store.isLightMode).toBe(true)
    })

    it('detects dark mode from the system preference', () => {
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        media: '(prefers-color-scheme: light)',
        onchange: null,
        addListener: vi.fn<() => void>(),
        removeListener: vi.fn<() => void>(),
        addEventListener: vi.fn<() => void>(),
        removeEventListener: vi.fn<() => void>(),
        dispatchEvent: vi.fn<() => boolean>(),
      }))

      const store = useUiStore()

      expect(store.isLightMode).toBe(false)
    })

    it('initializes breadcrumbs as an empty array', () => {
      const store = useUiStore()

      expect(store.breadcrumbs).toEqual([])
    })
  })

  describe('getters', () => {
    it('returns the SweetAlert2 backdrop state', () => {
      const store = useUiStore()

      expect(store.getSwalBackdrop).toBe(false)

      store.swalBackdrop = true

      expect(store.getSwalBackdrop).toBe(true)
    })

    it('returns the side navigation state', () => {
      const store = useUiStore()

      expect(store.getIsSideNavOpen).toBe(false)

      store.isSideNavOpen = true

      expect(store.getIsSideNavOpen).toBe(true)
    })

    it('returns the theme preference', () => {
      const store = useUiStore()

      expect(store.getThemePreference).toBe(0)

      store.themePreference = 1

      expect(store.getThemePreference).toBe(1)
    })

    it('returns the active light mode when following the system preference', () => {
      const store = useUiStore()

      expect(store.getIsLightMode).toBe(true)

      store.isLightMode = false

      expect(store.getIsLightMode).toBe(false)
    })

    it('returns light mode when light theme is explicitly selected', () => {
      const store = useUiStore()

      store.themePreference = 1
      store.isLightMode = false

      expect(store.getIsLightMode).toBe(true)
    })

    it('returns dark mode when dark theme is explicitly selected', () => {
      const store = useUiStore()

      store.themePreference = 2
      store.isLightMode = true

      expect(store.getIsLightMode).toBe(false)
    })

    it('returns the current breadcrumbs', () => {
      const store = useUiStore()

      store.breadcrumbs = [
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
      ]

      expect(store.getBreadcrumbs).toEqual([
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
      ])
    })

    describe('hasBreadcrumb', () => {
      it('returns true when the breadcrumb exists', () => {
        const store = useUiStore()

        store.breadcrumbs = [
          {
            name: 'dashboard',
            breadcrumb: 'Home',
          },
          {
            name: 'users',
            breadcrumb: 'Users',
          },
        ]

        expect(store.hasBreadcrumb('users', 'users')).toBe(true)
      })

      it('returns false when the breadcrumb does not exist', () => {
        const store = useUiStore()

        store.breadcrumbs = [
          {
            name: 'dashboard',
            breadcrumb: 'Home',
          },
        ]

        expect(store.hasBreadcrumb('users', 'users')).toBe(false)
      })

      it('checks both parent and child breadcrumbs when a parent is provided', () => {
        const store = useUiStore()

        store.breadcrumbs = [
          {
            name: 'dashboard',
            breadcrumb: 'Home',
          },
          {
            name: 'users',
            breadcrumb: 'Users',
          },
          {
            name: 'user-details',
            breadcrumb: 'User Details',
          },
        ]

        expect(store.hasBreadcrumb('user-details', 'user-details', 'users')).toBe(true)
      })

      it('returns false when the parent breadcrumb is missing', () => {
        const store = useUiStore()

        store.breadcrumbs = [
          {
            name: 'user-details',
            breadcrumb: 'User Details',
          },
        ]

        expect(store.hasBreadcrumb('user-details', 'user-details', 'users')).toBe(false)
      })

      it('checks the dashboard breadcrumb against the current route', () => {
        const store = useUiStore()

        expect(store.hasBreadcrumb('dashboard', 'dashboard')).toBe(true)
        expect(store.hasBreadcrumb('dashboard', 'users')).toBe(false)
      })
    })
  })

  describe('actions', () => {
    it('updates the SweetAlert2 backdrop state', () => {
      const store = useUiStore()

      store.updateSwalBackdrop(true)

      expect(store.swalBackdrop).toBe(true)
      expect(store.getSwalBackdrop).toBe(true)
    })

    it('updates the light mode state when following system preference', () => {
      const store = useUiStore()

      store.updateIsLightMode(false)

      expect(store.isLightMode).toBe(false)
      expect(store.getIsLightMode).toBe(false)
    })

    it('does not update light mode directly when an explicit theme is selected', () => {
      const store = useUiStore()

      store.updateThemePreference(1)
      store.updateIsLightMode(false)

      expect(store.isLightMode).toBe(true)
      expect(store.getIsLightMode).toBe(true)
    })

    it('sets light mode when light theme preference is selected', () => {
      const store = useUiStore()

      store.updateThemePreference(1)

      expect(store.themePreference).toBe(1)
      expect(store.isLightMode).toBe(true)
      expect(store.getIsLightMode).toBe(true)
    })

    it('sets dark mode when dark theme preference is selected', () => {
      const store = useUiStore()

      store.updateThemePreference(2)

      expect(store.themePreference).toBe(2)
      expect(store.isLightMode).toBe(false)
      expect(store.getIsLightMode).toBe(false)
    })

    it('follows the system preference when system theme is selected', () => {
      const store = useUiStore()

      store.updateThemePreference(2)
      store.updateThemePreference(0)

      expect(store.themePreference).toBe(0)
      expect(store.isLightMode).toBe(true)
    })

    it('updates the side navigation state', () => {
      const store = useUiStore()

      store.updateIsSideNavOpen(true)

      expect(store.isSideNavOpen).toBe(true)
      expect(store.getIsSideNavOpen).toBe(true)
    })

    it('updates the breadcrumbs', () => {
      const store = useUiStore()

      const breadcrumbs = [
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
        {
          name: 'users',
          breadcrumb: 'Users',
        },
      ]

      store.updateBreadcrumbs(breadcrumbs)

      expect(store.breadcrumbs).toEqual(breadcrumbs)
      expect(store.getBreadcrumbs).toEqual(breadcrumbs)
    })
  })
})
