import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BluetoothButton from '@/components/Smartpacks/BluetoothButton.vue'
import BluetoothOnIcon from '@/components/Icons/BluetoothOnIcon.vue'
import BluetoothOffIcon from '@/components/Icons/BluetoothOffIcon.vue'
import { bluetoothSerialService } from '@/services/bluetoothSerial'
import { BluetoothSerial } from 'bluetooth-serial'

vi.mock('@/services/bluetoothSerial', () => ({
  bluetoothSerialService: {
    connect: vi.fn<typeof bluetoothSerialService.connect>(),
    disconnect: vi.fn<typeof bluetoothSerialService.disconnect>(),
    startReading: vi.fn<typeof bluetoothSerialService.startReading>(),
  },
}))

vi.mock('bluetooth-serial', () => ({
  BluetoothSerial: {
    isEnabled: vi.fn<typeof BluetoothSerial.isEnabled>(),
  },
}))

const notifySuccess = vi.fn<(message: string) => void>()
const notifyError = vi.fn<(message: string) => void>()

const MAC_ADDRESS = 'AA:BB:CC:DD:EE:FF'

/**
 * Mounts the BluetoothButton component with the required global mocks.
 *
 * @param props - Optional component props.
 * @returns The mounted component wrapper.
 */
function mountComponent(
  props: {
    macAddress?: string | null
    isBluetoothConnected?: boolean
    bluetoothData?: string
  } = {},
): VueWrapper {
  return mount(BluetoothButton, {
    props: {
      macAddress: MAC_ADDRESS,
      ...props,
    },
    global: {
      mocks: {
        $notifySuccess: notifySuccess,
        $notifyError: notifyError,
      },
    },
  })
}

describe('BluetoothButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
      isEnabled: true,
    })

    vi.mocked(bluetoothSerialService.connect).mockResolvedValue(undefined)
    vi.mocked(bluetoothSerialService.disconnect).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders the Connect button when disconnected', () => {
      const wrapper = mountComponent()

      expect(wrapper.get('button').text()).toContain('Connect')
      expect(wrapper.get('button').classes()).toContain('form-submit')
      expect(wrapper.get('button').attributes('aria-label')).toBe('Connect')

      wrapper.unmount()
    })

    it('renders the Disconnect button when connected', () => {
      const wrapper = mountComponent({
        isBluetoothConnected: true,
      })

      expect(wrapper.get('button').text()).toContain('Disconnect')
      expect(wrapper.get('button').classes()).toContain('error-btn')
      expect(wrapper.get('button').attributes('aria-label')).toBe('Disconnect')

      wrapper.unmount()
    })

    it('disables the button when no MAC address is provided', () => {
      const wrapper = mountComponent({
        macAddress: null,
      })

      expect(wrapper.get('button').attributes('disabled')).toBeDefined()

      wrapper.unmount()
    })

    it('renders the Bluetooth on icon while the adapter state is unknown', () => {
      const wrapper = mountComponent()

      expect(wrapper.findComponent(BluetoothOnIcon).exists()).toBe(true)
      expect(wrapper.findComponent(BluetoothOffIcon).exists()).toBe(false)

      wrapper.unmount()
    })

    it('renders the Bluetooth on icon when the adapter is enabled', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.findComponent(BluetoothOnIcon).exists()).toBe(true)
      expect(wrapper.findComponent(BluetoothOffIcon).exists()).toBe(false)

      wrapper.unmount()
    })

    it('renders the Bluetooth off icon when the adapter is disabled', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValueOnce({
        isEnabled: false,
      })

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.findComponent(BluetoothOffIcon).exists()).toBe(true)
      expect(wrapper.findComponent(BluetoothOnIcon).exists()).toBe(false)
      expect(wrapper.get('button').attributes('aria-label')).toBe('Bluetooth is off. Connect')

      wrapper.unmount()
    })

    it('shows the connecting spinner while connecting', async () => {
      let resolveConnection: (() => void) | undefined

      vi.mocked(bluetoothSerialService.connect).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveConnection = resolve
          }),
      )

      const wrapper = mountComponent()

      await flushPromises()

      // Start connecting without waiting for completion.
      void wrapper.get('button').trigger('click')

      await flushPromises()

      expect(wrapper.text()).toContain('Connecting...')
      expect(wrapper.find('.submit-spinner').exists()).toBe(true)
      expect(wrapper.get('button').attributes('disabled')).toBeDefined()

      // Resolve the connection.
      resolveConnection?.()
      await flushPromises()

      // Verify that the component emitted the connected state.
      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([true])

      // Simulate the parent updating the v-model prop.
      await wrapper.setProps({
        isBluetoothConnected: true,
      })

      expect(wrapper.text()).toContain('Disconnect')
      expect(wrapper.find('.submit-spinner').exists()).toBe(false)

      wrapper.unmount()
    })
  })

  describe('Bluetooth adapter status', () => {
    it('checks the adapter status when mounted', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(BluetoothSerial.isEnabled).toHaveBeenCalledOnce()

      wrapper.unmount()
    })

    it('checks the adapter status every two seconds', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(BluetoothSerial.isEnabled).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(2000)

      expect(BluetoothSerial.isEnabled).toHaveBeenCalledTimes(2)

      wrapper.unmount()
    })

    it('notifies when Bluetooth turns off', async () => {
      vi.mocked(BluetoothSerial.isEnabled)
        .mockResolvedValueOnce({ isEnabled: true })
        .mockResolvedValueOnce({ isEnabled: false })

      const wrapper = mountComponent()

      await flushPromises()
      await vi.advanceTimersByTimeAsync(2000)

      expect(notifySuccess).toHaveBeenCalledWith('Bluetooth turned off.')

      wrapper.unmount()
    })

    it('notifies when Bluetooth turns on', async () => {
      vi.mocked(BluetoothSerial.isEnabled)
        .mockResolvedValueOnce({ isEnabled: false })
        .mockResolvedValueOnce({ isEnabled: true })

      const wrapper = mountComponent()

      await flushPromises()
      await vi.advanceTimersByTimeAsync(2000)

      expect(notifySuccess).toHaveBeenCalledWith('Bluetooth turned on.')

      wrapper.unmount()
    })

    it('does not notify about the initial adapter state', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValueOnce({
        isEnabled: false,
      })

      const wrapper = mountComponent()

      await flushPromises()

      expect(notifySuccess).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('logs an adapter status error only once across repeated failures', async () => {
      const error = new Error('Bluetooth permission denied')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(BluetoothSerial.isEnabled).mockRejectedValue(error)

      const wrapper = mountComponent()

      await flushPromises()
      await vi.advanceTimersByTimeAsync(4000)

      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        '[Bluetooth] Status check failed:',
        error,
      )

      wrapper.unmount()
      consoleError.mockRestore()
    })

    it('clears the adapter polling interval when unmounted', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      const wrapper = mountComponent()

      await flushPromises()
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('connection handling', () => {
    it('connects to the SmartPack using its MAC address', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(bluetoothSerialService.connect).toHaveBeenCalledExactlyOnceWith(
        MAC_ADDRESS,
        expect.any(Function),
      )

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([true])
      expect(notifySuccess).toHaveBeenCalledWith('Bluetooth connected successfully.')

      wrapper.unmount()
    })

    it('starts reading serial data after connecting', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(bluetoothSerialService.startReading).toHaveBeenCalledExactlyOnceWith({
        onData: expect.any(Function),
        onError: expect.any(Function),
      })

      wrapper.unmount()
    })

    it('disconnects from the SmartPack when already connected', async () => {
      const wrapper = mountComponent({
        isBluetoothConnected: true,
        bluetoothData: 'weight=4250',
      })

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(bluetoothSerialService.disconnect).toHaveBeenCalledOnce()
      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(wrapper.emitted('update:bluetoothData')).toContainEqual([''])
      expect(notifySuccess).toHaveBeenCalledWith('Bluetooth disconnected successfully.')

      wrapper.unmount()
    })

    it('does not start another connection while a connection is in progress', async () => {
      let resolveConnection: (() => void) | undefined

      vi.mocked(bluetoothSerialService.connect).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveConnection = resolve
          }),
      )

      const wrapper = mountComponent()

      await flushPromises()

      const button = wrapper.get('button')

      await button.trigger('click')

      expect(button.attributes('disabled')).toBeDefined()
      expect(button.text()).toContain('Connecting...')

      resolveConnection?.()
      await flushPromises()

      expect(bluetoothSerialService.connect).toHaveBeenCalledOnce()

      wrapper.unmount()
    })

    it('emits a disconnected state when the connection is lost', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const connectionCallback = vi.mocked(bluetoothSerialService.connect).mock.calls[0]?.[1]

      expect(connectionCallback).toBeDefined()

      connectionCallback?.(false, 'link-lost')

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(wrapper.emitted('update:bluetoothData')).toContainEqual([''])
      expect(notifyError).toHaveBeenCalledWith('SmartPack Bluetooth connection lost.')

      wrapper.unmount()
    })

    it('does not show a connection-lost notification when Bluetooth is turned off', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const connectionCallback = vi.mocked(bluetoothSerialService.connect).mock.calls[0]?.[1]

      connectionCallback?.(false, 'bluetooth-off')

      expect(notifyError).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('emits a disconnected state when the connection attempt fails', async () => {
      vi.mocked(bluetoothSerialService.connect).mockRejectedValueOnce(
        new Error('Connection failed'),
      )

      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(notifyError).toHaveBeenCalledWith('Connection failed')

      wrapper.unmount()
    })
  })

  describe('serial data handling', () => {
    it('emits received Bluetooth data', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const readingOptions = vi.mocked(bluetoothSerialService.startReading).mock.calls[0]?.[0]

      expect(readingOptions).toBeDefined()

      readingOptions?.onData?.('weight=4250 steps=1250 battery=87')

      expect(wrapper.emitted('update:bluetoothData')).toContainEqual([
        'weight=4250 steps=1250 battery=87',
      ])

      wrapper.unmount()
    })

    it('appends incoming data to the existing Bluetooth data', async () => {
      const wrapper = mountComponent({
        bluetoothData: 'weight=4250 ',
      })

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const readingOptions = vi.mocked(bluetoothSerialService.startReading).mock.calls[0]?.[0]

      readingOptions?.onData?.('steps=1250')

      expect(wrapper.emitted('update:bluetoothData')).toContainEqual(['weight=4250 steps=1250'])

      wrapper.unmount()
    })

    it('limits the emitted Bluetooth data to 5000 characters', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const readingOptions = vi.mocked(bluetoothSerialService.startReading).mock.calls[0]?.[0]

      readingOptions?.onData?.('a'.repeat(6000))

      const emittedData = wrapper.emitted('update:bluetoothData')

      expect(emittedData?.[emittedData.length - 1]?.[0]).toHaveLength(5000)

      wrapper.unmount()
    })

    it('logs serial read errors', async () => {
      const error = new Error('Serial read failed')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const readingOptions = vi.mocked(bluetoothSerialService.startReading).mock.calls[0]?.[0]

      readingOptions?.onError?.(error)

      expect(consoleError).toHaveBeenCalledWith('[Bluetooth] Read error:', error)

      wrapper.unmount()
      consoleError.mockRestore()
    })
  })

  describe('component cleanup', () => {
    it('disconnects the Bluetooth service when unmounted', () => {
      const wrapper = mountComponent()

      wrapper.unmount()

      expect(bluetoothSerialService.disconnect).toHaveBeenCalledOnce()
    })

    it('emits disconnected state and clears data when unmounted while connected', () => {
      const wrapper = mountComponent({
        isBluetoothConnected: true,
        bluetoothData: 'weight=4250',
      })

      wrapper.unmount()

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(wrapper.emitted('update:bluetoothData')).toContainEqual([''])
      expect(bluetoothSerialService.disconnect).toHaveBeenCalledOnce()
    })

    it('does not emit connection updates when unmounted while disconnected', () => {
      const wrapper = mountComponent()

      wrapper.unmount()

      expect(wrapper.emitted('update:isBluetoothConnected')).toBeUndefined()
      expect(wrapper.emitted('update:bluetoothData')).toBeUndefined()
    })
  })
})
