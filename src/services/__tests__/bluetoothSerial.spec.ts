import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Capacitor } from '@capacitor/core'
import { BluetoothSerial } from 'bluetooth-serial'

import {
  bluetoothSerialService,
  type ConnectionChangeCallback,
  type DataCallback,
  type DisconnectCallback,
  type ErrorCallback,
} from '../bluetoothSerial'

// Mock Capacitor platform detection and the native Bluetooth plugin.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn<() => boolean>(),
    getPlatform: vi.fn<() => string>(),
  },
}))

vi.mock('bluetooth-serial', () => ({
  BluetoothSerial: {
    isEnabled: vi.fn<() => Promise<{ isEnabled: boolean }>>(),
    enable: vi.fn<() => Promise<{ isEnabled: boolean }>>(),
    connect: vi.fn<(options: { address: string }) => Promise<void>>(),
    disconnect: vi.fn<() => Promise<void>>(),
    isConnected: vi.fn<() => Promise<{ isConnected: boolean }>>(),
    available: vi.fn<() => Promise<{ available: number }>>(),
    read: vi.fn<() => Promise<{ data: string }>>(),
    write: vi.fn<(options: { data: string }) => Promise<void>>(),
  },
}))

const VALID_MAC = 'AA:BB:CC:DD:EE:FF'
const INVALID_MAC = 'AA:BB:CC:DD:EE:GG'

const BLUETOOTH_DISABLED_MESSAGE = 'Bluetooth is disabled.'
const UNSUPPORTED_MESSAGE = 'Bluetooth Classic is only supported on Android.'
const INVALID_ADDRESS_MESSAGE = 'Invalid Bluetooth MAC address.'

describe('Bluetooth Serial service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')

    vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
      isEnabled: true,
    })

    vi.mocked(BluetoothSerial.enable).mockResolvedValue({
      isEnabled: true,
    })

    vi.mocked(BluetoothSerial.connect).mockResolvedValue(undefined)
    vi.mocked(BluetoothSerial.disconnect).mockResolvedValue(undefined)

    vi.mocked(BluetoothSerial.isConnected).mockResolvedValue({
      isConnected: true,
    })

    vi.mocked(BluetoothSerial.available).mockResolvedValue({
      available: 0,
    })

    vi.mocked(BluetoothSerial.read).mockResolvedValue({
      data: '',
    })

    vi.mocked(BluetoothSerial.write).mockResolvedValue(undefined)
  })

  afterEach(async () => {
    // Reset the singleton's internal state between tests.
    await bluetoothSerialService.disconnect()

    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /**
   * Establishes a connection before testing operations that require one.
   */
  async function connectService(
    onConnectionChange?: (connected: boolean, reason?: 'bluetooth-off' | 'link-lost') => void,
  ): Promise<void> {
    await bluetoothSerialService.connect(VALID_MAC, onConnectionChange)
  }

  describe('connect', () => {
    it('connects successfully to a paired Bluetooth device', async () => {
      await connectService()

      expect(BluetoothSerial.isEnabled).toHaveBeenCalledOnce()
      expect(BluetoothSerial.connect).toHaveBeenCalledWith({
        address: VALID_MAC,
      })

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(true)
    })

    it('throws when the platform is not native', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      await expect(bluetoothSerialService.connect(VALID_MAC)).rejects.toThrow(UNSUPPORTED_MESSAGE)

      expect(BluetoothSerial.connect).not.toHaveBeenCalled()
    })

    it('throws when the platform is not Android', async () => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')

      await expect(bluetoothSerialService.connect(VALID_MAC)).rejects.toThrow(UNSUPPORTED_MESSAGE)

      expect(BluetoothSerial.connect).not.toHaveBeenCalled()
    })

    it.each([
      '',
      'AA:BB:CC:DD:EE',
      'AA:BB:CC:DD:EE:FF:00',
      'AA-BB-CC-DD-EE-FF',
      INVALID_MAC,
      'AABBCCDDEEFF',
      'GG:BB:CC:DD:EE:FF',
    ])('rejects an invalid MAC address: %s', async (address) => {
      await expect(bluetoothSerialService.connect(address)).rejects.toThrow(INVALID_ADDRESS_MESSAGE)

      expect(BluetoothSerial.connect).not.toHaveBeenCalled()
    })

    it('accepts a lowercase MAC address', async () => {
      const address = 'aa:bb:cc:dd:ee:ff'

      await bluetoothSerialService.connect(address)

      expect(BluetoothSerial.connect).toHaveBeenCalledWith({
        address,
      })
    })

    it('enables Bluetooth when the adapter is initially disabled', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValueOnce({
        isEnabled: false,
      })

      await connectService()

      expect(BluetoothSerial.enable).toHaveBeenCalledOnce()
      expect(BluetoothSerial.connect).toHaveBeenCalledOnce()
    })

    it('throws when the user does not enable Bluetooth', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValueOnce({
        isEnabled: false,
      })

      vi.mocked(BluetoothSerial.enable).mockResolvedValueOnce({
        isEnabled: false,
      })

      await expect(bluetoothSerialService.connect(VALID_MAC)).rejects.toThrow(
        BLUETOOTH_DISABLED_MESSAGE,
      )

      expect(BluetoothSerial.connect).not.toHaveBeenCalled()
    })

    it('throws when checking the Bluetooth adapter fails', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockRejectedValueOnce(
        new Error('Bluetooth adapter unavailable'),
      )

      await expect(bluetoothSerialService.connect(VALID_MAC)).rejects.toThrow(
        'Bluetooth adapter unavailable',
      )

      expect(BluetoothSerial.connect).not.toHaveBeenCalled()
    })

    it('throws when enabling Bluetooth fails', async () => {
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValueOnce({
        isEnabled: false,
      })

      vi.mocked(BluetoothSerial.enable).mockRejectedValueOnce(new Error('Permission denied'))

      await expect(bluetoothSerialService.connect(VALID_MAC)).rejects.toThrow('Permission denied')
    })

    it('propagates native connection errors', async () => {
      const error = new Error('Connection refused')

      vi.mocked(BluetoothSerial.connect).mockRejectedValueOnce(error)

      await expect(bluetoothSerialService.connect(VALID_MAC)).rejects.toThrow('Connection refused')

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })

    it('disconnects an existing connection before connecting to another device', async () => {
      await connectService()

      vi.clearAllMocks()

      await bluetoothSerialService.connect('11:22:33:44:55:66')

      expect(BluetoothSerial.disconnect).toHaveBeenCalledOnce()

      expect(BluetoothSerial.connect).toHaveBeenCalledWith({
        address: '11:22:33:44:55:66',
      })
    })

    it('starts a health check after a successful connection', async () => {
      vi.useFakeTimers()

      await connectService()

      await vi.advanceTimersByTimeAsync(3000)

      expect(BluetoothSerial.isEnabled).toHaveBeenCalledTimes(2)
      expect(BluetoothSerial.isConnected).toHaveBeenCalledOnce()
    })
  })

  describe('isConnected', () => {
    it('returns false when there is no active connection', async () => {
      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)

      expect(BluetoothSerial.isConnected).not.toHaveBeenCalled()
    })

    it('returns false on unsupported platforms', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })

    it('returns true when the native device is connected', async () => {
      await connectService()

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(true)
    })

    it('returns false when the native device is disconnected', async () => {
      await connectService()

      vi.mocked(BluetoothSerial.isConnected).mockResolvedValueOnce({
        isConnected: false,
      })

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)

      // Allow unexpected-disconnection handling to finish.
      await vi.waitFor(() => {
        expect(BluetoothSerial.disconnect).toHaveBeenCalled()
      })
    })

    it('does not report a disconnected service as connected again', async () => {
      await connectService()

      vi.mocked(BluetoothSerial.isConnected).mockResolvedValueOnce({
        isConnected: false,
      })

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)

      await vi.waitFor(async () => {
        await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
      })
    })
  })

  describe('connection health monitoring', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('detects when the phone Bluetooth adapter is switched off', async () => {
      const onConnectionChange = vi.fn<ConnectionChangeCallback>()

      await connectService(onConnectionChange)

      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: false,
      })

      await vi.advanceTimersByTimeAsync(3000)

      expect(onConnectionChange).toHaveBeenCalledWith(false, 'bluetooth-off')
      expect(BluetoothSerial.disconnect).toHaveBeenCalledOnce()

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })

    it('detects when the remote device disconnects', async () => {
      const onConnectionChange = vi.fn<ConnectionChangeCallback>()

      await connectService(onConnectionChange)

      vi.mocked(BluetoothSerial.isConnected).mockResolvedValue({
        isConnected: false,
      })

      await vi.advanceTimersByTimeAsync(3000)

      expect(onConnectionChange).toHaveBeenCalledWith(false, 'link-lost')
      expect(BluetoothSerial.disconnect).toHaveBeenCalledOnce()
    })

    it('does not report connection loss when the adapter remains enabled and the device is connected', async () => {
      const onConnectionChange = vi.fn<ConnectionChangeCallback>()

      await connectService(onConnectionChange)

      await vi.advanceTimersByTimeAsync(3000)

      expect(onConnectionChange).not.toHaveBeenCalled()
      expect(BluetoothSerial.disconnect).not.toHaveBeenCalled()
    })

    it('ignores transient health-check plugin errors', async () => {
      const onConnectionChange = vi.fn<ConnectionChangeCallback>()

      await connectService(onConnectionChange)

      vi.mocked(BluetoothSerial.isEnabled).mockRejectedValueOnce(
        new Error('Temporary adapter error'),
      )

      await vi.advanceTimersByTimeAsync(3000)

      expect(onConnectionChange).not.toHaveBeenCalled()
      expect(BluetoothSerial.disconnect).not.toHaveBeenCalled()

      // The next health check should still work.
      vi.mocked(BluetoothSerial.isEnabled).mockResolvedValue({
        isEnabled: true,
      })

      await vi.advanceTimersByTimeAsync(3000)

      expect(BluetoothSerial.isConnected).toHaveBeenCalledOnce()
    })

    it('does not run overlapping health checks', async () => {
      const onConnectionChange = vi.fn<ConnectionChangeCallback>()

      await connectService(onConnectionChange)

      let resolveCheck!: (value: { isEnabled: boolean }) => void

      vi.mocked(BluetoothSerial.isEnabled).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCheck = resolve
          }),
      )

      // Start the first health check.
      await vi.advanceTimersByTimeAsync(3000)

      // Attempt another tick while the first check is pending.
      await vi.advanceTimersByTimeAsync(3000)

      expect(BluetoothSerial.isEnabled).toHaveBeenCalledTimes(2)

      resolveCheck({ isEnabled: true })

      await vi.advanceTimersByTimeAsync(0)

      expect(onConnectionChange).not.toHaveBeenCalled()
    })
  })

  describe('startReading', () => {
    it('throws when there is no active connection', () => {
      expect(() => bluetoothSerialService.startReading()).toThrow(
        'Connect to a Bluetooth device first.',
      )

      expect(BluetoothSerial.available).not.toHaveBeenCalled()
    })

    it('reads incoming data and invokes onData', async () => {
      await connectService()

      const received: string[] = []
      let resolveReceived!: () => void
      let disconnectPromise: Promise<void> | undefined

      const receivedData = new Promise<void>((resolve) => {
        resolveReceived = resolve
      })

      vi.mocked(BluetoothSerial.available).mockResolvedValueOnce({
        available: 1,
      })

      vi.mocked(BluetoothSerial.read).mockResolvedValueOnce({
        data: 'weight=4250 steps=1250 battery=87',
      })

      bluetoothSerialService.startReading({
        onData: (data) => {
          received.push(data)

          // Stop reading immediately after receiving the first chunk.
          disconnectPromise = bluetoothSerialService.disconnect()
          resolveReceived()
        },
      })

      await receivedData
      await disconnectPromise

      expect(received).toEqual(['weight=4250 steps=1250 battery=87'])

      expect(BluetoothSerial.available).toHaveBeenCalledOnce()
      expect(BluetoothSerial.read).toHaveBeenCalledOnce()
    })

    it('does not start another read loop when already reading', async () => {
      await connectService()

      let resolveReceived!: () => void
      let disconnectPromise: Promise<void> | undefined

      const receivedData = new Promise<void>((resolve) => {
        resolveReceived = resolve
      })

      vi.mocked(BluetoothSerial.available).mockResolvedValueOnce({
        available: 1,
      })

      vi.mocked(BluetoothSerial.read).mockResolvedValueOnce({
        data: 'steps=100',
      })

      const options = {
        onData: () => {
          disconnectPromise = bluetoothSerialService.disconnect()
          resolveReceived()
        },
      }

      bluetoothSerialService.startReading(options)
      bluetoothSerialService.startReading(options)

      await receivedData
      await disconnectPromise

      expect(BluetoothSerial.available).toHaveBeenCalledOnce()
      expect(BluetoothSerial.read).toHaveBeenCalledOnce()
    })

    it('reports read errors through onError', async () => {
      await connectService()

      const error = new Error('Bluetooth socket closed')
      const onError = vi.fn<ErrorCallback>()

      let resolveError!: () => void

      const errorReported = new Promise<void>((resolve) => {
        resolveError = resolve
      })

      vi.mocked(BluetoothSerial.available).mockRejectedValueOnce(error)

      bluetoothSerialService.startReading({
        onError: (receivedError) => {
          onError(receivedError)
          resolveError()
        },
      })

      await errorReported

      expect(onError).toHaveBeenCalledWith(error)

      await vi.waitFor(() => {
        expect(BluetoothSerial.disconnect).toHaveBeenCalled()
      })

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })

    it('converts non-Error read failures into Error objects', async () => {
      await connectService()

      let receivedError: Error | undefined
      let resolveError!: () => void

      const errorReported = new Promise<void>((resolve) => {
        resolveError = resolve
      })

      vi.mocked(BluetoothSerial.available).mockRejectedValueOnce('Bluetooth read failed')

      bluetoothSerialService.startReading({
        onError: (error) => {
          receivedError = error
          resolveError()
        },
      })

      await errorReported

      expect(receivedError).toBeInstanceOf(Error)
      expect(receivedError?.message).toBe('Bluetooth read failed')
    })

    it('does not call onData when the received data is empty', async () => {
      await connectService()

      const onData = vi.fn<DataCallback>()

      vi.mocked(BluetoothSerial.available).mockResolvedValueOnce({
        available: 1,
      })

      vi.mocked(BluetoothSerial.read).mockResolvedValueOnce({
        data: '',
      })

      bluetoothSerialService.startReading({
        onData,
      })

      // Allow the read operation to complete.
      await vi.waitFor(() => {
        expect(BluetoothSerial.read).toHaveBeenCalledOnce()
      })

      await bluetoothSerialService.disconnect()

      expect(onData).not.toHaveBeenCalled()
    })
  })

  describe('write', () => {
    it('throws when there is no active connection', async () => {
      await expect(bluetoothSerialService.write('weight=4250')).rejects.toThrow(
        'Bluetooth device is not connected.',
      )

      expect(BluetoothSerial.write).not.toHaveBeenCalled()
    })

    it('writes data with an appended newline', async () => {
      await connectService()

      await bluetoothSerialService.write('weight=4250 steps=1250')

      expect(BluetoothSerial.write).toHaveBeenCalledWith({
        data: 'weight=4250 steps=1250\n',
      })
    })

    it('writes empty strings with a newline', async () => {
      await connectService()

      await bluetoothSerialService.write('')

      expect(BluetoothSerial.write).toHaveBeenCalledWith({
        data: '\n',
      })
    })

    it('propagates native write errors', async () => {
      await connectService()

      const error = new Error('Bluetooth socket write failed')

      vi.mocked(BluetoothSerial.write).mockRejectedValueOnce(error)

      await expect(bluetoothSerialService.write('weight=4250')).rejects.toThrow(
        'Bluetooth socket write failed',
      )

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })
  })

  describe('disconnect', () => {
    it('disconnects the native Bluetooth device', async () => {
      await connectService()

      await bluetoothSerialService.disconnect()

      expect(BluetoothSerial.disconnect).toHaveBeenCalledOnce()

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })

    it('does not trigger unexpected-disconnection callbacks', async () => {
      const onConnectionChange = vi.fn<ConnectionChangeCallback>()
      const onDisconnect = vi.fn<DisconnectCallback>()

      await connectService(onConnectionChange)

      // Start reading so an onDisconnect callback is registered.
      // No data is available, so the read loop remains idle.
      bluetoothSerialService.startReading({
        onDisconnect,
      })

      await bluetoothSerialService.disconnect()

      expect(onConnectionChange).not.toHaveBeenCalled()
      expect(onDisconnect).not.toHaveBeenCalled()
    })

    it('attempts native disconnection even when already disconnected', async () => {
      await bluetoothSerialService.disconnect()

      expect(BluetoothSerial.disconnect).toHaveBeenCalledOnce()
    })

    it('does not throw when native disconnection fails', async () => {
      vi.mocked(BluetoothSerial.disconnect).mockRejectedValueOnce(
        new Error('Native disconnect failed'),
      )

      await expect(bluetoothSerialService.disconnect()).resolves.toBeUndefined()

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(false)
    })

    it('can reconnect after disconnecting', async () => {
      await connectService()

      await bluetoothSerialService.disconnect()

      await connectService()

      await expect(bluetoothSerialService.isConnected()).resolves.toBe(true)

      expect(BluetoothSerial.connect).toHaveBeenCalledTimes(2)
    })
  })
})
