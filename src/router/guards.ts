// src/router/guards.ts

import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { useAuthStore, useUiStore } from '@/stores'
import type { RouteLocationNormalized } from 'vue-router'
import type { UiStore, Breadcrumb } from '@/stores/modules/ui'

/**
 * @module router/guards
 * @description Sets up the global navigation guard that formats document titles.
 */

/**
 * Format a route name into a human-readable title.
 *
 * @param name - Route name to format.
 * @returns Formatted route title.
 */
const formatTitle = (name: string): string =>
  name ? name.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : ''

/**
 * Updates the dashboard breadcrumbs based on the matched route records.
 *
 * Only routes with a `breadcrumb` meta property are included.
 * Duplicate breadcrumb labels are removed while preserving the first
 * matching route name.
 *
 * @param toRoute - The destination route.
 * @param uiStore - The UI store used to persist the breadcrumbs.
 */
function updateBreadcrumbs(toRoute: RouteLocationNormalized, uiStore: UiStore) {
  if (!toRoute.meta.breadcrumb) {
    uiStore.updateBreadcrumbs([])
    return
  }

  const breadcrumbs = Array.from(
    toRoute.matched
      .filter((route) => route.meta.breadcrumb)
      .reduce((map, route) => {
        const breadcrumb = String(route.meta.breadcrumb)
        const name = route.name ? String(route.name) : ''

        const existing = map.get(breadcrumb)

        if (!existing || (!existing.name && name)) {
          map.set(breadcrumb, {
            name,
            breadcrumb,
          })
        }

        return map
      }, new Map<string, Breadcrumb>())
      .values(),
  )

  if (breadcrumbs.length > 1) {
    breadcrumbs[0]!.name = 'dashboard'
  }

  uiStore.updateBreadcrumbs(breadcrumbs)
}
const MAX_REDIRECT_DEPTH = 5

/**
 * Returns a redirect destination without nested redirect parameters.
 *
 * Follows nested `redirect` query parameters up to a fixed depth, so a
 * malformed or cyclic chain can never loop forever.
 *
 * @param router - Vue Router instance.
 * @param fullPath - Current route's full path.
 * @param redirect - Existing redirect query parameter.
 * @returns A normalized redirect destination.
 */
function getRedirect(router: Router, fullPath: string, redirect: unknown): string {
  if (typeof redirect !== 'string' || !redirect) {
    return fullPath
  }

  let destination = redirect

  for (let depth = 0; depth < MAX_REDIRECT_DEPTH; depth++) {
    const nested = router.resolve(destination).query.redirect

    if (typeof nested !== 'string' || !nested) {
      return destination
    }

    destination = nested
  }

  return '/dashboard'
}
/**
 * Registers the global router guard.
 *
 * The guard manages document titles, breadcrumbs, authentication-based
 * route access, the initial password-change requirement, and
 * post-authentication redirects.
 *
 * Unauthenticated users can access public routes but are redirected to
 * the login page when attempting to access protected routes. The intended
 * destination is passed along in the `redirect` query parameter.
 *
 * Fully authenticated users are redirected to the dashboard when accessing
 * public routes. Users who have not changed their initial password must
 * access the change-password route before accessing other protected routes;
 * the intended destination is preserved in the `redirect` query parameter.
 *
 * Users who have changed their password cannot revisit the change-password
 * route and are sent to the dashboard instead. When such a user navigates
 * with a valid `redirect` query parameter, they are forwarded to that
 * destination, including its query parameters and hash.
 *
 * Nested `redirect` parameters are flattened to the innermost destination
 * (see {@link getRedirect}), so redirects cannot grow or loop.
 *
 * @param router - The Vue Router instance.
 * @param pinia - The Pinia instance used to access the authentication and UI stores.
 */
export function setupRouterGuard(router: Router, pinia: Pinia): void {
  const authStore = useAuthStore(pinia)
  const uiStore = useUiStore(pinia)

  router.beforeEach((toRoute) => {
    updateBreadcrumbs(toRoute, uiStore)

    document.title = toRoute.meta.title
      ? `${toRoute.meta.title} - SmartPack Platform`
      : toRoute.name
        ? `${formatTitle(String(toRoute.name))} - SmartPack Platform`
        : 'SmartPack Platform Dashboard'

    // Normalized redirect destination: the existing `redirect` param with any
    // nesting removed, or the current route's full path when none is present.
    const redirect = getRedirect(router, toRoute.fullPath, toRoute.query.redirect)

    // Unauthenticated users.
    if (!authStore.isFullyAuthenticated) {
      // Public routes are always accessible.
      if (!toRoute.meta.requiresAuth) {
        return true
      }

      // Protected routes send the user to login, keeping the intended destination.
      return {
        name: 'login',
        query: { redirect },
      }
    }

    // Authenticated users are redirected away from public routes.
    if (!toRoute.meta.requiresAuth) {
      return { name: 'dashboard' }
    }

    // Users who have not changed their initial password must do so first,
    // keeping the intended destination for afterwards.
    if (!authStore.hasChangedPassword && toRoute.name !== 'change-password') {
      return {
        name: 'change-password',
        query: { redirect },
      }
    }

    // Users who have already changed their password cannot revisit change-password.
    if (authStore.hasChangedPassword && toRoute.name === 'change-password') {
      return { name: 'dashboard' }
    }

    // All authentication requirements are met: forward to the intended
    // destination if it is a valid, matched route different from the current one.
    // Requires `hasChangedPassword` so users still on change-password are not
    // bounced back and forth between it and their destination.
    if (authStore.hasChangedPassword && typeof toRoute.query.redirect === 'string') {
      const resolved = router.resolve(redirect)

      if (resolved.matched.length && resolved.name !== toRoute.name) {
        return { path: resolved.path, query: resolved.query, hash: resolved.hash }
      }
    }

    return true
  })
}
