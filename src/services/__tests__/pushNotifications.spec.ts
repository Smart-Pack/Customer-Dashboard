// @/services/__tests__/pushNotifications.spec.ts
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pushSubscriptions } from '@/api/modules'
import {
  ensureServiceWorkerReady,
  isPushNotificationSupported,
  isSubscribedToPushNotifications,
  requestNotificationPermission,
  subscribeToPushNotifications,
  syncPushSubscription,
  unsubscribeFromPushNotifications,
} from '../pushNotifications'

// The VAPID key is read once at module load, so it must be set before the module is imported.
// '-_8' is URL-safe Base64 for the bytes [251, 255].
vi.hoisted(() => {
  vi.stubEnv('VITE_WEBPUSH_VAPID_PUBLIC_KEY', '-_8')
})

vi.mock('@/api/modules', () => ({
  pushSubscriptions: {
    create: vi.fn<(data: unknown) => Promise<unknown>>(),
    list: vi.fn<() => Promise<unknown>>(),
    remove: vi.fn<(id: string | number) => Promise<unknown>>(),
  },
}))

const UNSUPPORTED_MESSAGE = 'Push notifications are not supported by this browser.'
const ENDPOINT = 'https://push.example.com/abc'
const SUBSCRIPTION_JSON: PushSubscriptionJSON = {
  endpoint: ENDPOINT,
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

function createSubscription(json: PushSubscriptionJSON = SUBSCRIPTION_JSON) {
  return {
    endpoint: json.endpoint ?? '',
    toJSON: vi.fn<() => PushSubscriptionJSON>(() => json),
    unsubscribe: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  }
}

type MockSubscription = ReturnType<typeof createSubscription>
type MockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
  }
}
function createRegistration(existingSubscription: MockSubscription | null) {
  return {
    pushManager: {
      getSubscription: vi
        .fn<() => Promise<MockSubscription | null>>()
        .mockResolvedValue(existingSubscription),
      subscribe: vi.fn<(options: PushSubscriptionOptionsInit) => Promise<MockSubscription>>(),
    },
  }
}

interface BrowserOptions {
  permission?: NotificationPermission
  requestResult?: NotificationPermission
  existingSubscription?: MockSubscription | null
  registerError?: Error
}

/**
 * Stubs every browser API required for Web Push and returns the mocks.
 */
function stubSupportedBrowser(options: BrowserOptions = {}) {
  const {
    permission = 'granted',
    requestResult = permission,
    existingSubscription = null,
    registerError,
  } = options

  const registration = createRegistration(existingSubscription)

  const serviceWorker = {
    register: registerError
      ? vi.fn<() => Promise<MockServiceWorkerRegistration>>().mockRejectedValue(registerError)
      : vi.fn<() => Promise<MockServiceWorkerRegistration>>().mockResolvedValue(registration),

    ready: Promise.resolve(registration),

    getRegistration: vi
      .fn<() => Promise<MockServiceWorkerRegistration | undefined>>()
      .mockResolvedValue(registration),
  }

  const requestPermission = vi
    .fn<() => Promise<NotificationPermission>>()
    .mockResolvedValue(requestResult)

  vi.stubGlobal('navigator', { serviceWorker })
  vi.stubGlobal('PushManager', vi.fn())
  vi.stubGlobal('Notification', { permission, requestPermission })

  return { registration, serviceWorker, requestPermission }
}

describe('Push notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', {})
    Reflect.deleteProperty(globalThis, 'PushManager')
    Reflect.deleteProperty(globalThis, 'Notification')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  describe('isPushNotificationSupported', () => {
    it('returns true when all required APIs are available', () => {
      stubSupportedBrowser()

      expect(isPushNotificationSupported()).toBe(true)
    })

    it('returns false when the Service Worker API is missing', () => {
      stubSupportedBrowser()
      vi.stubGlobal('navigator', {})

      expect(isPushNotificationSupported()).toBe(false)
    })

    it('returns false when the Push API is missing', () => {
      stubSupportedBrowser()
      Reflect.deleteProperty(globalThis, 'PushManager')

      expect(isPushNotificationSupported()).toBe(false)
    })

    it('returns false when the Notifications API is missing', () => {
      stubSupportedBrowser()
      Reflect.deleteProperty(globalThis, 'Notification')

      expect(isPushNotificationSupported()).toBe(false)
    })
  })

  describe('isSubscribedToPushNotifications', () => {
    it('returns false when Web Push is unsupported', async () => {
      await expect(isSubscribedToPushNotifications()).resolves.toBe(false)
    })

    it('returns false when notification permission is not granted', async () => {
      const { serviceWorker } = stubSupportedBrowser({ permission: 'default' })

      await expect(isSubscribedToPushNotifications()).resolves.toBe(false)
      expect(serviceWorker.getRegistration).not.toHaveBeenCalled()
    })

    it('returns false when there is no service worker registration', async () => {
      const { serviceWorker } = stubSupportedBrowser()
      serviceWorker.getRegistration.mockResolvedValueOnce(undefined)

      await expect(isSubscribedToPushNotifications()).resolves.toBe(false)
    })

    it('returns false when there is no push subscription', async () => {
      stubSupportedBrowser({ existingSubscription: null })

      await expect(isSubscribedToPushNotifications()).resolves.toBe(false)
    })

    it('returns true when permission is granted and a subscription exists', async () => {
      const { serviceWorker } = stubSupportedBrowser({
        existingSubscription: createSubscription(),
      })

      await expect(isSubscribedToPushNotifications()).resolves.toBe(true)
      expect(serviceWorker.getRegistration).toHaveBeenCalledWith('/')
    })
  })

  describe('ensureServiceWorkerReady', () => {
    it('returns null when service workers are unsupported', async () => {
      await expect(ensureServiceWorkerReady()).resolves.toBeNull()
    })

    it('registers /sw.js and returns the ready registration', async () => {
      const { registration, serviceWorker } = stubSupportedBrowser()

      await expect(ensureServiceWorkerReady()).resolves.toBe(registration)
      expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js')
    })

    it('returns null and logs when registration fails', async () => {
      const error = new Error('registration failed')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      stubSupportedBrowser({ registerError: error })

      await expect(ensureServiceWorkerReady()).resolves.toBeNull()
      expect(consoleError).toHaveBeenCalledWith('Service worker registration failed:', error)

      consoleError.mockRestore()
    })
  })

  describe('requestNotificationPermission', () => {
    it('throws when Web Push is unsupported', async () => {
      await expect(requestNotificationPermission()).rejects.toThrow(UNSUPPORTED_MESSAGE)
    })

    it('returns the permission chosen by the user', async () => {
      const { requestPermission } = stubSupportedBrowser({
        permission: 'default',
        requestResult: 'denied',
      })

      await expect(requestNotificationPermission()).resolves.toBe('denied')
      expect(requestPermission).toHaveBeenCalledTimes(1)
    })
  })

  describe('subscribeToPushNotifications', () => {
    it('throws when Web Push is unsupported', async () => {
      await expect(subscribeToPushNotifications()).rejects.toThrow(UNSUPPORTED_MESSAGE)
    })

    it('throws when the VAPID public key is not configured', async () => {
      stubSupportedBrowser()
      vi.stubEnv('VITE_WEBPUSH_VAPID_PUBLIC_KEY', '')
      vi.resetModules()

      const freshModule = await import('../pushNotifications')

      await expect(freshModule.subscribeToPushNotifications()).rejects.toThrow(
        'The Web Push VAPID public key is not configured.',
      )
    })

    it('throws when notification permission is not granted', async () => {
      const { serviceWorker } = stubSupportedBrowser({
        permission: 'default',
        requestResult: 'denied',
      })

      await expect(subscribeToPushNotifications()).rejects.toThrow(
        'Notification permission was not granted.',
      )
      expect(serviceWorker.register).not.toHaveBeenCalled()
    })

    it('throws when the service worker cannot be registered', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      stubSupportedBrowser({ registerError: new Error('boom') })

      await expect(subscribeToPushNotifications()).rejects.toThrow(
        'Failed to register or activate service worker.',
      )
      expect(pushSubscriptions.create).not.toHaveBeenCalled()

      consoleError.mockRestore()
    })

    it('reuses an existing subscription and registers it with the backend', async () => {
      const existing = createSubscription()
      const { registration } = stubSupportedBrowser({ existingSubscription: existing })
      vi.mocked(pushSubscriptions.create).mockResolvedValueOnce(undefined as never)

      await subscribeToPushNotifications()

      expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
      expect(pushSubscriptions.create).toHaveBeenCalledWith({
        endpoint: ENDPOINT,
        subscription_info: SUBSCRIPTION_JSON,
      })
    })

    it('creates a new subscription using the decoded VAPID key', async () => {
      const created = createSubscription()
      const { registration } = stubSupportedBrowser({ existingSubscription: null })
      registration.pushManager.subscribe.mockResolvedValueOnce(created)
      vi.mocked(pushSubscriptions.create).mockResolvedValueOnce(undefined as never)

      await subscribeToPushNotifications()

      expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array([251, 255]),
      })
      expect(pushSubscriptions.create).toHaveBeenCalledWith({
        endpoint: ENDPOINT,
        subscription_info: SUBSCRIPTION_JSON,
      })
    })

    it('throws when the browser subscription has no endpoint', async () => {
      stubSupportedBrowser({ existingSubscription: createSubscription({}) })

      await expect(subscribeToPushNotifications()).rejects.toThrow(
        'The browser did not provide a valid push subscription endpoint.',
      )
      expect(pushSubscriptions.create).not.toHaveBeenCalled()
    })

    it('rethrows Axios errors from the backend as plain errors', async () => {
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.create).mockRejectedValueOnce(new AxiosError('Network Error'))

      await expect(subscribeToPushNotifications()).rejects.toThrow('Network Error')
    })

    it('rethrows non-Axios errors from the backend unchanged', async () => {
      const error = new Error('unexpected')
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.create).mockRejectedValueOnce(error)

      await expect(subscribeToPushNotifications()).rejects.toBe(error)
    })
  })

  describe('unsubscribeFromPushNotifications', () => {
    it('throws when Web Push is unsupported', async () => {
      await expect(unsubscribeFromPushNotifications()).rejects.toThrow(UNSUPPORTED_MESSAGE)
    })

    it('returns when there is no service worker registration', async () => {
      const { serviceWorker } = stubSupportedBrowser()
      serviceWorker.getRegistration.mockResolvedValueOnce(undefined)

      await expect(unsubscribeFromPushNotifications()).resolves.toBeUndefined()
      expect(pushSubscriptions.list).not.toHaveBeenCalled()
    })

    it('returns when there is no push subscription', async () => {
      stubSupportedBrowser({ existingSubscription: null })

      await expect(unsubscribeFromPushNotifications()).resolves.toBeUndefined()
      expect(pushSubscriptions.list).not.toHaveBeenCalled()
    })

    it('removes the backend record before unsubscribing the browser', async () => {
      const calls: string[] = []
      const subscription = createSubscription()
      subscription.unsubscribe.mockImplementationOnce(() => {
        calls.push('unsubscribe')
        return Promise.resolve(true)
      })
      stubSupportedBrowser({ existingSubscription: subscription })
      vi.mocked(pushSubscriptions.list).mockResolvedValueOnce({
        results: [
          { id: 1, endpoint: 'https://push.example.com/other' },
          { id: 2, endpoint: ENDPOINT },
        ],
      } as never)
      vi.mocked(pushSubscriptions.remove).mockImplementationOnce((() => {
        calls.push('remove')
        return Promise.resolve()
      }) as never)

      await unsubscribeFromPushNotifications()

      expect(pushSubscriptions.remove).toHaveBeenCalledWith(2)
      expect(calls).toEqual(['remove', 'unsubscribe'])
    })

    it('skips backend removal when no matching record exists', async () => {
      const subscription = createSubscription()
      stubSupportedBrowser({ existingSubscription: subscription })
      vi.mocked(pushSubscriptions.list).mockResolvedValueOnce({
        results: [{ id: 1, endpoint: 'https://push.example.com/other' }],
      } as never)

      await unsubscribeFromPushNotifications()

      expect(pushSubscriptions.remove).not.toHaveBeenCalled()
      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
    })

    it('rethrows Axios errors when listing subscriptions fails', async () => {
      const subscription = createSubscription()
      stubSupportedBrowser({ existingSubscription: subscription })
      vi.mocked(pushSubscriptions.list).mockRejectedValueOnce(new AxiosError('List failed'))

      await expect(unsubscribeFromPushNotifications()).rejects.toThrow('List failed')
      expect(subscription.unsubscribe).not.toHaveBeenCalled()
    })

    it('rethrows non-Axios errors when listing subscriptions fails', async () => {
      const error = new Error('unexpected list error')
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.list).mockRejectedValueOnce(error)

      await expect(unsubscribeFromPushNotifications()).rejects.toBe(error)
    })

    it('rethrows Axios errors when removing the backend record fails', async () => {
      const subscription = createSubscription()
      stubSupportedBrowser({ existingSubscription: subscription })
      vi.mocked(pushSubscriptions.list).mockResolvedValueOnce({
        results: [{ id: 1, endpoint: ENDPOINT }],
      } as never)
      vi.mocked(pushSubscriptions.remove).mockRejectedValueOnce(new AxiosError('Remove failed'))

      await expect(unsubscribeFromPushNotifications()).rejects.toThrow('Remove failed')
      expect(subscription.unsubscribe).not.toHaveBeenCalled()
    })

    it('rethrows non-Axios errors when removing the backend record fails', async () => {
      const error = new Error('unexpected remove error')
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.list).mockResolvedValueOnce({
        results: [{ id: 1, endpoint: ENDPOINT }],
      } as never)
      vi.mocked(pushSubscriptions.remove).mockRejectedValueOnce(error)

      await expect(unsubscribeFromPushNotifications()).rejects.toBe(error)
    })

    it('throws when the browser fails to unsubscribe', async () => {
      const subscription = createSubscription()
      subscription.unsubscribe.mockResolvedValueOnce(false)
      stubSupportedBrowser({ existingSubscription: subscription })
      vi.mocked(pushSubscriptions.list).mockResolvedValueOnce({ results: [] } as never)

      await expect(unsubscribeFromPushNotifications()).rejects.toThrow(
        'Failed to unsubscribe from browser push notifications.',
      )
    })
  })

  describe('syncPushSubscription', () => {
    it('does nothing when Web Push is unsupported', async () => {
      await expect(syncPushSubscription()).resolves.toBeUndefined()
      expect(pushSubscriptions.create).not.toHaveBeenCalled()
    })

    it('does nothing when notification permission is not granted', async () => {
      const { serviceWorker } = stubSupportedBrowser({ permission: 'denied' })

      await expect(syncPushSubscription()).resolves.toBeUndefined()
      expect(serviceWorker.register).not.toHaveBeenCalled()
      expect(pushSubscriptions.create).not.toHaveBeenCalled()
    })

    it('does nothing when the service worker cannot be initialized', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      stubSupportedBrowser({ registerError: new Error('boom') })

      await expect(syncPushSubscription()).resolves.toBeUndefined()
      expect(pushSubscriptions.create).not.toHaveBeenCalled()

      consoleError.mockRestore()
    })

    it('does nothing when there is no existing subscription', async () => {
      const { registration } = stubSupportedBrowser({ existingSubscription: null })

      await expect(syncPushSubscription()).resolves.toBeUndefined()
      expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
      expect(pushSubscriptions.create).not.toHaveBeenCalled()
    })

    it('sends the existing subscription to the backend', async () => {
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.create).mockResolvedValueOnce(undefined as never)

      await syncPushSubscription()

      expect(pushSubscriptions.create).toHaveBeenCalledWith({
        endpoint: ENDPOINT,
        subscription_info: SUBSCRIPTION_JSON,
      })
    })

    it('throws when the subscription endpoint is missing', async () => {
      stubSupportedBrowser({ existingSubscription: createSubscription({}) })

      await expect(syncPushSubscription()).rejects.toThrow(
        'The browser subscription endpoint is missing.',
      )
      expect(pushSubscriptions.create).not.toHaveBeenCalled()
    })

    it('rethrows Axios errors from the backend as plain errors', async () => {
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.create).mockRejectedValueOnce(new AxiosError('Sync failed'))

      await expect(syncPushSubscription()).rejects.toThrow('Sync failed')
    })

    it('rethrows non-Axios errors from the backend unchanged', async () => {
      const error = new Error('unexpected sync error')
      stubSupportedBrowser({ existingSubscription: createSubscription() })
      vi.mocked(pushSubscriptions.create).mockRejectedValueOnce(error)

      await expect(syncPushSubscription()).rejects.toBe(error)
    })
  })
})
