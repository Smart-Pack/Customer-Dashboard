import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import BluetoothButton from '@/components/Smartpacks/BluetoothButton.vue'
import BluetoothOnIcon from '@/components/Icons/BluetoothOnIcon.vue'
import BluetoothOffIcon from '@/components/Icons/BluetoothOffIcon.vue'
import { bluetoothSerialService } from '@/services/bluetoothSerial'
import { BluetoothSerial } from 'bluetooth-serial'

const MAC_ADDRESS = 'AA:BB:CC:DD:EE:FF'

const notifySuccess = vi.fn<(message: string) => void>()
const notifyError = vi.fn<(message: string) => void>()

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

/**
 * Mounts the BluetoothButton component with the required dependencies.
 *
 * @param props - Optional component props.
 * @returns The mounted Vue component wrapper.
 */
function mountComponent(
  props: {
    macAddress?: string | null
    isBluetoothConnected?: boolean
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

/**
 * Connects to the SmartPack and retrieves the serial reading options.
 *
 * @param wrapper - The mounted component wrapper.
 * @returns The Bluetooth serial reading options.
 */
async function connectAndGetReadingOptions(wrapper: VueWrapper) {
  await flushPromises()
  await wrapper.get('button').trigger('click')

  const readingOptions = vi.mocked(bluetoothSerialService.startReading).mock.calls[0]?.[0]

  expect(readingOptions).toBeDefined()

  return readingOptions
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
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders the Bluetooth button', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('button').exists()).toBe(true)

      wrapper.unmount()
    })

    it('displays the connect label when disconnected', () => {
      const wrapper = mountComponent()

      expect(wrapper.get('button').text()).toContain('Connect')

      wrapper.unmount()
    })

    it('displays the disconnect label when connected', () => {
      const wrapper = mountComponent({
        isBluetoothConnected: true,
      })

      expect(wrapper.get('button').text()).toContain('Disconnect')

      wrapper.unmount()
    })

    it('renders the Bluetooth on icon when Bluetooth is enabled', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.findComponent(BluetoothOnIcon).exists()).toBe(true)
      expect(wrapper.findComponent(BluetoothOffIcon).exists()).toBe(false)

      wrapper.unmount()
    })

    it('renders the Bluetooth off icon when Bluetooth is disabled', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: false,
      })

      const wrapper = mountComponent()

      await flushPromises()

      expect(wrapper.findComponent(BluetoothOffIcon).exists()).toBe(true)
      expect(wrapper.findComponent(BluetoothOnIcon).exists()).toBe(false)

      wrapper.unmount()
    })

    it('disables the button when no MAC address is provided', () => {
      const wrapper = mountComponent({
        macAddress: null,
      })

      expect(wrapper.get('button').attributes('disabled')).toBeDefined()

      wrapper.unmount()
    })
  })

  describe('Bluetooth adapter status', () => {
    it('checks the Bluetooth adapter status on mount', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(BluetoothSerial.isEnabled).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('checks the Bluetooth adapter status periodically', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      vi.mocked(BluetoothSerial.isEnabled).mockClear()

      await vi.advanceTimersByTimeAsync(2000)

      expect(BluetoothSerial.isEnabled).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('notifies when Bluetooth is turned off', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: true,
      })

      const wrapper = mountComponent()

      // Allow the initial Bluetooth status check to complete.
      await flushPromises()

      // Simulate Bluetooth being turned off.
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: false,
      })

      // Trigger the next periodic status check.
      await vi.advanceTimersByTimeAsync(2000)
      await flushPromises()

      expect(notifySuccess).toHaveBeenCalledWith('Bluetooth turned off.')

      wrapper.unmount()
    })

    it('notifies when Bluetooth is turned on again', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: false,
      })

      const wrapper = mountComponent()

      await flushPromises()

      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: true,
      })

      await vi.advanceTimersByTimeAsync(2000)

      expect(notifySuccess).toHaveBeenCalledWith('Bluetooth turned on.')

      wrapper.unmount()
    })

    it('does not notify about the initial Bluetooth adapter status', async () => {
      const wrapper = mountComponent()

      await flushPromises()

      expect(notifySuccess).not.toHaveBeenCalled()
      expect(notifyError).not.toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('connection handling', () => {
    it('connects to the SmartPack using its MAC address', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(bluetoothSerialService.connect).toHaveBeenCalledWith(MAC_ADDRESS, expect.any(Function))

      wrapper.unmount()
    })

    it('emits connected state after a successful connection', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([true])

      wrapper.unmount()
    })

    it('starts reading serial data after connecting', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      expect(bluetoothSerialService.startReading).toHaveBeenCalledWith(
        expect.objectContaining({
          onData: expect.any(Function),
          onError: expect.any(Function),
        }),
      )

      wrapper.unmount()
    })

    it('disconnects from the SmartPack when already connected', async () => {
      const wrapper = mountComponent({
        isBluetoothConnected: true,
      })

      await wrapper.get('button').trigger('click')

      expect(bluetoothSerialService.disconnect).toHaveBeenCalledOnce()
      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])

      wrapper.unmount()
    })

    it('emits disconnected state when the connection is lost', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const connectionCallback = vi.mocked(bluetoothSerialService.connect).mock.calls[0]?.[1]

      expect(connectionCallback).toBeDefined()

      connectionCallback?.(false, 'link-lost')

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(notifyError).toHaveBeenCalledWith('SmartPack Bluetooth connection lost.')

      wrapper.unmount()
    })

    it('does not show a connection-lost notification when Bluetooth is turned off', async () => {
      const wrapper = mountComponent()

      await flushPromises()
      await wrapper.get('button').trigger('click')

      const connectionCallback = vi.mocked(bluetoothSerialService.connect).mock.calls[0]?.[1]

      connectionCallback?.(false, 'bluetooth-off')

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(notifyError).not.toHaveBeenCalledWith('SmartPack Bluetooth connection lost.')

      wrapper.unmount()
    })

    it('emits disconnected state when unmounted while connected', () => {
      const wrapper = mountComponent({
        isBluetoothConnected: true,
      })

      wrapper.unmount()

      expect(wrapper.emitted('update:isBluetoothConnected')).toContainEqual([false])
      expect(bluetoothSerialService.disconnect).toHaveBeenCalledOnce()
    })

    it('does not emit connection updates when unmounted while disconnected', () => {
      const wrapper = mountComponent()

      wrapper.unmount()

      expect(wrapper.emitted('update:isBluetoothConnected')).toBeUndefined()
    })
  })

  describe('serial JSON message handling', () => {
    it('emits a complete JSON message without a newline', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const message = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      readingOptions?.onData?.(JSON.stringify(message))

      expect(wrapper.emitted('message')).toContainEqual([message])

      wrapper.unmount()
    })

    it('emits a complete newline-terminated JSON message', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const message = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      readingOptions?.onData?.(`${JSON.stringify(message)}\n`)

      expect(wrapper.emitted('message')).toContainEqual([message])

      wrapper.unmount()
    })

    it('buffers fragmented JSON until the complete message is received', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const message = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      const json = JSON.stringify(message)
      const midpoint = Math.floor(json.length / 2)

      readingOptions?.onData?.(json.slice(0, midpoint))

      expect(wrapper.emitted('message')).toBeUndefined()

      readingOptions?.onData?.(json.slice(midpoint))

      expect(wrapper.emitted('message')).toContainEqual([message])

      wrapper.unmount()
    })

    it('emits multiple newline-delimited JSON messages from one chunk', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const firstMessage = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      const secondMessage = {
        type: 'device_status',
        data: {
          battery: 90,
        },
      }

      readingOptions?.onData?.(
        `${JSON.stringify(firstMessage)}\n${JSON.stringify(secondMessage)}\n`,
      )

      expect(wrapper.emitted('message')).toEqual([[firstMessage], [secondMessage]])

      wrapper.unmount()
    })

    it('supports CRLF-delimited JSON messages', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const message = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      readingOptions?.onData?.(`${JSON.stringify(message)}\r\n`)

      expect(wrapper.emitted('message')).toContainEqual([message])

      wrapper.unmount()
    })

    it('does not emit an incomplete JSON message', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      readingOptions?.onData?.('{"type":"sensor_data","data":')

      expect(wrapper.emitted('message')).toBeUndefined()

      wrapper.unmount()
    })

    it('completes a message when the remaining JSON data arrives', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const message = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      const json = JSON.stringify(message)
      const midpoint = Math.floor(json.length / 2)

      readingOptions?.onData?.(json.slice(0, midpoint))

      expect(wrapper.emitted('message')).toBeUndefined()

      readingOptions?.onData?.(json.slice(midpoint))

      expect(wrapper.emitted('message')).toContainEqual([message])

      wrapper.unmount()
    })

    it('emits complete messages and retains an incomplete final message', async () => {
      const wrapper = mountComponent()

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const firstMessage = {
        type: 'sensor_data',
        data: {
          weight: 4250,
          steps: 1250,
          battery: 87,
        },
      }

      const secondMessage = {
        type: 'device_status',
        data: {
          battery: 90,
        },
      }

      const secondJson = JSON.stringify(secondMessage)
      const midpoint = Math.floor(secondJson.length / 2)

      readingOptions?.onData?.(`${JSON.stringify(firstMessage)}\n${secondJson.slice(0, midpoint)}`)

      expect(wrapper.emitted('message')).toEqual([[firstMessage]])

      readingOptions?.onData?.(`${secondJson.slice(midpoint)}\n`)

      expect(wrapper.emitted('message')).toEqual([[firstMessage], [secondMessage]])

      wrapper.unmount()
    })

    it('ignores invalid JSON messages', async () => {
      const wrapper = mountComponent()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      readingOptions?.onData?.('invalid-json\n')

      expect(wrapper.emitted('message')).toBeUndefined()
      expect(warnSpy).toHaveBeenCalledWith('[Bluetooth] Invalid JSON message:', 'invalid-json')

      wrapper.unmount()
    })

    it('ignores valid JSON values that are not objects', async () => {
      const wrapper = mountComponent()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      readingOptions?.onData?.('123\n')

      expect(wrapper.emitted('message')).toBeUndefined()
      expect(warnSpy).toHaveBeenCalledWith('[Bluetooth] Invalid JSON message:', '123')

      wrapper.unmount()
    })

    it('clears the buffer when an incomplete message exceeds the maximum length', async () => {
      const wrapper = mountComponent()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      readingOptions?.onData?.('a'.repeat(10001))

      expect(warnSpy).toHaveBeenCalledWith(
        '[Bluetooth] Incomplete message exceeded maximum length.',
      )

      wrapper.unmount()
    })

    it('logs serial reading errors', async () => {
      const wrapper = mountComponent()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const readingOptions = await connectAndGetReadingOptions(wrapper)

      const error = new Error('Bluetooth read failed')

      readingOptions?.onError?.(error)

      expect(errorSpy).toHaveBeenCalledWith('[Bluetooth] Read error:', error)

      wrapper.unmount()
    })
  })
})
