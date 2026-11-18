import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

import SmartPackDetails from '@/views/Smartpacks/details.vue'
import AssignGroup from '@/components/Smartpacks/AssignGroup.vue'
import AssignChildForm from '@/components/Smartpacks/UpdateForm.vue'
import SmartPackQrComponent from '@/components/Smartpacks/QrCode.vue'
import BluetoothButton from '@/components/Smartpacks/BluetoothButton.vue'
import SensorMeasurements from '@/components/Smartpacks/SensorMeasurements.vue'

import type { SmartPack } from '@/api/modules/smartpacks'
import type { Group } from '@/api/modules/groups'
import type { ItemNotFoundError } from '@/api/types'
import type { SmartPackConfiguration, SmartPackSensorMessage } from '@/types/bluetooth'

const { mockFetchByIdWithCache, mockGetBluetoothMeasurements, mockSaveBluetoothMeasurements } =
  vi.hoisted(() => ({
    mockFetchByIdWithCache:
      vi.fn<
        (
          fetcher: () => Promise<import('@/api/modules/smartpacks').SmartPack>,
          repository: object,
          id: number,
        ) => Promise<import('@/api/modules/smartpacks').SmartPack>
      >(),
    mockGetBluetoothMeasurements: vi.fn<
      (smartpackId: number) => Promise<
        {
          smartpack_id: number
          weight: number
          steps: number
          timestamp: string
        }[]
      >
    >(),
    mockSaveBluetoothMeasurements: vi.fn<
      (
        smartpackId: number,
        measurements: {
          weight: number
          steps: number
          timestamp: string
        }[],
      ) => Promise<void>
    >(),
  }))

vi.mock('@/services/database', () => ({
  fetchByIdWithCache: mockFetchByIdWithCache,
  repositories: {
    smartpacks: {},
    bluetoothSensorMeasurements: {
      getBySmartPackId: mockGetBluetoothMeasurements,
      saveList: mockSaveBluetoothMeasurements,
    },
  },
}))

vi.mock('@/components/Smartpacks/BluetoothButton.vue', async () => {
  const { defineComponent, h } = await import('vue')

  return {
    default: defineComponent({
      name: 'BluetoothButton',
      props: {
        macAddress: {
          type: String,
          default: null,
        },
        isBluetoothConnected: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['update:isBluetoothConnected', 'message'],
      setup(_, { emit }) {
        return () =>
          h('div', { 'data-testid': 'bluetooth-button' }, [
            h(
              'button',
              {
                'data-testid': 'bluetooth-connect',
                onClick: () => emit('update:isBluetoothConnected', true),
              },
              'Connect',
            ),
            h(
              'button',
              {
                'data-testid': 'bluetooth-message',
                onClick: () =>
                  emit('message', {
                    type: 'sensors',
                    data: {
                      weight: 4250,
                      steps: 1250,
                    },
                  }),
              },
              'Send sensor message',
            ),
          ])
      },
    }),
  }
})

vi.mock('@/components/Smartpacks/SensorMeasurements.vue', async () => {
  const { defineComponent, h } = await import('vue')

  return {
    default: defineComponent({
      name: 'SmartPackSensorMeasurements',
      props: {
        smartpackId: { type: Number, required: true },
        smartpackUid: { type: String, required: true },
        isBluetoothConnected: { type: Boolean, required: true },
        sensorHistory: { type: Array, required: true },
      },
      setup() {
        return () => h('div', { 'data-testid': 'sensor-measurements' })
      },
    }),
  }
})

const mockGetById = vi.fn<(params: { id: string }) => Promise<SmartPack>>()

const mockAssignGroup =
  vi.fn<(id: string | number, payload: { group: number }) => Promise<string>>()

const mockUnassignGroup = vi.fn<(id: string | number) => Promise<string>>()

const mockNotifyError = vi.fn<(message: string) => void>()
const mockNotifySuccess = vi.fn<(message: string) => void>()

const mockDeleteModal =
  vi.fn<(title: string, name: string, options?: { text: string }) => Promise<boolean>>()

const mockRouterPush = vi.fn<(location: { name: string }) => void>()

const mockAuthStore = {
  fetchUser: vi.fn<() => Promise<void>>(),
  isGroupAdmin: vi.fn<(groupId: number) => boolean>(() => true),
}

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const mockFilters = {
  dateTime: (value: string) => `dateTime(${value})`,
  activeClass: (isOnline: boolean) => (isOnline ? 'is-online' : 'is-offline'),
}

const mockGroup = {
  id: 10,
  name: 'Primary School',
} as Group

const mockSmartPack: SmartPack = {
  id: 1,
  device_uid: 'SP-0001',
  hardware_model: 'SP-X1',
  imei: '490154203237518',
  firmware_version: '1.4.2',
  bluetooth_mac_address: null,
  last_seen: '2026-09-23T14:30:00Z',
  is_online: true,
  assigned_to: null,
  group: null,
  child_name: 'Amara',
  created: '2026-01-05T09:00:00.000Z',
  updated: '2026-09-23T14:30:00Z',
}

const mockConfiguration: SmartPackConfiguration = {
  weight_limit: 5000,
  delay: 30,
  com_mode: 1,
  wifi_settings: { ssid: 'HomeNetwork', password: 'secret123' },
  bluetooth_name: 'SmartPack-0001',
}

const mockAssignedSmartPack: SmartPack = {
  ...mockSmartPack,
  group: mockGroup,
}

const mockNotFoundError = (message = 'SmartPack not found', reload = false): ItemNotFoundError =>
  ({
    message,
    reload,
  }) as ItemNotFoundError

const mountView = () =>
  mount(SmartPackDetails, {
    global: {
      mocks: {
        $api: {
          smartpacks: {
            getById: mockGetById,
            assignGroup: mockAssignGroup,
            unassignGroup: mockUnassignGroup,
          },
        },
        $pinia: {},
        $filters: mockFilters,
        $notifyError: mockNotifyError,
        $notifySuccess: mockNotifySuccess,
        $deleteModal: mockDeleteModal,
        $route: {
          params: {
            id: mockSmartPack.id.toString(),
          },
        },
        $router: {
          push: mockRouterPush,
        },
      },
      stubs: {
        AssignGroup: {
          props: ['submitting', 'smartPack'],
          emits: ['close', 'assign'],
          template: `
            <div data-testid="assign-group-modal">
              <button
                type="button"
                data-testid="close-group-modal"
                @click="$emit('close', false)"
              >
                Close
              </button>
            </div>
          `,
        },
        InfoTooltip: {
          name: 'InfoTooltip',
          props: ['text', 'placement', 'label'],
          template: '<span data-testid="info-tooltip" />',
        },
        AssignChildForm: {
          props: ['initialValues'],
          emits: ['close'],
          template: `
            <div data-testid="assign-child-form">
              <button
                type="button"
                data-testid="close-child-form"
                @click="$emit('close', 'showDetails', true)"
              >
                Close
              </button>
            </div>
          `,
        },
        SmartPackQrComponent: {
          props: ['item'],
          emits: ['show-qr'],
          template: `
            <div data-testid="smartpack-qr">
              <button
                type="button"
                data-testid="close-qr"
                @click="$emit('show-qr', false)"
              >
                Close QR
              </button>
            </div>
          `,
        },
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  })

describe('SmartPackDetails', () => {
  beforeEach(() => {
    vi.stubEnv('MODE', 'test')

    vi.clearAllMocks()

    mockFetchByIdWithCache.mockImplementation((fetcher: () => Promise<SmartPack>) => fetcher())

    mockGetById.mockResolvedValue({ ...mockSmartPack })
    mockAssignGroup.mockResolvedValue('SmartPack assigned to group successfully')
    mockUnassignGroup.mockResolvedValue('SmartPack removed from group successfully')

    mockDeleteModal.mockResolvedValue(true)
    mockAuthStore.fetchUser.mockResolvedValue(undefined)
    mockAuthStore.isGroupAdmin.mockReturnValue(true)

    mockGetBluetoothMeasurements.mockResolvedValue([])
    mockSaveBluetoothMeasurements.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  describe('Fetching SmartPack details', () => {
    it('fetches SmartPack details using the route ID when mounted', async () => {
      mountView()

      await flushPromises()

      expect(mockFetchByIdWithCache).toHaveBeenCalledTimes(1)

      expect(mockFetchByIdWithCache).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Object),
        1,
      )

      expect(mockGetById).toHaveBeenCalledExactlyOnceWith({ id: '1' })
    })

    it('displays the SmartPack hardware model', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('SP-X1')
    })

    it('displays the SmartPack IMEI', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('490154203237518')
    })

    it('displays the firmware version', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('1.4.2')
    })

    it('displays the formatted last-seen timestamp', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain(`dateTime(${mockSmartPack.last_seen})`)
    })

    it('displays the formatted creation timestamp', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain(`dateTime(${mockSmartPack.created})`)
    })

    it('shows an error notification when fetching details fails', async () => {
      mockGetById.mockRejectedValueOnce(mockNotFoundError('Unable to load SmartPack'))

      mountView()

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to load SmartPack')
    })

    it('redirects to the SmartPacks list when the error requires a reload', async () => {
      mockGetById.mockRejectedValueOnce(mockNotFoundError('SmartPack not found', true))

      mountView()

      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'smartpacks',
      })
    })

    it('does not redirect when the error does not require a reload', async () => {
      mockGetById.mockRejectedValueOnce(mockNotFoundError('Unable to load SmartPack', false))

      mountView()

      await flushPromises()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })
    it('continues loading SmartPack details when fetching the user fails', async () => {
      mockAuthStore.fetchUser.mockRejectedValueOnce(new Error('Failed to fetch user'))

      const wrapper = mountView()

      await flushPromises()

      expect(mockAuthStore.fetchUser).toHaveBeenCalledExactlyOnceWith()
      expect(mockGetById).toHaveBeenCalledExactlyOnceWith({ id: '1' })
      expect(wrapper.text()).toContain(mockSmartPack.hardware_model)
      expect(mockNotifyError).not.toHaveBeenCalled()
    })
    it('renders sensor measurements for the current SmartPack', async () => {
      const wrapper = mountView()

      await flushPromises()

      const measurements = wrapper.findComponent(SensorMeasurements)

      expect(measurements.exists()).toBe(true)
      expect(measurements.props('smartpackId')).toBe(mockSmartPack.id)
      expect(measurements.props('smartpackUid')).toBe(mockSmartPack.device_uid)
    })
  })
  describe('Bluetooth integration', () => {
    it('renders the Bluetooth button in mobile mode', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.find('[data-testid="bluetooth-button"]').exists()).toBe(true)
    })

    it('does not render the Bluetooth button outside mobile mode', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.find('[data-testid="bluetooth-button"]').exists()).toBe(false)
    })

    it('passes the SmartPack Bluetooth MAC address to BluetoothButton', async () => {
      vi.stubEnv('MODE', 'mobile')

      const macAddress = 'AA:BB:CC:DD:EE:FF'

      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        bluetooth_mac_address: macAddress,
      })

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      expect(bluetoothButton.exists()).toBe(true)
      expect(bluetoothButton.props('macAddress')).toBe(macAddress)
    })

    it('passes Bluetooth connection state and sensor history to SensorMeasurements', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      await bluetoothButton.find('[data-testid="bluetooth-connect"]').trigger('click')

      const measurements = wrapper.findComponent(SensorMeasurements)

      expect(measurements.props('isBluetoothConnected')).toBe(true)
      expect(measurements.props('sensorHistory')).toEqual([])
    })

    it('records valid sensor messages received over Bluetooth', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const message: SmartPackSensorMessage = {
        type: 'sensors',
        data: {
          weight: 4250,
          steps: 1250,
        },
      }

      wrapper.findComponent(BluetoothButton).vm.$emit('message', message)

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        sensorHistory: Array<{
          weight: number
          steps: number
          timestamp: string
        }>
      }

      expect(vm.sensorHistory).toHaveLength(1)
      expect(vm.sensorHistory[0]).toMatchObject({
        weight: 4250,
        steps: 1250,
      })
      expect(Number.isNaN(Date.parse(vm.sensorHistory[0]?.timestamp ?? ''))).toBe(false)
    })

    it('passes received sensor history to SensorMeasurements', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const message: SmartPackSensorMessage = {
        type: 'sensors',
        data: {
          weight: 4250,
          steps: 1250,
        },
      }

      wrapper.findComponent(BluetoothButton).vm.$emit('message', message)

      await wrapper.vm.$nextTick()

      const measurements = wrapper.findComponent(SensorMeasurements)

      expect(measurements.props('sensorHistory')).toHaveLength(1)
      expect(measurements.props('sensorHistory')[0]).toMatchObject({
        weight: 4250,
        steps: 1250,
      })
    })

    it('ignores unsupported Bluetooth message types', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      wrapper.findComponent(BluetoothButton).vm.$emit('message', {
        type: 'sos',
        data: {},
      })

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        sensorHistory: unknown[]
      }

      expect(vm.sensorHistory).toHaveLength(0)
    })

    it('ignores invalid sensor readings received over Bluetooth', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      const invalidMessages = [
        {
          type: 'sensors',
          data: {
            weight: -100,
            steps: 1250,
          },
        },
        {
          type: 'sensors',
          data: {
            weight: 4250,
            steps: -1,
          },
        },
        {
          type: 'sensors',
          data: {
            weight: '4250',
            steps: 1250,
          },
        },
        {
          type: 'sensors',
          data: {
            weight: 4250,
          },
        },
        null,
        'invalid message',
      ]

      for (const message of invalidMessages) {
        bluetoothButton.vm.$emit('message', message)
      }

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        sensorHistory: unknown[]
      }

      expect(vm.sensorHistory).toHaveLength(0)
    })

    it('retains only the latest 1000 Bluetooth sensor readings', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      for (let index = 0; index < 1001; index++) {
        bluetoothButton.vm.$emit('message', {
          type: 'sensors',
          data: {
            weight: index,
            steps: index,
          },
        })
      }

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        sensorHistory: Array<{
          weight: number
          steps: number
          timestamp: string
        }>
      }

      expect(vm.sensorHistory).toHaveLength(1000)
      expect(vm.sensorHistory[0]?.weight).toBe(1)
      expect(vm.sensorHistory[999]?.weight).toBe(1000)
    })
    it('loads cached Bluetooth sensor measurements in chronological order', async () => {
      vi.stubEnv('MODE', 'mobile')

      mockGetBluetoothMeasurements.mockResolvedValueOnce([
        {
          smartpack_id: 1,
          weight: 4500,
          steps: 1500,
          timestamp: '2026-11-18T10:00:03.000Z',
        },
        {
          smartpack_id: 1,
          weight: 4400,
          steps: 1400,
          timestamp: '2026-11-18T10:00:02.000Z',
        },
        {
          smartpack_id: 1,
          weight: 4300,
          steps: 1300,
          timestamp: '2026-11-18T10:00:01.000Z',
        },
      ])

      const wrapper = mountView()

      await flushPromises()

      expect(mockGetBluetoothMeasurements).toHaveBeenCalledExactlyOnceWith(1)

      const vm = wrapper.vm as unknown as {
        sensorHistory: Array<{
          weight: number
          steps: number
          timestamp: string
        }>
      }

      expect(vm.sensorHistory).toEqual([
        {
          weight: 4300,
          steps: 1300,
          timestamp: '2026-11-18T10:00:01.000Z',
        },
        {
          weight: 4400,
          steps: 1400,
          timestamp: '2026-11-18T10:00:02.000Z',
        },
        {
          weight: 4500,
          steps: 1500,
          timestamp: '2026-11-18T10:00:03.000Z',
        },
      ])

      wrapper.unmount()
    })
    it('queues sensor readings for persistence when Bluetooth is connected', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      await bluetoothButton.find('[data-testid="bluetooth-connect"]').trigger('click')

      bluetoothButton.vm.$emit('message', {
        type: 'sensors',
        data: {
          weight: 4250,
          steps: 1250,
        },
      })

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        bluetoothMeasurementBuffer: Array<{
          weight: number
          steps: number
          timestamp: string
        }>
      }

      expect(vm.bluetoothMeasurementBuffer).toHaveLength(1)
      expect(vm.bluetoothMeasurementBuffer[0]).toMatchObject({
        weight: 4250,
        steps: 1250,
      })

      expect(mockSaveBluetoothMeasurements).not.toHaveBeenCalled()

      wrapper.unmount()
      await flushPromises()
    })
    it('persists buffered Bluetooth measurements periodically', async () => {
      vi.stubEnv('MODE', 'mobile')
      vi.useFakeTimers()

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      await bluetoothButton.find('[data-testid="bluetooth-connect"]').trigger('click')

      bluetoothButton.vm.$emit('message', {
        type: 'sensors',
        data: {
          weight: 4250,
          steps: 1250,
        },
      })

      await wrapper.vm.$nextTick()

      expect(mockSaveBluetoothMeasurements).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(5000)

      expect(mockSaveBluetoothMeasurements).toHaveBeenCalledExactlyOnceWith(1, [
        expect.objectContaining({
          weight: 4250,
          steps: 1250,
        }),
      ])

      wrapper.unmount()
      await flushPromises()
    })
    it('flushes pending measurements when Bluetooth disconnects', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      await bluetoothButton.find('[data-testid="bluetooth-connect"]').trigger('click')

      bluetoothButton.vm.$emit('message', {
        type: 'sensors',
        data: {
          weight: 4250,
          steps: 1250,
        },
      })

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        isBluetoothConnected: boolean
      }

      vm.isBluetoothConnected = false

      await flushPromises()

      expect(mockSaveBluetoothMeasurements).toHaveBeenCalledExactlyOnceWith(1, [
        expect.objectContaining({
          weight: 4250,
          steps: 1250,
        }),
      ])

      wrapper.unmount()
      await flushPromises()
    })
    it('flushes pending Bluetooth measurements when the component unmounts', async () => {
      vi.stubEnv('MODE', 'mobile')

      const wrapper = mountView()

      await flushPromises()

      const bluetoothButton = wrapper.findComponent(BluetoothButton)

      await bluetoothButton.find('[data-testid="bluetooth-connect"]').trigger('click')

      bluetoothButton.vm.$emit('message', {
        type: 'sensors',
        data: {
          weight: 4250,
          steps: 1250,
        },
      })

      await wrapper.vm.$nextTick()

      wrapper.unmount()

      await flushPromises()

      expect(mockSaveBluetoothMeasurements).toHaveBeenCalledExactlyOnceWith(1, [
        expect.objectContaining({
          weight: 4250,
          steps: 1250,
        }),
      ])
    })
  })
  describe('SmartPack summary', () => {
    it('displays the online status when the SmartPack is online', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Online')
      expect(wrapper.find('.is-online').exists()).toBe(true)
    })

    it('displays the offline status when the SmartPack is offline', async () => {
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        is_online: false,
      })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Offline')
      expect(wrapper.find('.is-offline').exists()).toBe(true)
    })

    it('displays an em dash when there is no child name', async () => {
      mockGetById.mockResolvedValueOnce({
        ...mockSmartPack,
        child_name: '',
      })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.find('header').text()).toContain('—')
    })

    it('displays the assigned child name', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Amara')
    })

    it('displays an em dash when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('—')
    })

    it('displays the assigned group name', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Primary School')
    })

    it('links to the assigned group details page', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const link = wrapper.find('a')

      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBeUndefined()
    })
  })

  describe('Group assignment permissions', () => {
    it('displays Assign to Group when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Assign to Group')
    })

    it('displays Unassign from Group when the SmartPack belongs to a group and the user is a group admin', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Unassign from Group')
      expect(mockAuthStore.isGroupAdmin).toHaveBeenCalledWith(mockGroup.id)
    })

    it('hides Unassign from Group when the user is not a group admin', async () => {
      mockAuthStore.isGroupAdmin.mockReturnValue(false)
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).not.toContain('Unassign from Group')
    })

    it('hides Assign to Child when the SmartPack belongs to a group and the user is not a group admin', async () => {
      mockAuthStore.isGroupAdmin.mockReturnValue(false)
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).not.toContain('Assign to Child')
    })

    it('displays Assign to Child when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Assign to Child')
    })

    it('displays Assign to Child when the user is a group admin', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.text()).toContain('Assign to Child')
    })

    it('disables group actions while submitting', async () => {
      const wrapper = mountView()

      await flushPromises()

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as unknown as {
        submitting: boolean
      }

      vm.submitting = true

      await wrapper.vm.$nextTick()

      const assignGroupButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Assign to Group')

      expect(assignGroupButton?.attributes('disabled')).toBeDefined()
    })
  })

  describe('Assigning a group', () => {
    it('opens the group assignment modal when Assign to Group is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      expect(button).toBeDefined()

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(true)
    })

    it('passes the submitting state to the group assignment modal', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      const modal = wrapper.findComponent(AssignGroup)

      expect(modal.exists()).toBe(true)
      expect(modal.props('submitting')).toBe(false)
    })

    it('closes the group assignment modal when the close event is emitted', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(true)

      await wrapper.find('[data-testid="close-group-modal"]').trigger('click')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(false)
    })

    it('assigns the selected group, refreshes details, and displays a success notification', async () => {
      const wrapper = mountView()

      await flushPromises()

      mockGetById.mockResolvedValue({
        ...mockAssignedSmartPack,
      })

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      const modal = wrapper.findComponent(AssignGroup)

      modal.vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockAssignGroup).toHaveBeenCalledWith(mockSmartPack.id, {
        group: mockGroup.id,
      })

      expect(mockGetById).toHaveBeenCalledTimes(2)

      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack assigned to group successfully')

      expect(wrapper.find('[data-testid="assign-group-modal"]').exists()).toBe(false)
    })

    it('shows an error notification when group assignment fails', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to assign group'))

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      wrapper.findComponent(AssignGroup).vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to assign group')
    })

    it('redirects when group assignment fails with reload enabled', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('SmartPack not found', true))

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      wrapper.findComponent(AssignGroup).vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'smartpacks',
      })
    })

    it('does not redirect when group assignment fails with reload disabled', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to assign group', false))

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Group')

      await button!.trigger('click')

      wrapper.findComponent(AssignGroup).vm.$emit('assign', mockGroup)

      await flushPromises()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('resets submitting after group assignment succeeds', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handleAssignGroup: (group: Group) => Promise<void>
        submitting: boolean
      }

      await vm.handleAssignGroup(mockGroup)

      expect(vm.submitting).toBe(false)
    })

    it('resets submitting after group assignment fails', async () => {
      mockAssignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to assign group'))

      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handleAssignGroup: (group: Group) => Promise<void>
        submitting: boolean
      }

      await vm.handleAssignGroup(mockGroup)

      expect(vm.submitting).toBe(false)
    })
  })

  describe('Unassigning a group', () => {
    it('does not unassign the group when confirmation is rejected', async () => {
      mockDeleteModal.mockResolvedValueOnce(false)
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      expect(button).toBeDefined()

      await button!.trigger('click')

      await flushPromises()

      expect(mockDeleteModal).toHaveBeenCalledTimes(1)
      expect(mockUnassignGroup).not.toHaveBeenCalled()
    })

    it('asks for confirmation before unassigning a group', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      expect(mockDeleteModal).toHaveBeenCalledWith('Unassign Group', '', {
        text: 'Are you sure you want to remove the SmartPack from the group "Primary School"?',
      })
    })

    it('unassigns the group, refreshes details, and displays a success notification', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockUnassignGroup).toHaveBeenCalledWith(mockSmartPack.id)

      expect(mockGetById).toHaveBeenCalledTimes(2)

      expect(mockNotifySuccess).toHaveBeenCalledWith('SmartPack removed from group successfully')
    })

    it('shows an error notification when group unassignment fails', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to unassign group'))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockNotifyError).toHaveBeenCalledWith('Unable to unassign group')
    })

    it('redirects when group unassignment fails with reload enabled', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('SmartPack not found', true))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'smartpacks',
      })
    })

    it('does not redirect when group unassignment fails with reload disabled', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to unassign group', false))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Unassign from Group')

      await button!.trigger('click')

      await flushPromises()

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('does nothing if unassignGroup is called when the SmartPack has no group', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        unassignGroup: () => Promise<void>
      }

      await vm.unassignGroup()

      expect(mockDeleteModal).not.toHaveBeenCalled()
      expect(mockUnassignGroup).not.toHaveBeenCalled()
    })

    it('resets submitting after group unassignment succeeds', async () => {
      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        unassignGroup: () => Promise<void>
        submitting: boolean
      }

      await vm.unassignGroup()

      expect(vm.submitting).toBe(false)
    })

    it('resets submitting after group unassignment fails', async () => {
      mockUnassignGroup.mockRejectedValueOnce(mockNotFoundError('Unable to unassign group'))

      mockGetById.mockResolvedValueOnce({ ...mockAssignedSmartPack })

      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        unassignGroup: () => Promise<void>
        submitting: boolean
      }

      await vm.unassignGroup()

      expect(vm.submitting).toBe(false)
    })
  })

  describe('Assigning a child', () => {
    it('opens the child assignment form when Assign to Child is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      expect(button).toBeDefined()

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="assign-child-form"]').exists()).toBe(true)
    })

    it('passes the current SmartPack details to the child assignment form', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      await button!.trigger('click')

      const form = wrapper.findComponent(AssignChildForm)

      expect(form.exists()).toBe(true)
      expect(form.props('initialValues')).toMatchObject(mockSmartPack)
    })

    it('returns to the details page when Cancel is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      await button!.trigger('click')

      expect(wrapper.text()).toContain('Cancel')

      await wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Cancel')!
        .trigger('click')

      expect(wrapper.text()).toContain('Details')
    })

    it('refreshes SmartPack details when the child form emits close with refresh enabled', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper
        .findAll('button')
        .find((item) => item.text().trim() === 'Assign to Child')

      await button!.trigger('click')

      wrapper.findComponent(AssignChildForm).vm.$emit('close', 'showDetails', true)

      await flushPromises()

      expect(mockGetById).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toContain('Details')
    })

    it('does not refresh SmartPack details when refresh is false', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handlePageChange: (value: 'showDetails' | 'assignChild', refresh?: boolean) => void
      }

      vm.handlePageChange('showDetails', false)

      await flushPromises()

      expect(mockGetById).toHaveBeenCalledTimes(1)
    })
  })

  describe('QR printing', () => {
    it('displays the Print QR button regardless of group assignment', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Print QR')).toBe(
        true,
      )
    })

    it('does not render the QR component initially', async () => {
      const wrapper = mountView()

      await flushPromises()

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(false)
    })

    it('renders the QR component when Print QR is clicked', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      await button!.trigger('click')

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(true)
    })

    it('passes the current SmartPack to the QR component', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      await button!.trigger('click')

      const qrComponent = wrapper.findComponent(SmartPackQrComponent)

      expect(qrComponent.exists()).toBe(true)
      expect(qrComponent.props('item')).toMatchObject(mockSmartPack)
    })

    it('hides the QR component when it emits show-qr with false', async () => {
      const wrapper = mountView()

      await flushPromises()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      await button!.trigger('click')

      await wrapper.find('[data-testid="close-qr"]').trigger('click')

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(false)
    })

    it('disables the Print QR button while printingQr is true', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        printingQr: boolean
      }

      vm.printingQr = true

      await wrapper.vm.$nextTick()

      const button = wrapper.findAll('button').find((item) => item.text().trim() === 'Print QR')

      expect(button?.attributes('disabled')).toBeDefined()
    })

    it('shows the QR component when handlePrintQr is called with true', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handlePrintQr: (value: boolean) => void
      }

      vm.handlePrintQr(true)

      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(true)
    })

    it('hides the QR component when handlePrintQr is called with false', async () => {
      const wrapper = mountView()

      await flushPromises()

      const vm = wrapper.vm as unknown as {
        handlePrintQr: (value: boolean) => void
      }

      vm.handlePrintQr(true)

      await wrapper.vm.$nextTick()

      vm.handlePrintQr(false)

      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="smartpack-qr"]').exists()).toBe(false)
    })
  })
  describe('Details / Settings tabs', () => {
    const openWrappers: ReturnType<typeof mountView>[] = []

    const mountMobile = async () => {
      vi.stubEnv('MODE', 'mobile')
      const wrapper = mountView()
      openWrappers.push(wrapper)
      await flushPromises()
      return wrapper
    }

    const findTab = (wrapper: ReturnType<typeof mountView>, label: string) =>
      wrapper.findAll('button').find((button) => button.text().trim() === label)

    afterEach(() => {
      openWrappers.forEach((wrapper) => wrapper.unmount())
      openWrappers.length = 0
    })

    it('shows the Details tab by default', async () => {
      const wrapper = await mountMobile()

      expect(wrapper.text()).toContain('490154203237518')
      expect(findTab(wrapper, 'Details')?.attributes('disabled')).toBeDefined()
    })

    it('does not render the Settings tab outside mobile mode', async () => {
      const wrapper = mountView()
      openWrappers.push(wrapper)

      await flushPromises()

      expect(findTab(wrapper, 'Settings')).toBeUndefined()
    })

    it('renders the Settings tab in mobile mode', async () => {
      const wrapper = await mountMobile()

      expect(findTab(wrapper, 'Settings')).toBeDefined()
    })

    it('switches to the Settings tab and hides the details content', async () => {
      const wrapper = await mountMobile()

      await findTab(wrapper, 'Settings')!.trigger('click')

      expect(findTab(wrapper, 'Settings')?.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).not.toContain('490154203237518')
      expect(findTab(wrapper, 'Print QR')).toBeUndefined()
    })

    it('switches back to the Details tab', async () => {
      const wrapper = await mountMobile()

      await findTab(wrapper, 'Settings')!.trigger('click')
      await findTab(wrapper, 'Details')!.trigger('click')

      expect(wrapper.text()).toContain('490154203237518')
      expect(findTab(wrapper, 'Print QR')).toBeDefined()
    })
  })

  describe('SmartPack configuration', () => {
    const openWrappers: ReturnType<typeof mountView>[] = []

    type ConfigVm = {
      isBluetoothConnected: boolean
      smartPackConfiguration: unknown
      activeDetailsTab: 'details' | 'settings'
      updateSmartPackConfiguration: () => Promise<void>
    }

    const mountMobile = async () => {
      vi.stubEnv('MODE', 'mobile')
      const wrapper = mountView()
      openWrappers.push(wrapper)
      await flushPromises()
      return wrapper
    }

    const connect = async (wrapper: ReturnType<typeof mountView>) => {
      await wrapper
        .findComponent(BluetoothButton)
        .find('[data-testid="bluetooth-connect"]')
        .trigger('click')
    }

    const sendMessage = async (wrapper: ReturnType<typeof mountView>, payload: unknown) => {
      wrapper.findComponent(BluetoothButton).vm.$emit('message', payload)
      await nextTick()
    }

    const openSettings = async (wrapper: ReturnType<typeof mountView>) => {
      await wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Settings')!
        .trigger('click')
    }

    /** Returns the text of the <dd> that follows the <dt> with the given label. */
    const getValue = (wrapper: ReturnType<typeof mountView>, label: string) =>
      wrapper
        .findAll('dt')
        .find((dt) => dt.text().includes(label))
        ?.element.nextElementSibling?.textContent?.trim()

    const getUpdateButton = (wrapper: ReturnType<typeof mountView>) =>
      wrapper.findAll('button').find((button) => button.text().trim() === 'Update')

    afterEach(() => {
      openWrappers.forEach((wrapper) => wrapper.unmount())
      openWrappers.length = 0
    })

    describe('settings tab states', () => {
      it('shows the disconnected state when Bluetooth is not connected', async () => {
        const wrapper = await mountMobile()

        await openSettings(wrapper)

        expect(wrapper.text()).toContain('SmartPack Disconnected')
        expect(wrapper.text()).not.toContain('Waiting for Configuration')
      })

      it('shows the waiting state when connected but no configuration has arrived', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)

        expect(wrapper.text()).toContain('Waiting for Configuration')
        expect(wrapper.text()).not.toContain('SmartPack Disconnected')
      })

      it('shows the configuration once it is received', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        expect(wrapper.text()).not.toContain('Waiting for Configuration')
        expect(getValue(wrapper, 'Weight Limit')).toBe(`${(5000).toLocaleString()} grams`)
        expect(getValue(wrapper, 'Delay')).toBe('30 seconds')
        expect(getValue(wrapper, 'Bluetooth Name')).toBe('SmartPack-0001')
        expect(getValue(wrapper, 'Communication Mode')).toBe('Wi-Fi')
        expect(getValue(wrapper, 'Wi-Fi SSID')).toBe('HomeNetwork')
        expect(getValue(wrapper, 'Wi-Fi Password')).toBe('secret123')
      })

      it('displays GSM when com_mode is 0', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, { ...mockConfiguration, com_mode: 0 })

        expect(getValue(wrapper, 'Communication Mode')).toBe('GSM')
      })

      it('displays em dashes for empty text settings', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, {
          ...mockConfiguration,
          bluetooth_name: '',
          wifi_settings: { ssid: '', password: '' },
        })

        expect(getValue(wrapper, 'Bluetooth Name')).toBe('—')
        expect(getValue(wrapper, 'Wi-Fi SSID')).toBe('—')
        expect(getValue(wrapper, 'Wi-Fi Password')).toBe('—')
      })

      it('renders an info tooltip for each setting', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        expect(wrapper.findAll('[data-testid="info-tooltip"]')).toHaveLength(6)
      })

      it('passes right placement to the communication mode tooltip', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        const tooltips = wrapper.findAllComponents({ name: 'InfoTooltip' })
        const placements = tooltips.map((tooltip) => tooltip.props('placement'))

        expect(placements.filter((placement) => placement === 'right')).toHaveLength(1)
      })
    })

    describe('configuration message handling', () => {
      it('stores a copy of the received configuration', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        await connect(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        expect(vm.smartPackConfiguration).toEqual(mockConfiguration)
        expect(vm.smartPackConfiguration).not.toBe(mockConfiguration)
        expect((vm.smartPackConfiguration as SmartPackConfiguration).wifi_settings).not.toBe(
          mockConfiguration.wifi_settings,
        )
      })

      it('updates the configuration when a newer one arrives', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        await connect(wrapper)
        await sendMessage(wrapper, mockConfiguration)
        await sendMessage(wrapper, { ...mockConfiguration, delay: 60 })

        expect((vm.smartPackConfiguration as SmartPackConfiguration).delay).toBe(60)
      })

      it('does not treat a configuration message as a sensor reading', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as { sensorHistory: unknown[] }

        await connect(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        expect(vm.sensorHistory).toHaveLength(0)
      })

      it('still records sensor messages after the routing change', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as { sensorHistory: unknown[] }

        await sendMessage(wrapper, { type: 'sensors', data: { weight: 4250, steps: 1250 } })

        expect(vm.sensorHistory).toHaveLength(1)
      })

      it.each([
        ['negative weight_limit', { ...mockConfiguration, weight_limit: -1 }],
        ['non-numeric weight_limit', { ...mockConfiguration, weight_limit: '5000' }],
        ['NaN weight_limit', { ...mockConfiguration, weight_limit: Number.NaN }],
        ['negative delay', { ...mockConfiguration, delay: -5 }],
        ['non-numeric delay', { ...mockConfiguration, delay: '30' }],
        ['unsupported com_mode', { ...mockConfiguration, com_mode: 2 }],
        ['missing wifi_settings', { ...mockConfiguration, wifi_settings: undefined }],
        ['null wifi_settings', { ...mockConfiguration, wifi_settings: null }],
        ['non-string ssid', { ...mockConfiguration, wifi_settings: { ssid: 1, password: 'x' } }],
        ['missing password', { ...mockConfiguration, wifi_settings: { ssid: 'x' } }],
        ['missing bluetooth_name', { ...mockConfiguration, bluetooth_name: undefined }],
        ['non-object payload', 'configuration'],
        ['null payload', null],
      ])('ignores a configuration with %s', async (_name, payload) => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        await connect(wrapper)
        await sendMessage(wrapper, payload)

        expect(vm.smartPackConfiguration).toBeNull()
      })
    })

    describe('connection lifecycle', () => {
      it('clears the configuration when Bluetooth connects', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        vm.smartPackConfiguration = { ...mockConfiguration }

        await connect(wrapper)

        expect(vm.smartPackConfiguration).toBeNull()
      })

      it('clears the configuration and returns to Details when Bluetooth disconnects', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        await connect(wrapper)
        await sendMessage(wrapper, mockConfiguration)
        await openSettings(wrapper)

        vm.isBluetoothConnected = false
        await flushPromises()

        expect(vm.smartPackConfiguration).toBeNull()
        expect(vm.activeDetailsTab).toBe('details')
        expect(wrapper.text()).toContain('490154203237518')
      })

      it('waits for a fresh configuration after reconnecting', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        await connect(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        vm.isBluetoothConnected = false
        await flushPromises()

        await connect(wrapper)
        await openSettings(wrapper)

        expect(wrapper.text()).toContain('Waiting for Configuration')
      })
    })

    describe('updating the configuration', () => {
      it('disables Update when Bluetooth is disconnected', async () => {
        const wrapper = await mountMobile()

        await openSettings(wrapper)

        expect(getUpdateButton(wrapper)?.attributes('disabled')).toBeDefined()
      })

      it('disables Update while waiting for the configuration', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)

        expect(getUpdateButton(wrapper)?.attributes('disabled')).toBeDefined()
      })

      it('enables Update once connected with a configuration', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, mockConfiguration)

        expect(getUpdateButton(wrapper)?.attributes('disabled')).toBeUndefined()
      })

      it('reports that writing is not implemented yet when Update is clicked', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await openSettings(wrapper)
        await sendMessage(wrapper, mockConfiguration)
        await getUpdateButton(wrapper)!.trigger('click')

        expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith(
          'Bluetooth configuration writing has not been implemented yet.',
        )
      })

      it('rejects updates outside mobile mode', async () => {
        const wrapper = mountView()
        openWrappers.push(wrapper)

        await flushPromises()

        await (wrapper.vm as unknown as ConfigVm).updateSmartPackConfiguration()

        expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith(
          'Configuration updates are only available on mobile.',
        )
      })

      it('rejects updates when Bluetooth is not connected', async () => {
        const wrapper = await mountMobile()

        await (wrapper.vm as unknown as ConfigVm).updateSmartPackConfiguration()

        expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith(
          'Connect to your SmartPack before updating its configuration.',
        )
      })

      it('rejects updates when no configuration has been received', async () => {
        const wrapper = await mountMobile()

        await connect(wrapper)
        await (wrapper.vm as unknown as ConfigVm).updateSmartPackConfiguration()

        expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith(
          'SmartPack configuration has not been received.',
        )
      })

      it('rejects updates when the configuration is invalid', async () => {
        const wrapper = await mountMobile()
        const vm = wrapper.vm as unknown as ConfigVm

        await connect(wrapper)
        vm.smartPackConfiguration = { ...mockConfiguration, com_mode: 5 }

        await vm.updateSmartPackConfiguration()

        expect(mockNotifyError).toHaveBeenCalledExactlyOnceWith(
          'Please provide valid configuration settings.',
        )
      })
    })
  })
})
