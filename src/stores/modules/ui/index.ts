import { defineStore } from 'pinia'
import type { RouteRecordNameGeneric } from 'vue-router'

export interface Breadcrumb {
  name: string
  breadcrumb: string
}

/**
 * UI state store.
 *
 * Manages global UI state such as SweetAlert2 backdrop visibility,
 * dashboard navigation state, theme preference, and breadcrumbs.
 */
export const useUiStore = defineStore('ui', {
  state: () => ({
    /**
     * Controls the visibility of the global SweetAlert2 backdrop.
     */
    swalBackdrop: false,

    /**
     * Controls the visibility of the mobile side navigation.
     */
    isSideNavOpen: false,

    /**
     * Theme preference:
     * 0 = follow system preference,
     * 1 = force light mode,
     * 2 = force dark mode.
     */
    themePreference: 0,

    /**
     * Tracks whether light mode is currently active.
     *
     * When themePreference is 0, this follows the system preference.
     */
    isLightMode: window.matchMedia('(prefers-color-scheme: light)').matches,

    /**
     * Stores the breadcrumb entries for the current dashboard route.
     *
     * Each entry contains the route name and the label displayed in the
     * breadcrumb navigation.
     */
    breadcrumbs: [] as Breadcrumb[],
  }),

  getters: {
    /**
     * Get the current SweetAlert2 backdrop visibility state.
     */
    getSwalBackdrop: (state) => state.swalBackdrop,

    /**
     * Get the current mobile side navigation visibility state.
     */
    getIsSideNavOpen: (state) => state.isSideNavOpen,

    /**
     * Get the current theme preference.
     */
    getThemePreference: (state) => state.themePreference,

    /**
     * Get the current light/dark mode state.
     */
    getIsLightMode: (state) => {
      if (state.themePreference === 1) {
        return true
      }

      if (state.themePreference === 2) {
        return false
      }

      return state.isLightMode
    },

    /**
     * Get the current breadcrumb entries.
     */
    getBreadcrumbs: (state) => state.breadcrumbs,

    /**
     * Check whether a breadcrumb exists for a given route.
     */
    hasBreadcrumb: (state) => {
      return (
        itemName: string,
        routeName: RouteRecordNameGeneric,
        parentName?: string,
      ): boolean => {
        if (parentName) {
          const hasParent = state.breadcrumbs.some((breadcrumb) => breadcrumb.name === parentName)

          const hasItem = state.breadcrumbs.some((breadcrumb) => breadcrumb.name === itemName)

          return hasParent && hasItem
        }

        if (itemName === 'dashboard') {
          return itemName === routeName
        }

        return state.breadcrumbs.some((breadcrumb) => breadcrumb.name === itemName)
      }
    },
  },

  actions: {
    /**
     * Update the SweetAlert2 backdrop visibility state.
     */
    updateSwalBackdrop(value: boolean) {
      this.swalBackdrop = value
    },

    /**
     * Update the current light mode state.
     *
     * The value is only changed when following the system preference.
     */
    updateIsLightMode(value: boolean) {
      if (this.themePreference === 0) {
        this.isLightMode = value
      }
    },

    /**
     * Update the theme preference and derive the active theme.
     *
     * @param value - 0 for system, 1 for light, 2 for dark.
     */
    updateThemePreference(value: number) {
      this.themePreference = value

      if (value === 1) {
        this.isLightMode = true
      } else if (value === 2) {
        this.isLightMode = false
      } else {
        this.isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches
      }
    },

    /**
     * Update the mobile side navigation visibility state.
     */
    updateIsSideNavOpen(value: boolean) {
      this.isSideNavOpen = value
    },

    /**
     * Update the current dashboard breadcrumb entries.
     */
    updateBreadcrumbs(value: Breadcrumb[]) {
      this.breadcrumbs = value
    },
  },
})

export type UiStore = ReturnType<typeof useUiStore>
