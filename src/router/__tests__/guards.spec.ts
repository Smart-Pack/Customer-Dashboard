import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

import { setupRouterGuard } from '../guards'
import routes from '../routes'
import { useAuthStore } from '@/stores/modules/auth'
import { useUiStore } from '@/stores/modules/ui'
import { mockUser } from '@/tests/constants'

describe('Router Guard', () => {
  let router: ReturnType<typeof createRouter>
  let authStore: ReturnType<typeof useAuthStore>
  let uiStore: ReturnType<typeof useUiStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    authStore = useAuthStore(pinia)
    uiStore = useUiStore(pinia)

    router = createRouter({
      history: createMemoryHistory(),
      routes,
    })

    setupRouterGuard(router, pinia)
  })

  describe('Document Title Management', () => {
    it('sets the title from route metadata', async () => {
      await router.push('/auth/login')

      expect(document.title).toBe('Login - SmartPack Admin')
    })

    it('formats the route name when metadata title is unavailable', async () => {
      await router.push('/auth/forgot-password')

      expect(document.title).toBe('Forgot Password - SmartPack Admin')
    })

    it('uses the default title when no metadata title or route name exists', async () => {
      router.addRoute({
        path: '/untitled',
        component: {},
      })

      await router.push('/untitled')

      expect(document.title).toBe('SmartPack Admin Dashboard')
    })
  })

  describe('Breadcrumbs', () => {
    beforeEach(() => {
      authStore.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: true,
        two_factor_enabled: false,
      }
    })
    it('clears breadcrumbs when navigating to a route without breadcrumb metadata', async () => {
      authStore.loggedInUser = null

      uiStore.breadcrumbs = [
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
      ]

      await router.push('/auth/login')

      expect(router.currentRoute.value.name).toBe('login')
      expect(uiStore.breadcrumbs).toEqual([])
    })

    it('creates a breadcrumb for a route with breadcrumb metadata', async () => {
      await router.push('/dashboard')

      expect(uiStore.breadcrumbs).toEqual([
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
      ])
    })
    it('creates the full breadcrumb trail for the user details route', async () => {
      await router.push('/dashboard/users/123/details')

      expect(uiStore.breadcrumbs).toEqual([
        {
          name: 'dashboard',
          breadcrumb: 'Home',
        },
        {
          name: 'users-parent',
          breadcrumb: 'Users',
        },
        {
          name: 'user-details',
          breadcrumb: 'User Details',
        },
      ])
    })
    it('removes duplicate breadcrumbs and keeps the named route', async () => {
      await router.push('/dashboard')

      expect(uiStore.breadcrumbs).toHaveLength(1)
      expect(uiStore.breadcrumbs[0]).toEqual({
        name: 'dashboard',
        breadcrumb: 'Home',
      })
    })
  })

  describe('Authentication', () => {
    it('allows unauthenticated users to access public routes', async () => {
      await router.push('/auth/forgot-password')

      expect(router.currentRoute.value.name).toBe('forgot-password')
    })

    it('redirects unauthenticated users from protected routes to login', async () => {
      await router.push('/dashboard')

      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
    })

    it('redirects fully authenticated users from public routes to dashboard', async () => {
      authStore.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: true,
        two_factor_enabled: false,
      }

      await router.push('/auth/forgot-password')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('redirects authenticated users who have not changed their password to change-password', async () => {
      authStore.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: false,
        two_factor_enabled: false,
      }

      await router.push('/dashboard')

      expect(router.currentRoute.value.name).toBe('change-password')
      expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
    })

    it('allows authenticated users who have not changed their password to access change-password', async () => {
      authStore.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: false,
        two_factor_enabled: false,
      }

      await router.push('/auth/change-password')

      expect(router.currentRoute.value.name).toBe('change-password')
    })

    it('redirects users who have already changed their password away from change-password', async () => {
      authStore.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: true,
        two_factor_enabled: false,
      }

      await router.push('/auth/change-password')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })

    it('allows fully authenticated users with a changed password to access protected routes', async () => {
      authStore.loggedInUser = {
        ...mockUser,
        changed_password_after_initial_login: true,
        two_factor_enabled: false,
      }

      await router.push('/dashboard')

      expect(router.currentRoute.value.name).toBe('dashboard')
    })
  })
})
