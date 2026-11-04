<template>
  <button
    type="button"
    :class="[
      'px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 transition',
      isBluetoothConnected ? 'error-btn' : 'form-submit',
    ]"
    :disabled="bluetoothConnecting || !macAddress"
    :aria-label="ariaLabel"
    @click="handleBluetoothConnection"
  >
    <!-- Bluetooth Status Icon (off icon only once Bluetooth is confirmed off) -->
    <BluetoothOnIcon v-if="bluetoothEnabled !== false" class="size-5" aria-hidden="true" />
    <BluetoothOffIcon v-else class="size-5" aria-hidden="true" />

    <!-- Button Label -->
    <span>{{ buttonLabel }}</span>

    <!-- Connecting Spinner -->
    <div v-if="bluetoothConnecting" class="ml-2 submit-spinner"></div>
  </button>
</template>

<script lang="ts">
/**
 * @module components/Smartpacks/BluetoothButton
 * @description Connect/disconnect button for a SmartPack's Bluetooth Classic
 * connection. Shows the phone's Bluetooth on/off state, notifies when it
 * changes, and emits each complete JSON message received from the device.
 *
 * Incoming data arrives in arbitrary chunks, so it is buffered until a
 * newline marks the end of a message, then parsed. The device must send one
 * JSON object per line (e.g. `SerialBT.println("{\"type\":\"sensors\"}")`).
 *
 * Designed to be mounted once at a time, since it polls the adapter state
 * and owns the shared Bluetooth serial connection.
 *
 * Parent usage:
 * ```vue
 * <BluetoothButton
 *   :mac-address="smartPack.bluetooth_mac_address"
 *   v-model:isBluetoothConnected="isBluetoothConnected"
 *   @message="onBluetoothMessage"
 * />
 * ```
 */

import { defineComponent, type PropType } from 'vue'
import { bluetoothSerialService } from '@/services/bluetoothSerial'
import { BluetoothSerial } from 'bluetooth-serial'
import BluetoothOnIcon from '@/components/Icons/BluetoothOnIcon.vue'
import BluetoothOffIcon from '@/components/Icons/BluetoothOffIcon.vue'

/** How often (ms) the phone's Bluetooth adapter state is checked. */
const STATUS_POLL_INTERVAL_MS = 2000

/**
 * Maximum characters held while waiting for a newline. Protects against a
 * device that never sends one.
 */
const MAX_LINE_LENGTH = 10000

export default defineComponent({
  name: 'BluetoothButton',

  components: {
    BluetoothOnIcon,
    BluetoothOffIcon,
  },

  props: {
    /**
     * The SmartPack's Bluetooth MAC address.
     */
    macAddress: {
      type: String as PropType<string | null | undefined>,
      default: null,
    },

    /**
     * Current SmartPack Bluetooth connection state.
     */
    isBluetoothConnected: {
      type: Boolean,
      default: false,
    },
  },

  /**
   * - `update:isBluetoothConnected`: connection state changed.
   * - `message`: a complete, parsed JSON message received from the SmartPack.
   */
  emits: ['update:isBluetoothConnected', 'message'] as const,

  data() {
    return {
      /**
       * Indicates whether a connection or disconnection is in progress.
       */
      bluetoothConnecting: false,

      /**
       * Phone's Bluetooth adapter state.
       * `null` until the first status check completes.
       */
      bluetoothEnabled: null as boolean | null,

      /**
       * Interval handle of the adapter status polling.
       */
      bluetoothStatusTimer: null as ReturnType<typeof setInterval> | null,

      /**
       * Guards against overlapping status checks.
       */
      statusCheckRunning: false,

      /**
       * Ensures a repeating status check failure is only logged once.
       */
      statusErrorLogged: false,
    }
  },

  computed: {
    /**
     * Returns the button label for the current connection state.
     *
     * @returns The label text.
     */
    buttonLabel(): string {
      if (this.bluetoothConnecting) {
        return this.isBluetoothConnected ? 'Disconnecting...' : 'Connecting...'
      }

      return this.isBluetoothConnected ? 'Disconnect' : 'Connect'
    },

    /**
     * Accessible label that also conveys the phone's Bluetooth state,
     * since that is otherwise only shown by the icon.
     *
     * @returns The aria-label text.
     */
    ariaLabel(): string {
      return this.bluetoothEnabled === false
        ? `Bluetooth is off. ${this.buttonLabel}`
        : this.buttonLabel
    },
  },

  /**
   * Starts polling the phone's Bluetooth adapter state.
   */
  mounted() {
    this.bluetoothStatusTimer = setInterval(() => {
      void this.checkBluetoothStatus()
    }, STATUS_POLL_INTERVAL_MS)

    void this.checkBluetoothStatus()
  },

  /**
   * Stops status polling, tells the parent the connection is gone,
   * and releases the Bluetooth connection.
   */
  beforeUnmount() {
    if (this.bluetoothStatusTimer) {
      clearInterval(this.bluetoothStatusTimer)
      this.bluetoothStatusTimer = null
    }

    if (this.isBluetoothConnected) {
      this.updateConnectionState(false)
    }

    void bluetoothSerialService.disconnect()
  },

  methods: {
    /**
     * Emits an updated Bluetooth connection state.
     *
     * @param connected - Whether the SmartPack is connected.
     */
    updateConnectionState(connected: boolean): void {
      this.$emit('update:isBluetoothConnected', connected)
    },

    /**
     * Checks the phone's Bluetooth adapter state and notifies when
     * Bluetooth turns on or off. The first check only records the initial
     * state, so no notification is shown on mount.
     *
     * @returns A promise that resolves when the check completes.
     */
    async checkBluetoothStatus(): Promise<void> {
      if (this.statusCheckRunning) return

      this.statusCheckRunning = true

      try {
        const { isEnabled } = await BluetoothSerial.isEnabled()
        const previous = this.bluetoothEnabled

        this.bluetoothEnabled = isEnabled
        this.statusErrorLogged = false

        if (previous !== null && previous !== isEnabled) {
          this.$notifySuccess(isEnabled ? 'Bluetooth turned on.' : 'Bluetooth turned off.')
        }
      } catch (error) {
        // Log once; a missing permission would otherwise log every poll.
        if (!this.statusErrorLogged) {
          this.statusErrorLogged = true
          console.error('[Bluetooth] Status check failed:', error)
        }
      } finally {
        this.statusCheckRunning = false
      }
    },

    /**
     * Connects to or disconnects from the SmartPack.
     *
     * When connected, starts listening for incoming data and emits each
     * complete JSON message as a `message` event.
     *
     * @returns A promise that resolves when the connection action completes.
     */
    async handleBluetoothConnection(): Promise<void> {
      if (this.bluetoothConnecting) return

      try {
        this.bluetoothConnecting = true

        // Disconnect from the currently connected SmartPack.
        if (this.isBluetoothConnected) {
          await bluetoothSerialService.disconnect()

          this.updateConnectionState(false)

          this.$notifySuccess('Bluetooth disconnected successfully.')
          return
        }

        const address = this.macAddress

        if (!address) {
          this.$notifyError('This SmartPack does not have a Bluetooth MAC address.')
          return
        }

        // Connect to the SmartPack.
        await bluetoothSerialService.connect(address, (connected, reason) => {
          this.updateConnectionState(connected)

          if (!connected) {
            // Avoid a duplicate toast when the phone's Bluetooth was switched
            // off; checkBluetoothStatus() already reports that.
            if (reason !== 'bluetooth-off') {
              this.$notifyError('SmartPack Bluetooth connection lost.')
            }
          }
        })

        this.updateConnectionState(true)

        // Holds an incomplete line until its newline arrives.
        // Declared per connection, so it starts empty on every connect.
        let lineBuffer = ''

        // Listen for incoming serial data.
        bluetoothSerialService.startReading({
          onData: (chunk) => {
            // Append incoming Bluetooth data to the receive buffer.
            lineBuffer += chunk

            /**
             * Attempts to parse a complete JSON message.
             *
             * @param text - The text to parse.
             * @returns The parsed JSON object if valid; otherwise, null.
             */
            const parseMessage = (text: string): unknown | null => {
              try {
                const message: unknown = JSON.parse(text)

                // SmartPack messages must be JSON objects.
                if (typeof message !== 'object' || message === null || Array.isArray(message)) {
                  return null
                }

                return message
              } catch {
                return null
              }
            }

            // 1. Check whether the accumulated buffer contains a complete JSON message.
            // This supports terminal applications that send JSON without a newline.
            const trimmedBuffer = lineBuffer.trim()

            if (trimmedBuffer) {
              const message = parseMessage(trimmedBuffer)

              if (message !== null) {
                this.$emit('message', message)
                lineBuffer = ''
                return
              }
            }

            // 2. Extract complete newline-delimited messages.
            // This is the preferred communication format for ESP32 firmware.
            const lines = lineBuffer.split(/\r?\n/)

            // Retain the incomplete final piece for the next Bluetooth callback.
            lineBuffer = lines.pop() ?? ''

            // 3. Prevent unlimited buffer growth if a newline never arrives.
            if (lineBuffer.length > MAX_LINE_LENGTH) {
              console.warn('[Bluetooth] Incomplete message exceeded maximum length.')
              lineBuffer = ''
            }

            // 4. Parse and emit each complete newline-delimited message.
            for (const line of lines) {
              const text = line.trim()

              if (!text) continue

              const message = parseMessage(text)

              if (message === null) {
                console.warn('[Bluetooth] Invalid JSON message:', text)
                continue
              }

              this.$emit('message', message)
            }
          },

          // Lost connections are reported by the connect callback above.
          onError: (error) => {
            console.error('[Bluetooth] Read error:', error)
          },
        })

        this.$notifySuccess('Bluetooth connected successfully.')
      } catch (error) {
        this.updateConnectionState(false)

        const err = error instanceof Error ? error : new Error(String(error))

        this.$notifyError(err.message)
      } finally {
        this.bluetoothConnecting = false
      }
    },
  },
})
</script>
