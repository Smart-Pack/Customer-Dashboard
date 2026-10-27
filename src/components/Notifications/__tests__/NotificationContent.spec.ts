import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import NotificationContent from '@/components/Notifications/NotificationContent.vue'
import { notifications as notificationsApi } from '@/api/modules'
import { useMqttStore } from '@/stores'
import { useGlobals } from '@/composables/useGlobals'
import { useRouter } from 'vue-router'

type NotificationListResult = Awaited<ReturnType<typeof notificationsApi.list>>
type TestNotification = NotificationListResult['results'][number]
type UpdateNotificationPayload = Parameters<typeof notificationsApi.edit>[1]
type UpdatedNotification = Awaited<ReturnType<typeof notificationsApi.edit>>

const mocks = vi.hoisted(() => {
  type EventHandler = (...args: unknown[]) => void

  interface MockMqttClient {
    removeAllListeners: ReturnType<typeof vi.fn<() => MockMqttClient>>
    end: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>
    connect: ReturnType<typeof vi.fn<(...args: unknown[]) => MockMqttClient>>
    on: ReturnType<typeof vi.fn<(event: string, handler: EventHandler) => MockMqttClient>>
    subscribe: ReturnType<
      typeof vi.fn<
        (
          topic: string,
          options: unknown,
          callback: (error: Error | null, granted?: Array<{ topic: string; qos: number }>) => void,
        ) => MockMqttClient
      >
    >
  }

  const handlers: Record<string, EventHandler[]> = {}

  const client: MockMqttClient = {
    removeAllListeners: vi.fn<() => MockMqttClient>(),
    end: vi.fn<(...args: unknown[]) => void>(),
    connect: vi.fn<(...args: unknown[]) => MockMqttClient>(),
    on: vi.fn<(event: string, handler: EventHandler) => MockMqttClient>(),
    subscribe:
      vi.fn<
        (
          topic: string,
          options: unknown,
          callback: (error: Error | null, granted?: Array<{ topic: string; qos: number }>) => void,
        ) => MockMqttClient
      >(),
  }

  client.on.mockImplementation((event, handler) => {
    handlers[event] ??= []
    handlers[event].push(handler)
    return client
  })

  client.removeAllListeners.mockImplementation(() => {
    Object.keys(handlers).forEach((event) => {
      delete handlers[event]
    })

    return client
  })

  client.connect.mockImplementation(() => client)

  client.subscribe.mockImplementation((_topic, _options, callback) => {
    callback(null, [{ topic: _topic, qos: 0 }])
    return client
  })

  return {
    handlers,
    client,

    emit: (event: string, ...args: unknown[]) => {
      for (const handler of handlers[event] ?? []) {
        handler(...args)
      }
    },

    connect: vi.fn<(...args: unknown[]) => MockMqttClient>(() => client),

    listNotifications: vi.fn<typeof notificationsApi.list>(),
    editNotification: vi.fn<typeof notificationsApi.edit>(),

    fetchConfig: vi.fn<ReturnType<typeof useMqttStore>['fetchConfig']>(),

    notifyError: vi.fn<ReturnType<typeof useGlobals>['$notifyError']>(),
    routerPush: vi.fn<ReturnType<typeof useRouter>['push']>(),

    userUuid: 'test-user-uuid',

    mqttConfig: {
      host: '5848ed9496c8462bba6696c8aec939ea.s1.eu.hivemq.cloud',
      port: 8884,
      use_tls: true,
      username: 'test-username',
      password: 'test-password',
    },
  }
})

vi.mock('mqtt', () => ({
  default: {
    connect: mocks.connect,
  },
}))

vi.mock('@/api/modules', () => ({
  notifications: {
    list: mocks.listNotifications,
    edit: mocks.editNotification,
  },
}))

vi.mock('@/composables/useGlobals', () => ({
  useGlobals: () => ({
    $notifyError: mocks.notifyError,
  }),
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    userUuid: mocks.userUuid,
  }),

  useMqttStore: () => ({
    config: mocks.mqttConfig,
    fetchConfig: mocks.fetchConfig,
  }),
}))

vi.mock('@/components/Icons/CloseIcon.vue', () => ({
  default: defineComponent({
    name: 'CloseIcon',
    setup() {
      return () => h('span', { 'data-testid': 'close-icon' })
    },
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
  }),
}))

const createNotification = (overrides: Partial<TestNotification> = {}): TestNotification =>
  ({
    id: 1,
    notification_type: 'smartpack_sos_alert',
    title: 'SmartPack SOS Alert',
    body: 'An SOS alert was triggered.',
    url: '/dashboard/smartpacks/1/details',
    data: {},
    read_at: null,
    dismissed_at: null,
    is_read: false,
    is_dismissed: false,
    created: '2026-10-27T10:00:00Z',
    updated: '2026-10-27T10:00:00Z',
    ...overrides,
  }) as TestNotification

function createApiResponse(
  results: TestNotification[] = [],
  count = results.length,
): NotificationListResult {
  return {
    count,
    next: null,
    previous: null,
    results,
  } as NotificationListResult
}

async function publishNotification(
  notification: TestNotification,
  event = 'notification',
): Promise<void> {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      event,
      data: notification,
    }),
  )

  mocks.emit('message', 'users/test-user-uuid', payload)

  await nextTick()
}

async function connectMqtt(): Promise<void> {
  mocks.emit('connect')

  await flushPromises()
  await nextTick()
}

function mountComponent(unreadCount = 0) {
  return mount(NotificationContent, {
    props: {
      unreadCount,
    },
  })
}

describe('NotificationContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.keys(mocks.handlers).forEach((key) => {
      delete mocks.handlers[key]
    })

    mocks.fetchConfig.mockResolvedValue(mocks.mqttConfig)

    mocks.listNotifications.mockResolvedValue(createApiResponse())

    mocks.editNotification.mockImplementation(
      async (
        id: Parameters<typeof notificationsApi.edit>[0],
        payload: UpdateNotificationPayload,
      ): Promise<UpdatedNotification> =>
        createNotification({
          id: Number(id),
          read_at: payload.read_at,
          is_read: true,
        }) as UpdatedNotification,
    )

    mocks.routerPush.mockResolvedValue(undefined)

    mocks.connect.mockReturnValue(mocks.client)

    mocks.client.connect.mockReturnValue(mocks.client)

    mocks.client.on.mockImplementation((event, handler) => {
      mocks.handlers[event] ??= []
      mocks.handlers[event].push(handler)
      return mocks.client
    })

    mocks.client.subscribe.mockImplementation(
      (
        topic: string,
        _options: unknown,
        callback: (error: Error | null, granted?: Array<{ topic: string; qos: number }>) => void,
      ) => {
        callback(null, [{ topic, qos: 0 }])
        return mocks.client
      },
    )

    mocks.client.removeAllListeners.mockImplementation(() => {
      Object.keys(mocks.handlers).forEach((key) => {
        delete mocks.handlers[key]
      })

      return mocks.client
    })
  })

  describe('initial loading', () => {
    it('fetches unread, non-dismissed notifications on mount', async () => {
      let resolveRequest!: (value: NotificationListResult) => void

      mocks.listNotifications.mockReturnValue(
        new Promise<NotificationListResult>((resolve) => {
          resolveRequest = resolve
        }),
      )

      const wrapper = mountComponent()

      await nextTick()

      expect(wrapper.text()).toContain('Loading notifications...')

      resolveRequest(createApiResponse([createNotification()], 1))

      await flushPromises()

      expect(mocks.listNotifications).toHaveBeenCalledWith({
        status: 'unread_not_dismissed',
        page_size: 20,
      })

      expect(wrapper.text()).toContain('SmartPack SOS Alert')

      wrapper.unmount()
    })

    it('displays the empty state when no notifications are returned', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('No unread notifications.')
      expect(wrapper.find('[aria-label="Unread notifications"]').exists()).toBe(false)

      wrapper.unmount()
    })

    it('displays the disconnected MQTT status initially', () => {
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('Live notifications disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('shows a loading indicator while the API request is pending', async () => {
      let resolveRequest!: (value: NotificationListResult) => void

      mocks.listNotifications.mockReturnValue(
        new Promise<NotificationListResult>((resolve) => {
          resolveRequest = resolve
        }),
      )

      const wrapper = mountComponent()

      await nextTick()

      expect(mocks.listNotifications).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('Loading notifications...')

      resolveRequest(createApiResponse())

      await flushPromises()

      wrapper.unmount()
    })

    it('formats notification dates for display', async () => {
      mocks.listNotifications.mockResolvedValue(createApiResponse([createNotification()]))

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.find('time').exists()).toBe(true)
      expect(wrapper.find('time').attributes('datetime')).toBe('2026-10-27T10:00:00Z')

      wrapper.unmount()
    })
  })

  describe('API errors and retry', () => {
    it('displays an error when fetching notifications fails', async () => {
      mocks.listNotifications.mockRejectedValue(new Error('Network unavailable'))

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.find('[role="alert"]').text()).toContain('Unable to load notifications.')

      expect(mocks.notifyError).toHaveBeenCalledWith('Network unavailable')

      wrapper.unmount()
    })

    it('retries fetching notifications when Retry is clicked', async () => {
      mocks.listNotifications
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValueOnce(createApiResponse([createNotification()], 1))

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.find('[role="alert"]').exists()).toBe(true)

      await wrapper.get('button').trigger('click')
      await flushPromises()

      expect(mocks.listNotifications).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('SmartPack SOS Alert')

      wrapper.unmount()
    })
  })

  describe('MQTT connection', () => {
    it('fetches MQTT configuration and connects to HiveMQ Cloud', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(mocks.fetchConfig).toHaveBeenCalledTimes(1)

      expect(mocks.connect).toHaveBeenCalledWith(
        'wss://5848ed9496c8462bba6696c8aec939ea.s1.eu.hivemq.cloud:8884/mqtt',
        expect.objectContaining({
          username: 'test-username',
          password: 'test-password',
          reconnectPeriod: 3000,
          connectTimeout: 15000,
          clean: true,
        }),
      )

      wrapper.unmount()
    })

    it('subscribes to the authenticated user notification topic', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(mocks.client.subscribe).toHaveBeenCalledWith(
        'users/test-user-uuid',
        { qos: 0 },
        expect.any(Function),
      )

      expect(wrapper.text()).toContain('Live notifications connected')

      wrapper.unmount()
    })

    it('displays a disconnected status when MQTT goes offline', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(wrapper.text()).toContain('Live notifications connected')

      mocks.emit('offline')
      await nextTick()

      expect(wrapper.text()).toContain('Live notifications disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('displays a disconnected status during reconnection', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(wrapper.text()).toContain('Live notifications connected')

      mocks.emit('reconnect')
      await nextTick()

      expect(wrapper.text()).toContain('Live notifications disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('does not connect if MQTT configuration is unavailable', async () => {
      mocks.fetchConfig.mockRejectedValueOnce(new Error('MQTT configuration unavailable'))

      const wrapper = mountComponent()

      await flushPromises()

      expect(mocks.connect).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('cleans up the MQTT connection when unmounted', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      wrapper.unmount()

      expect(mocks.client.removeAllListeners).toHaveBeenCalled()
      expect(mocks.client.end).toHaveBeenCalledWith(true)
    })
  })

  describe('incoming MQTT notifications', () => {
    it('adds a valid unread notification received over MQTT', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishNotification(createNotification({ id: 20 }))

      expect(wrapper.text()).toContain('SmartPack SOS Alert')
      expect(wrapper.text()).toContain('An SOS alert was triggered.')

      wrapper.unmount()
    })

    it('emits an updated unread count when a new notification arrives', async () => {
      mocks.listNotifications.mockResolvedValue(createApiResponse([], 2))

      const wrapper = mountComponent(2)

      await flushPromises()
      await connectMqtt()

      await publishNotification(createNotification({ id: 20 }))

      expect(wrapper.emitted('unread-count-change')).toContainEqual([3])

      wrapper.unmount()
    })

    it('ignores duplicate notification IDs', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      const notification = createNotification({ id: 20 })

      await publishNotification(notification)
      await publishNotification(notification)

      expect(wrapper.findAll('article')).toHaveLength(1)
      expect(wrapper.emitted('unread-count-change')).toContainEqual([1])

      wrapper.unmount()
    })

    it('ignores notifications that are already read', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      const countBefore = (wrapper.emitted('unread-count-change') ?? []).length

      await publishNotification(
        createNotification({
          id: 20,
          is_read: true,
          read_at: '2026-10-27T10:30:00Z',
        }),
      )

      expect(wrapper.text()).not.toContain('SmartPack SOS Alert')

      expect((wrapper.emitted('unread-count-change') ?? []).length).toBe(countBefore)

      wrapper.unmount()
    })

    it('ignores dismissed notifications', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishNotification(
        createNotification({
          id: 20,
          is_dismissed: true,
          dismissed_at: '2026-10-27T10:30:00Z',
        }),
      )

      expect(wrapper.text()).not.toContain('SmartPack SOS Alert')

      wrapper.unmount()
    })

    it('ignores unrelated MQTT event types', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishNotification(createNotification({ id: 20 }), 'sensor_update')

      expect(wrapper.text()).not.toContain('SmartPack SOS Alert')

      wrapper.unmount()
    })

    it('ignores messages published to another topic', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      mocks.emit(
        'message',
        'users/another-user',
        new TextEncoder().encode(
          JSON.stringify({
            event: 'notification',
            data: createNotification({ id: 20 }),
          }),
        ),
      )

      expect(wrapper.text()).not.toContain('SmartPack SOS Alert')

      wrapper.unmount()
    })

    it('ignores malformed JSON without crashing', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(() => {
        mocks.emit('message', 'users/test-user-uuid', new TextEncoder().encode('{invalid json'))
      }).not.toThrow()

      wrapper.unmount()
    })

    it('ignores malformed notification payloads', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      mocks.emit(
        'message',
        'users/test-user-uuid',
        new TextEncoder().encode(
          JSON.stringify({
            event: 'notification',
            data: {
              id: 'not-a-number',
              title: 'Invalid notification',
            },
          }),
        ),
      )

      expect(wrapper.text()).not.toContain('Invalid notification')

      wrapper.unmount()
    })

    it('limits the displayed notification list to 20 items', async () => {
      const notifications = Array.from({ length: 20 }, (_, index) =>
        createNotification({
          id: index + 1,
          title: `Notification ${index + 1}`,
        }),
      )

      mocks.listNotifications.mockResolvedValue(createApiResponse(notifications, 20))

      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishNotification(
        createNotification({
          id: 100,
          title: 'Newest notification',
          created: '2026-10-27T12:00:00Z',
        }),
      )

      expect(wrapper.findAll('article')).toHaveLength(20)
      expect(wrapper.text()).toContain('Newest notification')

      const titles = wrapper.findAll('article').map((article) => article.find('h3').text())

      expect(titles).toContain('Newest notification')
      expect(titles).not.toContain('Notification 20')

      wrapper.unmount()
    })
  })

  describe('marking notifications as read', () => {
    it('marks a notification as read and removes it from the unread list', async () => {
      const notification = createNotification()

      mocks.listNotifications.mockResolvedValue(createApiResponse([notification], 1))

      const wrapper = mountComponent(1)

      await flushPromises()

      await wrapper.get('[aria-label="Mark SmartPack SOS Alert as read"]').trigger('click')

      await flushPromises()

      expect(mocks.editNotification).toHaveBeenCalledWith(
        notification.id,
        expect.objectContaining({
          read_at: expect.any(String),
        }),
      )

      expect(wrapper.text()).toContain('No unread notifications.')
      expect(wrapper.emitted('unread-count-change')).toContainEqual([0])

      wrapper.unmount()
    })

    it('shows an error if marking a notification as read fails', async () => {
      mocks.listNotifications.mockResolvedValue(createApiResponse([createNotification()], 1))

      mocks.editNotification.mockRejectedValue(new Error('Unable to update notification'))

      const wrapper = mountComponent(1)

      await flushPromises()

      await wrapper.get('[aria-label="Mark SmartPack SOS Alert as read"]').trigger('click')

      await flushPromises()

      expect(mocks.notifyError).toHaveBeenCalledWith('Unable to update notification')

      expect(wrapper.text()).toContain('SmartPack SOS Alert')

      wrapper.unmount()
    })

    it('does not show a mark-as-read button for a read notification', async () => {
      mocks.listNotifications.mockResolvedValue(
        createApiResponse(
          [
            createNotification({
              is_read: true,
              read_at: '2026-10-27T10:30:00Z',
            }),
          ],
          1,
        ),
      )

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.find('[aria-label="Mark SmartPack SOS Alert as read"]').exists()).toBe(false)

      wrapper.unmount()
    })

    it('prevents duplicate mark-as-read requests while an update is pending', async () => {
      let resolveEdit!: (value: UpdatedNotification) => void

      mocks.listNotifications.mockResolvedValue(createApiResponse([createNotification()], 1))

      mocks.editNotification.mockReturnValue(
        new Promise<UpdatedNotification>((resolve) => {
          resolveEdit = resolve
        }),
      )

      const wrapper = mountComponent(1)

      await flushPromises()

      const button = wrapper.get('[aria-label="Mark SmartPack SOS Alert as read"]')

      await button.trigger('click')

      expect(mocks.editNotification).toHaveBeenCalledTimes(1)

      expect(
        wrapper.get('[aria-label="Mark SmartPack SOS Alert as read"]').attributes('disabled'),
      ).toBeDefined()

      resolveEdit(
        createNotification({
          is_read: true,
          read_at: '2026-10-27T10:30:00Z',
        }) as UpdatedNotification,
      )

      await flushPromises()

      wrapper.unmount()
    })
  })

  describe('opening notifications', () => {
    it('navigates to an internal notification URL', async () => {
      mocks.listNotifications.mockResolvedValue(createApiResponse([createNotification()], 1))

      const wrapper = mountComponent()

      await flushPromises()

      await wrapper.get('[aria-label="Open notification: SmartPack SOS Alert"]').trigger('click')

      await flushPromises()

      expect(mocks.routerPush).toHaveBeenCalledWith('/dashboard/smartpacks/1/details')

      wrapper.unmount()
    })
  })

  describe('unread count', () => {
    it('synchronizes the local count when the prop changes', async () => {
      const wrapper = mountComponent(2)

      await flushPromises()
      await wrapper.setProps({ unreadCount: 5 })

      await connectMqtt()

      await publishNotification(createNotification({ id: 20 }))

      expect(wrapper.emitted('unread-count-change')).toContainEqual([6])

      wrapper.unmount()
    })

    it('does not emit a negative unread count', async () => {
      mocks.listNotifications.mockResolvedValue(createApiResponse([createNotification()], 0))

      const wrapper = mountComponent(0)

      await flushPromises()

      await wrapper.get('[aria-label="Mark SmartPack SOS Alert as read"]').trigger('click')

      await flushPromises()

      const countEvents = wrapper.emitted('unread-count-change') ?? []

      expect(countEvents.every(([count]) => Number(count) >= 0)).toBe(true)

      wrapper.unmount()
    })
  })
})
