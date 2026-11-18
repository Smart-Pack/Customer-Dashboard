import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import BellIcon from '@/components/Icons/BellIcon.vue'
import BellSlashIcon from '@/components/Icons/BellSlashIcon.vue'
import { App } from '@capacitor/app'
import {
  addNotificationActionListener,
  isFirebaseMessagingSupported,
  isSubscribedToFCM,
  requestNotificationPermission,
  syncFCMDevice,
  unregisterFCMDevice,
} from '@/services/firebaseMessaging'

const {
  notifySuccess,
  notifyError,
  removeActionListener,
  removeAppStateListener,
  routerPush,
  notificationActionCallback,
  appStateCallback,
} = vi.hoisted(() => ({
  notifySuccess: vi.fn<(message: string) => void>(),
  notifyError: vi.fn<(message: string) => void>(),
  removeReceivedListener: vi.fn<() => void>(),
  removeActionListener: vi.fn<() => void>(),
  removeAppStateListener: vi.fn<() => Promise<void>>(async () => {}),
  routerPush: vi.fn<(to: string) => Promise<void>>(),
  notificationActionCallback:
    vi.fn<
      Parameters<typeof import('@/services/firebaseMessaging').addNotificationActionListener>[0]
    >(),
  appStateCallback: vi.fn<(state: import('@capacitor/app').AppState) => void>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: notifySuccess,
    $notifyError: notifyError,
    $router: {
      push: routerPush,
    },
  }),
}))

vi.mock('@/components/Notifications/NotificationContent.vue', () => ({
  default: {
    name: 'NotificationContent',
    props: ['unreadCount'],
    emits: ['unread-count-change'],
    template: `
      <div data-testid="notification-content">
        <span data-testid="content-unread-count">{{ unreadCount }}</span>
        <button
          data-testid="emit-unread-count"
          @click="$emit('unread-count-change', 5)"
        >
          Update unread count
        </button>
      </div>
    `,
  },
}))

vi.mock('@/services/pushNotifications', () => ({
  isPushNotificationSupported: vi.fn<() => boolean>(),
  isSubscribedToPushNotifications: vi.fn<() => Promise<boolean>>(),
  subscribeToPushNotifications: vi.fn<() => Promise<void>>(),
  unsubscribeFromPushNotifications: vi.fn<() => Promise<void>>(),
  syncPushSubscription: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/services/firebaseMessaging', () => ({
  addNotificationActionListener:
    vi.fn<typeof import('@/services/firebaseMessaging').addNotificationActionListener>(),
  isFirebaseMessagingSupported:
    vi.fn<typeof import('@/services/firebaseMessaging').isFirebaseMessagingSupported>(),
  isSubscribedToFCM: vi.fn<typeof import('@/services/firebaseMessaging').isSubscribedToFCM>(),
  requestNotificationPermission:
    vi.fn<typeof import('@/services/firebaseMessaging').requestNotificationPermission>(),
  syncFCMDevice: vi.fn<typeof import('@/services/firebaseMessaging').syncFCMDevice>(),
  unregisterFCMDevice: vi.fn<typeof import('@/services/firebaseMessaging').unregisterFCMDevice>(),
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn<typeof import('@capacitor/app').App.addListener>(),
  },
}))

const TOGGLE = '[data-testid="notification-toggle"]'
const ACTION = '[data-testid="notification-action"]'
const DROPDOWN = '#notification-dropdown'

let NotificationBell: typeof import('@/components/Notifications/NotificationBell.vue').default

function mountComponent() {
  return mount(NotificationBell, {
    attachTo: document.body,
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('NotificationBell - FCM', () => {
  let wrapper: ReturnType<typeof mountComponent> | null = null

  async function mountAndSettle() {
    wrapper = mountComponent()
    await flushPromises()
    return wrapper
  }

  async function openDropdown() {
    const mounted = await mountAndSettle()
    await mounted.get(TOGGLE).trigger('click')
    return mounted
  }

  beforeEach(async () => {
    vi.resetModules()
    vi.resetAllMocks()
    vi.stubEnv('MODE', 'mobile')

    vi.mocked(isFirebaseMessagingSupported).mockReturnValue(true)
    vi.mocked(isSubscribedToFCM).mockResolvedValue(false)
    vi.mocked(requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(syncFCMDevice).mockResolvedValue(undefined)
    vi.mocked(unregisterFCMDevice).mockResolvedValue(undefined)

    vi.mocked(addNotificationActionListener).mockImplementation(async (callback) => {
      notificationActionCallback.mockImplementation(callback)

      return {
        remove: removeActionListener,
      } as never
    })

    vi.mocked(App.addListener).mockImplementation((async (
      _event: string,
      callback: (state: import('@capacitor/app').AppState) => void,
    ) => {
      appStateCallback.mockImplementation(callback)

      return {
        remove: removeAppStateListener,
      }
    }) as unknown as typeof App.addListener)

    const module = await import('@/components/Notifications/NotificationBell.vue')
    NotificationBell = module.default
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllEnvs()
  })

  describe('initial state', () => {
    it('shows the disabled state when no active FCM registration exists', async () => {
      const mounted = await mountAndSettle()

      expect(isSubscribedToFCM).toHaveBeenCalledTimes(1)
      expect(syncFCMDevice).not.toHaveBeenCalled()
      expect(mounted.findComponent(BellSlashIcon).exists()).toBe(true)
      expect(mounted.findComponent(BellIcon).exists()).toBe(false)
      expect(mounted.get(TOGGLE).attributes('aria-label')).toBe(
        'Notifications disabled. Manage notification settings',
      )
    })

    it('shows the enabled state when an active FCM registration exists', async () => {
      vi.mocked(isSubscribedToFCM).mockResolvedValue(true)

      const mounted = await mountAndSettle()

      expect(syncFCMDevice).toHaveBeenCalledTimes(1)
      expect(mounted.findComponent(BellIcon).exists()).toBe(true)
      expect(mounted.findComponent(BellSlashIcon).exists()).toBe(false)
      expect(mounted.get(TOGGLE).attributes('aria-label')).toBe(
        'Notifications enabled. Manage notification settings',
      )
    })

    it('does not synchronize an FCM device when no active registration exists', async () => {
      vi.mocked(isSubscribedToFCM).mockResolvedValue(false)

      await mountAndSettle()

      expect(syncFCMDevice).not.toHaveBeenCalled()
    })
  })

  describe('platform support', () => {
    it('disables notification controls when Firebase Messaging is unsupported', async () => {
      vi.mocked(isFirebaseMessagingSupported).mockReturnValue(false)

      const mounted = await openDropdown()

      expect(mounted.get(ACTION).attributes('disabled')).toBeDefined()
      expect(mounted.text()).toContain('Notifications are not supported on this platform.')
    })

    it('does not register FCM notification listeners when Firebase Messaging is unsupported', async () => {
      vi.mocked(isFirebaseMessagingSupported).mockReturnValue(false)

      await mountAndSettle()

      expect(addNotificationActionListener).not.toHaveBeenCalled()
    })
  })

  describe('subscription', () => {
    it('requests permission and registers the FCM device', async () => {
      vi.mocked(isSubscribedToFCM)
        .mockResolvedValueOnce(false) // On mount.
        .mockResolvedValueOnce(true) // After subscribing.

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(requestNotificationPermission).toHaveBeenCalledTimes(1)
      expect(syncFCMDevice).toHaveBeenCalledTimes(1)
      expect(unregisterFCMDevice).not.toHaveBeenCalled()

      expect(notifySuccess).toHaveBeenCalledWith('Notifications have been enabled.')
      expect(notifyError).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(false)
      expect(mounted.findComponent(BellIcon).exists()).toBe(true)
    })

    it('does not register the FCM device when permission is denied', async () => {
      vi.mocked(requestNotificationPermission).mockResolvedValue(false)

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(requestNotificationPermission).toHaveBeenCalledTimes(1)
      expect(syncFCMDevice).not.toHaveBeenCalled()
      expect(notifyError).toHaveBeenCalledWith('Notification permission was not granted.')
      expect(notifySuccess).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(true)
    })

    it('reports an error when FCM registration fails', async () => {
      vi.mocked(syncFCMDevice).mockRejectedValue(new Error('FCM registration failed'))

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(requestNotificationPermission).toHaveBeenCalledTimes(1)
      expect(syncFCMDevice).toHaveBeenCalledTimes(1)
      expect(notifyError).toHaveBeenCalledWith('FCM registration failed')
      expect(notifySuccess).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(true)
    })

    it('reports a fallback error when FCM registration fails with a non-Error value', async () => {
      vi.mocked(syncFCMDevice).mockRejectedValue('nope')

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenCalledWith('Unable to update notification settings.')
    })

    it('does not register the FCM device when permission request fails', async () => {
      vi.mocked(requestNotificationPermission).mockRejectedValue(
        new Error('Permission request failed'),
      )

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(syncFCMDevice).not.toHaveBeenCalled()
      expect(notifyError).toHaveBeenCalledWith('Permission request failed')
    })
  })

  describe('unsubscription', () => {
    it('unregisters the FCM device and updates the UI', async () => {
      vi.mocked(isSubscribedToFCM)
        .mockResolvedValueOnce(true) // On mount.
        .mockResolvedValueOnce(false) // After unsubscribing.

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(unregisterFCMDevice).toHaveBeenCalledTimes(1)
      expect(requestNotificationPermission).not.toHaveBeenCalled()
      expect(syncFCMDevice).toHaveBeenCalledTimes(1) // Initial synchronization.

      expect(notifySuccess).toHaveBeenCalledWith('Notifications have been disabled.')
      expect(notifyError).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(false)
      expect(mounted.findComponent(BellSlashIcon).exists()).toBe(true)
    })

    it('reports an error when FCM unregistration fails', async () => {
      vi.mocked(isSubscribedToFCM).mockResolvedValue(true)
      vi.mocked(unregisterFCMDevice).mockRejectedValue(new Error('Unregistration failed'))

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(unregisterFCMDevice).toHaveBeenCalledTimes(1)
      expect(notifyError).toHaveBeenCalledWith('Unregistration failed')
      expect(notifySuccess).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(true)
    })

    it('reports a fallback error when unregistration fails with a non-Error value', async () => {
      vi.mocked(isSubscribedToFCM).mockResolvedValue(true)
      vi.mocked(unregisterFCMDevice).mockRejectedValue('nope')

      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenCalledWith('Unable to update notification settings.')
    })
  })

  describe('app state', () => {
    it('registers an app state listener on mobile', async () => {
      await mountAndSettle()

      expect(App.addListener).toHaveBeenCalledWith('appStateChange', expect.any(Function))
    })

    it('refreshes FCM subscription status when the app returns to the foreground', async () => {
      await mountAndSettle()

      expect(isSubscribedToFCM).toHaveBeenCalledTimes(1)

      await appStateCallback({ isActive: true })
      await flushPromises()

      expect(isSubscribedToFCM).toHaveBeenCalledTimes(2)
    })

    it('does not refresh FCM subscription status when the app moves to the background', async () => {
      await mountAndSettle()

      expect(isSubscribedToFCM).toHaveBeenCalledTimes(1)

      await appStateCallback({ isActive: false })
      await flushPromises()

      expect(isSubscribedToFCM).toHaveBeenCalledTimes(1)
    })

    it('retains the current subscription status when the foreground status check fails', async () => {
      vi.mocked(isSubscribedToFCM)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Network unavailable'))

      const mounted = await mountAndSettle()

      expect(mounted.findComponent(BellIcon).exists()).toBe(true)

      await appStateCallback({ isActive: true })
      await flushPromises()

      expect(mounted.findComponent(BellIcon).exists()).toBe(true)
      expect(notifyError).not.toHaveBeenCalled()
    })
  })

  describe('notification listeners', () => {
    it('removes FCM listeners when the component is unmounted', async () => {
      const mounted = await mountAndSettle()

      mounted.unmount()
      wrapper = null

      await flushPromises()

      expect(removeActionListener).toHaveBeenCalledTimes(1)
      expect(removeAppStateListener).toHaveBeenCalledTimes(1)
    })
    it('navigates to the notification URL when an FCM notification is tapped', async () => {
      await mountAndSettle()

      notificationActionCallback({
        data: {
          url: '/dashboard/smartpacks/12/details',
        },
      } as never)

      expect(routerPush).toHaveBeenCalledTimes(1)
      expect(routerPush).toHaveBeenCalledWith('/dashboard/smartpacks/12/details')
    })

    it('does not navigate when an FCM notification has no URL', async () => {
      await mountAndSettle()

      notificationActionCallback({
        title: 'SmartPack Alert',
        body: 'Weight limit exceeded.',
        data: {},
      } as never)

      expect(routerPush).not.toHaveBeenCalled()
    })

    it('does not navigate when the notification data is missing', async () => {
      await mountAndSettle()

      notificationActionCallback({
        title: 'SmartPack Alert',
      } as never)

      expect(routerPush).not.toHaveBeenCalled()
    })

    it('does not navigate to an external URL', async () => {
      await mountAndSettle()

      notificationActionCallback({
        data: {
          url: 'https://example.com',
        },
      } as never)

      expect(routerPush).not.toHaveBeenCalled()
    })

    it('does not navigate to a protocol-relative URL', async () => {
      await mountAndSettle()

      notificationActionCallback({
        data: {
          url: '//example.com',
        },
      } as never)

      expect(routerPush).not.toHaveBeenCalled()
    })
  })
})
