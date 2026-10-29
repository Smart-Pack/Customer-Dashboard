import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import routes from './routes'

/**
 * Configures routing history according to the active Vite build mode.
 *
 * Mobile builds use hash-based routing for compatibility with the
 * Capacitor WebView. Web builds use HTML5 history mode.
 */
const history =
  import.meta.env.MODE === 'mobile'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL)

/**
 * Creates the application router.
 */
const router = createRouter({
  history,
  routes,
})

/**
 * Handles invalid routes by redirecting unmatched URLs to the
 * application's designated fallback route.
 */
router.beforeEach((to) => {
  if (to.matched.length === 0) {
    return { name: 'dashboard' }
  }
})

/**
 * Integrates Android's hardware Back button with Vue Router.
 *
 * Navigates to the previous route when possible. When there is no
 * previous route, minimizes the Android application.
 */
if (Capacitor.getPlatform() === 'android') {
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      router.back()
    } else {
      void App.minimizeApp()
    }
  })
}

export default router
