/**
 * @module services/bluetoothSerial
 * @description Singleton service wrapping the `bluetooth-serial` Capacitor
 * plugin (Bluetooth Classic / SPP, Android only). It handles connecting to a
 * paired device, continuously reading incoming data, writing strings, and
 * detecting dropped connections, including the phone's Bluetooth being
 * switched off.
 */

import { Capacitor } from '@capacitor/core'
import { BluetoothSerial } from 'bluetooth-serial'

/**
 * Why an established connection was lost.
 *
 * - `bluetooth-off`: the phone's Bluetooth adapter was turned off.
 * - `link-lost`: the adapter is on, but the remote device dropped
 *   (powered off, out of range, socket error, etc.).
 */
export type LostReason = 'bluetooth-off' | 'link-lost'
/**
 * Callback invoked when incoming Bluetooth data is received.
 */
export type DataCallback = (data: string) => void

/**
 * Callback invoked when Bluetooth reading fails.
 */
export type ErrorCallback = (error: Error) => void

/**
 * Callback invoked when the Bluetooth connection is unexpectedly lost.
 */
export type DisconnectCallback = () => void
/**
 * Callback invoked when the connection state changes unexpectedly.
 *
 * @param connected - Always `false` today; reserved for future states.
 * @param reason - Why the connection was lost.
 */
export type ConnectionChangeCallback = (connected: boolean, reason?: LostReason) => void

/**
 * Options accepted by {@link BluetoothSerialService.startReading}.
 */
type BluetoothSerialOptions = {
  /** Called with each chunk of data received from the device. */
  onData?: DataCallback
  /** Called when the read loop fails while the connection was still considered active. */
  onError?: ErrorCallback
  /** Called once when the connection is lost unexpectedly. */
  onDisconnect?: DisconnectCallback
}

/** How often (ms) the adapter state and link are checked while connected. */
const HEALTH_CHECK_INTERVAL_MS = 3000

/** How long (ms) the read loop waits before polling again when no data is available. */
const READ_POLL_INTERVAL_MS = 50

class BluetoothSerialService {
  /** Whether the service currently considers the link established. */
  private connected = false

  /** Whether the read loop should keep running. */
  private reading = false

  /** Promise of the running read loop, used to wait for it to exit. */
  private readTask: Promise<void> | null = null

  /** Interval handle of the connection health check. */
  private healthTimer: ReturnType<typeof setInterval> | null = null

  /** Guards against overlapping health check ticks. */
  private healthCheckRunning = false

  /**
   * True while `disconnect()` is running, so a user-initiated disconnect
   * is not reported as a lost connection.
   */
  private expectingDisconnect = false

  /** Listener for unexpected connection loss, supplied to `connect()`. */
  private onConnectionChange?: ConnectionChangeCallback

  /** Listener for unexpected connection loss, supplied to `startReading()`. */
  private onDisconnect?: () => void

  /**
   * Connects to a paired Bluetooth Classic device using its MAC address.
   *
   * Disconnects any existing connection first, waits for a previous read loop
   * to exit, and asks the user to enable Bluetooth if it is off.
   *
   * @param address - MAC address of the paired device (e.g. `AA:BB:CC:DD:EE:FF`).
   * @param onConnectionChange - Called if the connection is later lost unexpectedly.
   * @throws If the platform is unsupported, the address is invalid, Bluetooth
   * is not enabled, or the native connection fails.
   */
  async connect(address: string, onConnectionChange?: ConnectionChangeCallback): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Bluetooth Classic is only supported on Android.')
    }

    if (!this.isValidAddress(address)) {
      throw new Error('Invalid Bluetooth MAC address.')
    }

    if (this.connected) {
      await this.disconnect()
    }

    // Make sure a previous read loop has fully exited. After a lost
    // connection `disconnect()` is not called, so it may still be finishing.
    if (this.readTask) {
      await this.readTask.catch(() => {})
      this.readTask = null
    }

    const { isEnabled } = await BluetoothSerial.isEnabled()

    if (!isEnabled) {
      const result = await BluetoothSerial.enable()

      if (!result.isEnabled) {
        throw new Error('Bluetooth is disabled.')
      }
    }

    this.onConnectionChange = onConnectionChange

    try {
      await BluetoothSerial.connect({ address })

      this.connected = true
      this.startHealthCheck()
    } catch (error) {
      this.connected = false
      this.onConnectionChange = undefined

      throw error
    }
  }

  /**
   * Starts the periodic health check that detects dropped connections.
   *
   * Checks the adapter first (Bluetooth turned off), then the link itself
   * (device out of range or powered off), so the correct {@link LostReason}
   * is reported.
   */
  private startHealthCheck(): void {
    this.stopHealthCheck()

    this.healthTimer = setInterval(async () => {
      if (!this.connected || this.expectingDisconnect || this.healthCheckRunning) {
        return
      }

      this.healthCheckRunning = true

      try {
        const { isEnabled } = await BluetoothSerial.isEnabled()

        if (!isEnabled) {
          void this.handleConnectionLost('bluetooth-off')
          return
        }

        const { isConnected } = await BluetoothSerial.isConnected()

        if (!isConnected && this.connected && !this.expectingDisconnect) {
          void this.handleConnectionLost('link-lost')
        }
      } catch {
        // Ignore transient plugin errors; the next tick will retry.
      } finally {
        this.healthCheckRunning = false
      }
    }, HEALTH_CHECK_INTERVAL_MS)
  }

  /**
   * Stops the periodic health check, if running.
   */
  private stopHealthCheck(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer)
      this.healthTimer = null
    }
  }

  /**
   * Handles a connection that dropped unexpectedly.
   *
   * Safe to call multiple times: state is flipped synchronously, so only the
   * first call after a connection proceeds. If no reason is given, the
   * adapter state is checked to work one out. Nothing is reported if the user
   * disconnected in the meantime.
   *
   * @param reason - Why the connection was lost, if the caller already knows.
   */
  private async handleConnectionLost(reason?: LostReason): Promise<void> {
    if (!this.connected) return

    // Flip state synchronously so only the first caller proceeds.
    this.connected = false
    this.reading = false
    this.stopHealthCheck()

    // Capture listeners now; disconnect() may clear them while we await.
    const onConnectionChange = this.onConnectionChange
    const onDisconnect = this.onDisconnect

    if (!reason) {
      const enabled = await BluetoothSerial.isEnabled()
        .then((r) => r.isEnabled)
        .catch(() => true)

      reason = enabled ? 'link-lost' : 'bluetooth-off'
    }

    // The user disconnected while we were checking, so there is nothing to report.
    if (this.expectingDisconnect) return

    // Free the native socket before notifying, so a quick reconnect
    // cannot have its new socket closed by this call.
    await BluetoothSerial.disconnect().catch(() => {})

    onConnectionChange?.(false, reason)
    onDisconnect?.()
  }

  /**
   * Starts continuously reading incoming Bluetooth data.
   *
   * Does nothing if reading is already in progress.
   *
   * @param options - Data, error and disconnect handlers.
   * @throws If there is no active connection.
   */
  startReading(options: BluetoothSerialOptions = {}): void {
    if (!this.connected) {
      throw new Error('Connect to a Bluetooth device first.')
    }

    if (this.reading) return

    this.onDisconnect = options.onDisconnect

    this.reading = true
    this.readTask = this.readLoop(options)
  }

  /**
   * Polls the plugin for incoming data until reading is stopped or the
   * link fails. A failed read is treated as a lost connection.
   *
   * @param options - Data and error handlers.
   */
  private async readLoop(options: BluetoothSerialOptions): Promise<void> {
    try {
      while (this.reading) {
        const { available } = await BluetoothSerial.available()

        if (!this.reading) break

        if (available <= 0) {
          await this.delay(READ_POLL_INTERVAL_MS)
          continue
        }

        const { data } = await BluetoothSerial.read()

        if (data && this.reading) {
          options.onData?.(data)
        }
      }
    } catch (error) {
      const wasConnected = this.connected

      // A failed read means the link is dead.
      void this.handleConnectionLost()

      if (wasConnected && !this.expectingDisconnect) {
        options.onError?.(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  /**
   * Sends a string to the connected device. A newline is appended.
   *
   * @param data - The text to send.
   * @throws If not connected, or if the write fails (which also marks the
   * connection as lost).
   */
  async write(data: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Bluetooth device is not connected.')
    }

    try {
      await BluetoothSerial.write({ data: `${data}\n` })
    } catch (error) {
      // Writing to a dead socket throws, so treat it as a lost connection.
      void this.handleConnectionLost()
      throw error
    }
  }

  /**
   * Stops reading and disconnects. Does not trigger lost-connection callbacks.
   *
   * Always attempts the native disconnect to free the socket, even if the
   * service thinks it is already disconnected.
   */
  async disconnect(): Promise<void> {
    this.expectingDisconnect = true

    try {
      this.reading = false
      this.stopHealthCheck()

      if (this.readTask) {
        await this.readTask.catch(() => {})
        this.readTask = null
      }

      await BluetoothSerial.disconnect().catch(() => {})
    } finally {
      this.connected = false
      this.onConnectionChange = undefined
      this.onDisconnect = undefined
      this.expectingDisconnect = false
    }
  }

  /**
   * Checks the actual connection state against the native plugin.
   *
   * Never "revives" a connection the service already considers closed: if the
   * link is gone, the lost-connection handling runs instead.
   *
   * @returns `true` if the device is still connected, otherwise `false`.
   */
  async isConnected(): Promise<boolean> {
    if (!this.isSupported() || !this.connected) return false

    const { isConnected } = await BluetoothSerial.isConnected()

    if (!isConnected) {
      // Sets this.connected = false synchronously.
      void this.handleConnectionLost()
    }

    return this.connected
  }

  /**
   * Whether Bluetooth Classic serial is available on this platform.
   *
   * @returns `true` on native Android only.
   */
  private isSupported(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  }

  /**
   * Validates a Bluetooth MAC address (`AA:BB:CC:DD:EE:FF`).
   *
   * @param address - The address to validate.
   * @returns `true` if the format is valid.
   */
  private isValidAddress(address: string): boolean {
    return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(address)
  }

  /**
   * Resolves after the given delay.
   *
   * @param ms - Delay in milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/** Shared service instance. */
export const bluetoothSerialService = new BluetoothSerialService()
