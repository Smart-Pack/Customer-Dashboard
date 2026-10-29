import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import SensorMeasurements from '@/components/Smartpacks/SensorMeasurements.vue'
import type {
  SmartPackSensorMeasurement,
  SmartPackSensorMeasurementListResult,
  SmartPackSensorMeasurementQueryParams,
} from '@/api/modules/smartpacks'

type EventHandler = (...args: unknown[]) => void

interface GrantedSubscription {
  topic: string
  qos: number
}

type SubscribeCallback = (error: Error | null, granted?: GrantedSubscription[]) => void

const ApexChartStub = defineComponent({
  name: 'ApexChart',
  setup() {
    return () => h('div', { 'data-testid': 'apex-chart' })
  },
})

const mocks = vi.hoisted(() => {
  const handlers: Record<string, EventHandler[]> = {}

  const mqttConfig = {
    host: '5848ed9496c8462bba6696c8aec939ea.s1.eu.hivemq.cloud',
    username: 'test-username',
    password: 'test-password',
  }

  const client = {
    on: vi.fn<(event: string, handler: EventHandler) => unknown>(),
    subscribe: vi.fn<(topic: string, options: unknown, callback: SubscribeCallback) => unknown>(),
    removeAllListeners: vi.fn<() => unknown>(),
    end: vi.fn<(force?: boolean, options?: unknown, callback?: () => void) => unknown>(),
  }

  const connect = vi.fn<(...args: unknown[]) => typeof client>(() => client)
  const fetchConfig = vi.fn<() => Promise<void>>()
  const listSensorMeasurements = vi.fn<(...args: unknown[]) => Promise<unknown>>()

  return {
    client,
    connect,
    fetchConfig,
    handlers,
    mqttConfig,
    listSensorMeasurements,
    emit(event: string, ...args: unknown[]) {
      for (const handler of handlers[event] ?? []) {
        handler(...args)
      }
    },
    resetHandlers() {
      for (const event of Object.keys(handlers)) {
        delete handlers[event]
      }
    },
  }
})

vi.mock('mqtt', () => ({
  default: {
    connect: mocks.connect,
  },
}))

vi.mock('@/api/modules/smartpacks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/modules/smartpacks')>()

  return {
    ...actual,
    listSensorMeasurements: mocks.listSensorMeasurements,
  }
})

vi.mock('@/stores', () => ({
  useMqttStore: () => ({
    config: mocks.mqttConfig,
    fetchConfig: mocks.fetchConfig,
  }),
}))

const SMARTPACK_ID = 12
const SMARTPACK_UID = 'd3f35a90-1234-4567-8901-abcdef123456'
const MQTT_TOPIC = `smartpacks/${SMARTPACK_UID}`

function createMeasurement(
  overrides: Partial<SmartPackSensorMeasurement> = {},
): SmartPackSensorMeasurement {
  return {
    id: 1,
    steps: 1200,
    weight: 4500,
    timestamp: '2026-10-27T10:00:00Z',
    created: '2026-10-27T10:00:01Z',
    updated: '2026-10-27T10:00:01Z',
    ...overrides,
  }
}

function createApiResponse(
  results: SmartPackSensorMeasurement[] = [],
  count = results.length,
): SmartPackSensorMeasurementListResult {
  return {
    count,
    next: null,
    previous: null,
    results,
  } as SmartPackSensorMeasurementListResult
}

function mountComponent() {
  return mount(SensorMeasurements, {
    props: {
      smartpackId: SMARTPACK_ID,
      smartpackUid: SMARTPACK_UID,
    },
    global: {
      components: {
        apexchart: ApexChartStub,
      },
    },
  })
}

async function connectMqtt(): Promise<void> {
  mocks.emit('connect')

  await flushPromises()
  await nextTick()
}

async function publishMeasurement(
  measurement: SmartPackSensorMeasurement & {
    smartpack_uid: string
  },
  event = 'sensor_measurement',
  topic = MQTT_TOPIC,
): Promise<void> {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      event,
      data: measurement,
    }),
  )

  mocks.emit('message', topic, payload)

  await nextTick()
}

function createMqttMeasurement(
  overrides: Partial<SmartPackSensorMeasurement> & {
    smartpack_uid?: string
  } = {},
): SmartPackSensorMeasurement & {
  smartpack_uid: string
} {
  const { smartpack_uid = SMARTPACK_UID, ...measurementOverrides } = overrides

  return {
    ...createMeasurement(measurementOverrides),
    smartpack_uid,
  }
}

describe('SensorMeasurements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resetHandlers()

    mocks.fetchConfig.mockResolvedValue(undefined)

    mocks.listSensorMeasurements.mockResolvedValue(createApiResponse())

    mocks.connect.mockReturnValue(mocks.client)

    mocks.client.on.mockImplementation((event: string, handler: EventHandler) => {
      mocks.handlers[event] ??= []
      mocks.handlers[event].push(handler)

      return mocks.client
    })

    mocks.client.subscribe.mockImplementation(
      (topic: string, _options: unknown, callback: SubscribeCallback) => {
        callback(null, [{ topic, qos: 0 }])

        return mocks.client
      },
    )

    mocks.client.removeAllListeners.mockImplementation(() => {
      mocks.resetHandlers()

      return mocks.client
    })

    mocks.client.end.mockImplementation(() => undefined)
  })

  describe('initial loading', () => {
    it('fetches sensor measurements for the selected SmartPack', async () => {
      const measurement = createMeasurement()

      mocks.listSensorMeasurements.mockResolvedValue(createApiResponse([measurement], 1))

      const wrapper = mountComponent()

      await flushPromises()

      expect(mocks.listSensorMeasurements).toHaveBeenCalledWith({
        smartpack: SMARTPACK_ID,
        page: 1,
        page_size: 100,
      } satisfies SmartPackSensorMeasurementQueryParams)

      expect(wrapper.text()).toContain('Sensor Measurements')
      expect(wrapper.text()).toContain('Recent Measurements')
      expect(wrapper.text()).toContain('4,500')

      wrapper.unmount()
    })

    it('shows the loading indicator while the API request is pending', async () => {
      let resolveRequest!: (result: SmartPackSensorMeasurementListResult) => void

      mocks.listSensorMeasurements.mockReturnValue(
        new Promise<SmartPackSensorMeasurementListResult>((resolve) => {
          resolveRequest = resolve
        }),
      )

      const wrapper = mountComponent()

      await nextTick()

      expect(wrapper.find('.loading-animation').exists()).toBe(true)

      resolveRequest(createApiResponse())

      await flushPromises()

      wrapper.unmount()
    })

    it('shows the empty state when there are no measurements', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('No sensor measurements available for this SmartPack.')

      wrapper.unmount()
    })

    it('displays an API error and allows retrying', async () => {
      mocks.listSensorMeasurements
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValueOnce(createApiResponse([createMeasurement()], 1))

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('Failed to load sensor measurements.')

      expect(wrapper.text()).toContain('Network unavailable')

      await wrapper.get('button').trigger('click')

      await flushPromises()

      expect(mocks.listSensorMeasurements).toHaveBeenCalledTimes(2)

      expect(wrapper.text()).toContain('Recent Measurements')

      wrapper.unmount()
    })

    it('displays summary cards and charts when measurements exist', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(
        createApiResponse(
          [
            createMeasurement({
              id: 1,
              steps: 1200,
              weight: 4500,
            }),
            createMeasurement({
              id: 2,
              steps: 1500,
              weight: 4700,
              timestamp: '2026-10-27T11:00:00Z',
            }),
          ],
          2,
        ),
      )

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('Latest Weight')
      expect(wrapper.text()).toContain('Cumulative Steps')
      expect(wrapper.text()).toContain('Total Measurements')
      expect(wrapper.findAll('[data-testid="apex-chart"]')).toHaveLength(2)

      wrapper.unmount()
    })
  })

  describe('MQTT connection', () => {
    it('fetches MQTT configuration and connects to the broker', async () => {
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

    it('subscribes to the selected SmartPack UUID topic', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(mocks.client.subscribe).toHaveBeenCalledWith(
        MQTT_TOPIC,
        { qos: 0 },
        expect.any(Function),
      )

      expect(wrapper.text()).toContain('Live sensor updates connected')

      wrapper.unmount()
    })

    it('shows disconnected status before the MQTT connection is established', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('Live sensor updates disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('shows disconnected status when the client goes offline', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      mocks.emit('offline')

      await nextTick()

      expect(wrapper.text()).toContain('Live sensor updates disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('shows disconnected status while reconnecting', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      mocks.emit('reconnect')

      await nextTick()

      expect(wrapper.text()).toContain('Live sensor updates disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('handles MQTT configuration failure without crashing', async () => {
      mocks.fetchConfig.mockRejectedValueOnce(new Error('MQTT configuration unavailable'))

      const wrapper = mountComponent()

      await flushPromises()

      expect(mocks.connect).not.toHaveBeenCalled()

      expect(wrapper.text()).toContain('Live sensor updates disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('handles a rejected MQTT subscription', async () => {
      mocks.client.subscribe.mockImplementation(
        (topic: string, _options: unknown, callback: SubscribeCallback) => {
          callback(null, [{ topic, qos: 128 }])

          return mocks.client
        },
      )

      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(wrapper.text()).toContain('Live sensor updates disconnected. Reconnecting...')

      wrapper.unmount()
    })

    it('disconnects and cleans up the MQTT client when unmounted', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      wrapper.unmount()

      expect(mocks.client.removeAllListeners).toHaveBeenCalled()
      expect(mocks.client.end).toHaveBeenCalledWith(true)
    })
  })

  describe('incoming MQTT measurements', () => {
    it('adds a valid live measurement to the list', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(
        createApiResponse(
          [
            createMeasurement({
              id: 1,
              steps: 1000,
              weight: 4000,
            }),
          ],
          1,
        ),
      )

      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 2,
          steps: 1500,
          weight: 4800,
          timestamp: '2026-10-27T11:00:00Z',
        }),
      )

      expect(wrapper.text()).toContain('4,800')
      expect(wrapper.text()).toContain('1,500')
      expect(wrapper.text()).toContain('2 measurements')

      wrapper.unmount()
    })

    it('updates the live measurement charts', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 10,
          steps: 2500,
          weight: 5200,
        }),
      )

      expect(wrapper.findAll('[data-testid="apex-chart"]')).toHaveLength(2)
      expect(wrapper.text()).toContain('5,200')
      expect(wrapper.text()).toContain('2,500')

      wrapper.unmount()
    })

    it('ignores duplicate measurement IDs', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      const measurement = createMqttMeasurement({
        id: 10,
        steps: 2500,
        weight: 5200,
      })

      await publishMeasurement(measurement)
      await publishMeasurement(measurement)

      expect(wrapper.text()).toContain('1 measurements')

      wrapper.unmount()
    })

    it('ignores measurements for another SmartPack UUID', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 20,
          smartpack_uid: 'another-smartpack-uuid',
          weight: 9900,
        }),
      )

      expect(wrapper.text()).not.toContain('9,900')
      expect(wrapper.text()).toContain('No sensor measurements available')

      wrapper.unmount()
    })

    it('ignores unrelated MQTT event types', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 20,
          weight: 9900,
        }),
        'notification',
      )

      expect(wrapper.text()).not.toContain('9,900')

      wrapper.unmount()
    })

    it('ignores messages delivered on another MQTT topic', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 20,
          weight: 9900,
        }),
        'sensor_measurement',
        'smartpacks/another-device',
      )

      expect(wrapper.text()).not.toContain('9,900')

      wrapper.unmount()
    })

    it('ignores malformed JSON without crashing', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      expect(() => {
        mocks.emit('message', MQTT_TOPIC, new TextEncoder().encode('{invalid json'))
      }).not.toThrow()

      wrapper.unmount()
    })

    it('ignores malformed measurement payloads', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      mocks.emit(
        'message',
        MQTT_TOPIC,
        new TextEncoder().encode(
          JSON.stringify({
            event: 'sensor_measurement',
            data: {
              id: 'invalid-id',
              smartpack_uid: SMARTPACK_UID,
              weight: 'not-a-number',
              steps: 100,
            },
          }),
        ),
      )

      expect(wrapper.text()).not.toContain('not-a-number')

      wrapper.unmount()
    })

    it('keeps the latest 100 measurements on page one', async () => {
      const initialMeasurements = Array.from({ length: 100 }, (_, index) =>
        createMeasurement({
          id: index + 1,
          steps: index * 10,
          weight: index * 100,
          timestamp: new Date(Date.UTC(2026, 9, 27, 0, index)).toISOString(),
        }),
      )

      mocks.listSensorMeasurements.mockResolvedValue(createApiResponse(initialMeasurements, 100))

      const wrapper = mountComponent()

      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 101,
          steps: 5000,
          weight: 6000,
          timestamp: '2026-10-27T12:00:00Z',
        }),
      )

      expect(wrapper.text()).toContain('6,000')
      expect(wrapper.text()).toContain('101 measurements')

      wrapper.unmount()
    })
  })

  describe('pagination', () => {
    it('displays pagination controls when there are multiple pages', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(createApiResponse([createMeasurement()], 250))

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('Page 1 of 3')
      expect(wrapper.find('button').exists()).toBe(true)
      expect(wrapper.text()).toContain('Next')

      wrapper.unmount()
    })

    it('loads the next page when Next is clicked', async () => {
      mocks.listSensorMeasurements
        .mockResolvedValueOnce(createApiResponse([createMeasurement()], 250))
        .mockResolvedValueOnce(
          createApiResponse(
            [
              createMeasurement({
                id: 101,
                weight: 6000,
              }),
            ],
            250,
          ),
        )

      const wrapper = mountComponent()

      await flushPromises()

      const nextButton = wrapper.findAll('button').find((button) => button.text() === 'Next')

      expect(nextButton).toBeDefined()

      await nextButton!.trigger('click')
      await flushPromises()

      expect(mocks.listSensorMeasurements).toHaveBeenLastCalledWith({
        smartpack: SMARTPACK_ID,
        page: 2,
        page_size: 100,
      })

      expect(wrapper.text()).toContain('Page 2 of 3')
      expect(wrapper.text()).toContain('6,000')

      wrapper.unmount()
    })

    it('loads the previous page when Previous is clicked', async () => {
      mocks.listSensorMeasurements
        .mockResolvedValueOnce(createApiResponse([createMeasurement()], 250))
        .mockResolvedValueOnce(
          createApiResponse(
            [
              createMeasurement({
                id: 101,
              }),
            ],
            250,
          ),
        )
        .mockResolvedValueOnce(
          createApiResponse(
            [
              createMeasurement({
                id: 1,
              }),
            ],
            250,
          ),
        )

      const wrapper = mountComponent()

      await flushPromises()

      const nextButton = wrapper.findAll('button').find((button) => button.text() === 'Next')

      expect(nextButton).toBeDefined()

      await nextButton!.trigger('click')
      await flushPromises()

      const previousButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Previous')

      expect(previousButton).toBeDefined()

      await previousButton!.trigger('click')
      await flushPromises()

      expect(mocks.listSensorMeasurements).toHaveBeenLastCalledWith({
        smartpack: SMARTPACK_ID,
        page: 1,
        page_size: 100,
      })

      expect(wrapper.text()).toContain('Page 1 of 3')

      wrapper.unmount()
    })

    it('updates the count for incoming measurements on a later page', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(createApiResponse([createMeasurement()], 250))

      const wrapper = mountComponent()

      await flushPromises()

      const nextButton = wrapper.findAll('button').find((button) => button.text() === 'Next')

      expect(nextButton).toBeDefined()

      await nextButton!.trigger('click')
      await flushPromises()
      await connectMqtt()

      await publishMeasurement(
        createMqttMeasurement({
          id: 300,
          weight: 5000,
        }),
      )

      expect(wrapper.text()).toContain('251 measurements')

      wrapper.unmount()
    })
  })

  describe('SmartPack changes', () => {
    it('fetches measurements and subscribes to the new SmartPack', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(createApiResponse([createMeasurement()], 1))

      const wrapper = mountComponent()

      await flushPromises()

      await wrapper.setProps({
        smartpackId: 25,
        smartpackUid: 'another-device-uuid',
      })

      await flushPromises()

      expect(mocks.listSensorMeasurements).toHaveBeenLastCalledWith({
        smartpack: 25,
        page: 1,
        page_size: 100,
      })

      expect(mocks.client.end).toHaveBeenCalledWith(true)

      wrapper.unmount()
    })
  })

  describe('formatting', () => {
    it('formats weight and step values using locale number formatting', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(
        createApiResponse(
          [
            createMeasurement({
              weight: 4500,
              steps: 1200,
            }),
          ],
          1,
        ),
      )

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('4,500')
      expect(wrapper.text()).toContain('1,200')

      wrapper.unmount()
    })

    it('formats measurement timestamps for display', async () => {
      mocks.listSensorMeasurements.mockResolvedValue(
        createApiResponse(
          [
            createMeasurement({
              timestamp: '2026-10-27T10:00:00Z',
            }),
          ],
          1,
        ),
      )

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.text()).toContain('2026')
      expect(wrapper.text()).toContain('Oct')

      wrapper.unmount()
    })
  })
})
