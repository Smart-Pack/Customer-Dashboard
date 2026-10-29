import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface WaitUntilEvent {
  waitUntil: ReturnType<typeof vi.fn<(promise: Promise<unknown>) => void>>
}

interface PushEvent extends WaitUntilEvent {
  data: {
    json: () => unknown
    text?: () => string
  } | null
}

interface NotificationClickEvent extends WaitUntilEvent {
  notification: {
    data: { url: string }
    close: ReturnType<typeof vi.fn<() => void>>
  }
}

interface ServiceWorkerClient {
  url: string
  navigate: ReturnType<typeof vi.fn<(url: string) => Promise<void>>>
  focus: ReturnType<typeof vi.fn<() => Promise<void>>>
}

interface ServiceWorkerClients {
  matchAll: ReturnType<typeof vi.fn<() => Promise<ServiceWorkerClient[]>>>
  openWindow: ReturnType<typeof vi.fn<(url: string) => Promise<void>>>
}

interface MockServiceWorker {
  location: {
    origin: string
  }
  addEventListener: ReturnType<
    typeof vi.fn<(event: string, callback: (event: unknown) => void) => void>
  >
  registration: {
    showNotification: ReturnType<
      typeof vi.fn<(title: string, options: Record<string, unknown>) => Promise<void>>
    >
  }
  clients: ServiceWorkerClients
}

type ServiceWorkerListener = (event: unknown) => void

const serviceWorkerPath = resolve(process.cwd(), 'public/sw.js')
const serviceWorkerSource = readFileSync(serviceWorkerPath, 'utf8')

describe('Service Worker', () => {
  let listeners: Record<string, ServiceWorkerListener>
  let mockSelf: MockServiceWorker
  let mockConsole: { error: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    listeners = {}

    mockConsole = {
      error: vi.fn<(...args: unknown[]) => void>(),
    }

    mockSelf = {
      location: {
        origin: 'https://smartpack.example.com',
      },
      addEventListener: vi.fn<(event: string, callback: ServiceWorkerListener) => void>(
        (event, callback) => {
          listeners[event] = callback
        },
      ),
      registration: {
        showNotification: vi
          .fn<(title: string, options: Record<string, unknown>) => Promise<void>>()
          .mockResolvedValue(undefined),
      },
      clients: {
        matchAll: vi.fn<() => Promise<ServiceWorkerClient[]>>().mockResolvedValue([]),
        openWindow: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
      },
    }

    runInNewContext(serviceWorkerSource, {
      self: mockSelf,
      console: mockConsole,
      URL,
    })
  })

  function dispatchEvent(eventName: string, event: unknown): void {
    const listener = listeners[eventName]

    if (!listener) {
      throw new Error(`Service worker event listener "${eventName}" was not registered.`)
    }

    listener(event)
  }

  function createWaitUntilEvent() {
    const promises: Promise<unknown>[] = []

    return {
      promises,
      waitUntil: vi.fn<(promise: Promise<unknown>) => void>((promise) => {
        promises.push(promise)
      }),
    }
  }

  describe('push event', () => {
    it('does nothing when the event has no data', () => {
      dispatchEvent('push', {
        data: null,
        ...createWaitUntilEvent(),
      } satisfies PushEvent)

      expect(mockSelf.registration.showNotification).not.toHaveBeenCalled()
    })

    it('displays a notification using the JSON payload', async () => {
      const event = {
        data: {
          json: () => ({
            title: 'SmartPack Alert',
            body: 'Your bag is too heavy.',
            url: '/dashboard/alerts',
            tag: 'heavy-bag',
            data: {
              alertId: 'alert-123',
            },
          }),
        },
        ...createWaitUntilEvent(),
      } satisfies PushEvent

      dispatchEvent('push', event)

      expect(mockSelf.registration.showNotification).toHaveBeenCalledWith('SmartPack Alert', {
        body: 'Your bag is too heavy.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: {
          url: '/dashboard/alerts',
          alertId: 'alert-123',
        },
        tag: 'heavy-bag',
        renotify: false,
      })

      await Promise.all(event.promises)
    })

    it('uses default title and body when payload fields are missing', async () => {
      const event = {
        data: {
          json: () => ({}),
        },
        ...createWaitUntilEvent(),
      } satisfies PushEvent

      dispatchEvent('push', event)

      expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
        'SmartPack Notification',
        expect.objectContaining({
          body: 'You have a new notification.',
        }),
      )

      await Promise.all(event.promises)
    })

    it('falls back to plain text when JSON parsing fails', async () => {
      const event = {
        data: {
          json: () => {
            throw new Error('Invalid JSON')
          },
          text: () => 'A plain-text notification',
        },
        ...createWaitUntilEvent(),
      } satisfies PushEvent

      dispatchEvent('push', event)

      expect(mockConsole.error).toHaveBeenCalled()
      expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
        'SmartPack Notification',
        expect.objectContaining({
          body: 'A plain-text notification',
        }),
      )

      await Promise.all(event.promises)
    })
  })

  describe('notificationclick event', () => {
    function createClickEvent(url: string) {
      return {
        ...createWaitUntilEvent(),
        notification: {
          data: { url },
          close: vi.fn<() => void>(),
        },
      } satisfies NotificationClickEvent
    }

    it('closes the notification and navigates an existing window', async () => {
      const client: ServiceWorkerClient = {
        url: 'https://smartpack.example.com/',
        navigate: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
        focus: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      }

      mockSelf.clients.matchAll.mockResolvedValue([client])

      const event = createClickEvent('/dashboard/alerts')

      dispatchEvent('notificationclick', event)

      expect(event.notification.close).toHaveBeenCalled()
      expect(mockSelf.clients.matchAll).toHaveBeenCalledWith({
        type: 'window',
        includeUncontrolled: true,
      })

      await Promise.all(event.promises)

      expect(client.navigate).toHaveBeenCalledWith('https://smartpack.example.com/dashboard/alerts')
      expect(client.focus).toHaveBeenCalled()
      expect(mockSelf.clients.openWindow).not.toHaveBeenCalled()
    })

    it('opens a new window when no existing window is available', async () => {
      mockSelf.clients.matchAll.mockResolvedValue([])

      const event = createClickEvent('/dashboard')

      dispatchEvent('notificationclick', event)

      await Promise.all(event.promises)

      expect(mockSelf.clients.openWindow).toHaveBeenCalledWith(
        'https://smartpack.example.com/dashboard',
      )
    })

    it('does not navigate to an external URL', () => {
      const event = createClickEvent('https://malicious.example.org')

      dispatchEvent('notificationclick', event)

      expect(event.notification.close).toHaveBeenCalled()
      expect(event.waitUntil).not.toHaveBeenCalled()
      expect(mockSelf.clients.openWindow).not.toHaveBeenCalled()
    })
  })
})
