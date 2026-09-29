import type { RouteRecordRaw } from 'vue-router'
import { RouterView } from 'vue-router'
import { h, type VNode } from 'vue'

/**
 * @module router/routes
 * @description Declares the application's Vue Router configuration, including dashboard/auth layouts,
 * nested feature routes for analytics, gateways, vouchers, sessions, content, users, SMEs, and the catch-all redirect.
 */

/**
 * Dummy wrapper component for nested routes.
 * This lets us declare groups of child routes under a single parent without introducing additional layout markup.
 *
 * @returns {VNode}
 */
const RouterViewWrapper = {
  name: 'RouterViewWrapper',
  render(): VNode {
    return h(RouterView)
  },
}
/**
 * Application routes.
 *
 * @type {RouteRecordRaw[]}
 */
const routes: RouteRecordRaw[] = [
  // Root redirect
  {
    path: '/',
    redirect: { name: 'dashboard' },
  },
  /**
   * Authentication routes.
   *
   * @type {RouteRecordRaw}
   */
  {
    path: '/auth',
    redirect: '/auth/login',
    component: () => import('@/layout/AuthLayout.vue'),
    children: [
      /**
       * Login page.
       *
       * @type {RouteRecordRaw}
       */
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/Auth/Login.vue'),
      },
      // 2FA page
      {
        path: '2FA',
        name: '2fa',
        component: () => import('@/views/Auth/TwoFactor.vue'),
        meta: { title: '2FA' },
      },
      // Forgot password page
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/Auth/ForgotPassword.vue'),
      },
      // Reset password page
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/views/Auth/ResetPassword.vue'),
      },
      {
        path: 'change-password',
        name: 'change-password',
        component: () => import('@/views/Auth/ChangePassword.vue'),
        meta: { requiresAuth: true, title: 'Finalize Account' },
      },
    ],
  },

  /**
   * Dashboard routes.
   *
   * @type {RouteRecordRaw}
   */
  {
    path: '/dashboard',
    component: () => import('@/layout/Dashboard/index.vue'),
    meta: /** @type {AppRouteMeta} */ {
      breadcrumb: 'Home',
      requiresAuth: true,
    },
    children: [
      // Dashboard home
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/Dashboard/index.vue'),
        meta: { breadcrumb: 'Home', title: 'Home' },
      },
      {
        path: 'my-profile',
        name: 'my-profile',
        component: () => import('@/views/Users/profile.vue'),
        meta: { breadcrumb: 'My Profile', title: 'My Profile' },
      },
      // Users section
      {
        path: 'users',
        name: 'users-parent',
        redirect: { name: 'users' },
        component: RouterViewWrapper,
        meta: { breadcrumb: 'Users' },
        children: [
          {
            path: '',
            name: 'users',
            component: () => import('@/views/Users/index.vue'),
            meta: { title: 'User Management', breadcrumb: 'Users' },
          },
          {
            path: ':id/details',
            name: 'user-details',
            component: () => import('@/views/Users/details.vue'),
            meta: { title: 'User Details', breadcrumb: 'User Details' },
          },
        ],
      },
      // SmartPacks section
      {
        path: 'smartpacks',
        name: 'smartpacks-parent',
        redirect: { name: 'smartpacks' },
        component: RouterViewWrapper,
        meta: { breadcrumb: 'SmartPacks' },
        children: [
          {
            path: '',
            name: 'smartpacks',
            component: () => import('@/views/Smartpacks/index.vue'),
            meta: { title: 'SmartPack Management', breadcrumb: 'SmartPacks' },
          },
          {
            path: ':id/details',
            name: 'smartpack-details',
            component: () => import('@/views/Smartpacks/details.vue'),
            meta: { title: 'SmartPack Details', breadcrumb: 'SmartPack Details' },
          },
        ],
      },
    ],
  },
  // Fallback route for any unmatched URL so users land on the dashboard
  {
    path: '/:pathMatch(.*)*',
    name: 'catch-all',
    redirect: (to) => ({
      name: 'dashboard',
      query: { redirect: to.fullPath },
    }),
  },
]

export default routes
