import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import BellIcon from '@/components/Icons/BellIcon.vue'
import BellSlashIcon from '@/components/Icons/BellSlashIcon.vue'
import NotificationBell from '@/components/Notifications/NotificationBell.vue'
import {
  isPushNotificationSupported,
  isSubscribedToPushNotifications,
  subscribeToPushNotifications,
  syncPushSubscription,
  unsubscribeFromPushNotifications,
} from '@/services/pushNotifications'

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn<(message: string) => void>(),
  notifyError: vi.fn<(message: string) => void>(),
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifySuccess: notifySuccess,
    $notifyError: notifyError,
  }),
}))

vi.mock('@/services/pushNotifications', () => ({
  isPushNotificationSupported: vi.fn<() => boolean>(),
  isSubscribedToPushNotifications: vi.fn<() => Promise<boolean>>(),
  subscribeToPushNotifications: vi.fn<() => Promise<void>>(),
  unsubscribeFromPushNotifications: vi.fn<() => Promise<void>>(),
  syncPushSubscription: vi.fn<() => Promise<void>>(),
}))

const TOGGLE = '[data-testid="notification-toggle"]'
const ACTION = '[data-testid="notification-action"]'
const DROPDOWN = '#notification-dropdown'

function mountComponent() {
  return mount(NotificationBell, {
    attachTo: document.body,
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('NotificationBell', () => {
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

  beforeEach(() => {
    vi.resetAllMocks()

    vi.mocked(isPushNotificationSupported).mockReturnValue(true)
    vi.mocked(isSubscribedToPushNotifications).mockResolvedValue(false)
    vi.mocked(subscribeToPushNotifications).mockResolvedValue(undefined)
    vi.mocked(unsubscribeFromPushNotifications).mockResolvedValue(undefined)
    vi.mocked(syncPushSubscription).mockResolvedValue(undefined)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  describe('initial state', () => {
    it('renders the toggle with the dropdown closed', async () => {
      const mounted = await mountAndSettle()

      expect(mounted.find(TOGGLE).exists()).toBe(true)
      expect(mounted.find(DROPDOWN).exists()).toBe(false)
      expect(mounted.get(TOGGLE).attributes('aria-expanded')).toBe('false')
    })

    it('shows the disabled state when the browser is not subscribed', async () => {
      const mounted = await mountAndSettle()

      expect(isSubscribedToPushNotifications).toHaveBeenCalledTimes(1)
      expect(syncPushSubscription).not.toHaveBeenCalled()
      expect(mounted.findComponent(BellSlashIcon).exists()).toBe(true)
      expect(mounted.findComponent(BellIcon).exists()).toBe(false)
      expect(mounted.get(TOGGLE).attributes('aria-label')).toBe(
        'Notifications disabled. Manage notification settings',
      )
    })

    it('shows the enabled state and syncs the subscription when already subscribed', async () => {
      vi.mocked(isSubscribedToPushNotifications).mockResolvedValue(true)

      const mounted = await mountAndSettle()

      expect(syncPushSubscription).toHaveBeenCalledTimes(1)
      expect(mounted.findComponent(BellIcon).exists()).toBe(true)
      expect(mounted.findComponent(BellSlashIcon).exists()).toBe(false)
      expect(mounted.get(TOGGLE).attributes('aria-label')).toBe(
        'Notifications enabled. Manage notification settings',
      )
    })
  })

  describe('refreshing subscription status on mount', () => {
    it('notifies with the name and message of a DOMException', async () => {
      vi.mocked(isSubscribedToPushNotifications).mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError'),
      )

      await mountAndSettle()

      expect(notifyError).toHaveBeenCalledWith('NotAllowedError: Permission denied')
    })

    it('notifies with the message of a regular Error', async () => {
      vi.mocked(isSubscribedToPushNotifications).mockResolvedValue(true)
      vi.mocked(syncPushSubscription).mockRejectedValue(new Error('Sync failed'))

      await mountAndSettle()

      expect(notifyError).toHaveBeenCalledWith('Sync failed')
    })

    it('notifies with a fallback message for unknown errors', async () => {
      vi.mocked(isSubscribedToPushNotifications).mockRejectedValue('nope')

      await mountAndSettle()

      expect(notifyError).toHaveBeenCalledWith('Unable to update notification settings.')
    })
  })

  describe('dropdown', () => {
    it('opens and closes when the toggle is clicked', async () => {
      const mounted = await mountAndSettle()

      await mounted.get(TOGGLE).trigger('click')

      expect(mounted.find(DROPDOWN).exists()).toBe(true)
      expect(mounted.get(TOGGLE).attributes('aria-expanded')).toBe('true')

      await mounted.get(TOGGLE).trigger('click')

      expect(mounted.find(DROPDOWN).exists()).toBe(false)
    })

    it('shows the "turn on" content when not subscribed', async () => {
      const mounted = await openDropdown()

      expect(mounted.text()).toContain(
        'Receive important SmartPack alerts directly in your browser.',
      )
      expect(mounted.get(ACTION).text()).toBe('Turn on notifications')
      expect(mounted.get(ACTION).attributes('disabled')).toBeUndefined()
    })

    it('shows the "turn off" content when subscribed', async () => {
      vi.mocked(isSubscribedToPushNotifications).mockResolvedValue(true)

      const mounted = await openDropdown()

      expect(mounted.text()).toContain('Browser notifications are enabled on this device.')
      expect(mounted.get(ACTION).text()).toBe('Turn off notifications')
    })

    it('links to the notification tab of the profile page', async () => {
      const mounted = await openDropdown()

      expect(mounted.findComponent(RouterLinkStub).props('to')).toEqual({
        name: 'my-profile',
        query: { tabs: 'notification' },
      })
    })

    it('disables the action and explains when push is unsupported', async () => {
      vi.mocked(isPushNotificationSupported).mockReturnValue(false)

      const mounted = await openDropdown()

      expect(mounted.get(ACTION).attributes('disabled')).toBeDefined()
      expect(mounted.text()).toContain('Browser notifications are not supported by this browser.')
    })

    it('does not show the unsupported message when push is supported', async () => {
      const mounted = await openDropdown()

      expect(mounted.text()).not.toContain('not supported by this browser')
    })

    it('closes when clicking outside', async () => {
      const mounted = await openDropdown()

      document.body.click()
      await flushPromises()

      expect(mounted.find(DROPDOWN).exists()).toBe(false)
    })

    it('stays open when clicking inside', async () => {
      const mounted = await openDropdown()

      await mounted.get(`${DROPDOWN} h2`).trigger('click')

      expect(mounted.find(DROPDOWN).exists()).toBe(true)
    })

    it('closes when Escape is pressed', async () => {
      const mounted = await openDropdown()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()

      expect(mounted.find(DROPDOWN).exists()).toBe(false)
    })

    it('stays open when another key is pressed', async () => {
      const mounted = await openDropdown()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await flushPromises()

      expect(mounted.find(DROPDOWN).exists()).toBe(true)
    })

    it('removes document listeners when unmounted', async () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const mounted = await mountAndSettle()

      mounted.unmount()
      wrapper = null

      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      removeSpy.mockRestore()
    })
  })

  describe('toggleNotifications', () => {
    it('subscribes, notifies success and closes the dropdown', async () => {
      vi.mocked(isSubscribedToPushNotifications)
        .mockResolvedValueOnce(false) // on mount
        .mockResolvedValueOnce(true) // after subscribing
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(subscribeToPushNotifications).toHaveBeenCalledTimes(1)
      expect(unsubscribeFromPushNotifications).not.toHaveBeenCalled()
      expect(notifySuccess).toHaveBeenCalledWith('Browser notifications have been enabled.')
      expect(notifyError).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(false)
      expect(mounted.findComponent(BellIcon).exists()).toBe(true)
    })

    it('unsubscribes, notifies success and closes the dropdown', async () => {
      vi.mocked(isSubscribedToPushNotifications)
        .mockResolvedValueOnce(true) // on mount
        .mockResolvedValueOnce(false) // after unsubscribing
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(unsubscribeFromPushNotifications).toHaveBeenCalledTimes(1)
      expect(subscribeToPushNotifications).not.toHaveBeenCalled()
      expect(notifySuccess).toHaveBeenCalledWith('Browser notifications have been disabled.')
      expect(mounted.find(DROPDOWN).exists()).toBe(false)
      expect(mounted.findComponent(BellSlashIcon).exists()).toBe(true)
    })

    it('shows a loading state while the operation is in progress', async () => {
      let resolveSubscribe: () => void = () => undefined
      vi.mocked(subscribeToPushNotifications).mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSubscribe = resolve
          }),
      )
      vi.mocked(isSubscribedToPushNotifications)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')

      expect(mounted.get(ACTION).text()).toContain('Please wait...')
      expect(mounted.get(ACTION).attributes('disabled')).toBeDefined()
      expect(mounted.get(ACTION).attributes('aria-busy')).toBe('true')

      resolveSubscribe()
      await flushPromises()

      expect(notifySuccess).toHaveBeenCalledTimes(1)
      expect(mounted.find(ACTION).exists()).toBe(false)
    })

    it('reports an error when the browser state does not match the request', async () => {
      // Subscribe resolves but the browser still reports "not subscribed".
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenCalledWith('Unable to update browser notification settings.')
      expect(notifySuccess).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(true)
    })

    it('notifies with the error message and keeps the dropdown open when the operation fails', async () => {
      vi.mocked(subscribeToPushNotifications).mockRejectedValue(
        new Error('Notification permission was not granted.'),
      )
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenCalledWith('Notification permission was not granted.')
      expect(notifySuccess).not.toHaveBeenCalled()
      expect(mounted.find(DROPDOWN).exists()).toBe(true)
      expect(mounted.get(ACTION).attributes('disabled')).toBeUndefined()
      expect(mounted.get(ACTION).text()).toBe('Turn on notifications')
    })

    it('notifies with a fallback message for non-Error failures', async () => {
      vi.mocked(unsubscribeFromPushNotifications).mockRejectedValue('nope')
      vi.mocked(isSubscribedToPushNotifications).mockResolvedValue(true)
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenCalledWith('Unable to update notification settings.')
    })

    it('rechecks the actual browser state after a failure', async () => {
      vi.mocked(isSubscribedToPushNotifications)
        .mockResolvedValueOnce(false) // on mount
        .mockResolvedValueOnce(true) // recheck after failure
      vi.mocked(subscribeToPushNotifications).mockRejectedValue(new Error('Backend failed'))
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(isSubscribedToPushNotifications).toHaveBeenCalledTimes(2)
      expect(mounted.findComponent(BellIcon).exists()).toBe(true)
      expect(mounted.get(ACTION).text()).toBe('Turn off notifications')
    })

    it('notifies when rechecking the state after a failure also fails', async () => {
      vi.mocked(isSubscribedToPushNotifications)
        .mockResolvedValueOnce(false) // on mount
        .mockRejectedValueOnce(new Error('Status check failed'))
      vi.mocked(subscribeToPushNotifications).mockRejectedValue(new Error('Backend failed'))
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenNthCalledWith(1, 'Backend failed')
      expect(notifyError).toHaveBeenNthCalledWith(2, 'Status check failed')
    })

    it('uses a fallback message when the status recheck fails with a non-Error', async () => {
      vi.mocked(isSubscribedToPushNotifications)
        .mockResolvedValueOnce(false) // on mount
        .mockRejectedValueOnce('nope')
      vi.mocked(subscribeToPushNotifications).mockRejectedValue(new Error('Backend failed'))
      const mounted = await openDropdown()

      await mounted.get(ACTION).trigger('click')
      await flushPromises()

      expect(notifyError).toHaveBeenNthCalledWith(
        2,
        'Unable to refresh notification subscription status.',
      )
    })
  })
})
