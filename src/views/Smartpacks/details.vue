<template>
  <div class="w-full px-4 py-10">
    <div
      v-if="activePage === 'showDetails'"
      class="grid gap-6 lg:grid-cols-[28%_72%] mx-auto max-w-6xl"
    >
      <!-- Summary Card -->
      <header class="main-card p-6">
        <div class="flex flex-col items-center justify-center gap-4">
          <div
            class="flex h-32 w-32 lg:w-36 lg:h-36 items-center justify-center rounded-full border-2 card-base"
          >
            <BackPackIcon class="h-20 w-20 lg:h-24 lg:w-24 primary-text" />
          </div>

          <h2 class="main-heading text-xl lg:text-2xl">SmartPack</h2>
          <h3 class="sub-heading lg:text-lg">
            {{ smartPack.hardware_model || '—' }}
          </h3>

          <div class="flex secondary-text justify-start w-full" title="Child">
            <UserIcon class="secondary-text text-left mr-2" />

            <span>
              {{ smartPack.child_name || '—' }}
            </span>
          </div>

          <div class="flex secondary-text justify-start w-full" title="Group">
            <UserGroupIcon class="secondary-text text-left mr-2" />

            <RouterLink
              v-if="smartPack.group"
              :to="{
                name: 'group-details',
                params: { id: smartPack.group.id },
              }"
              class="primary-text hover:underline"
            >
              {{ smartPack.group.name }}
            </RouterLink>

            <span v-else>—</span>
          </div>

          <div class="flex secondary-text justify-start w-full" title="Connection Status">
            <span :class="$filters.activeClass(smartPack.is_online)"></span>
            <span class="ml-2">
              {{ smartPack.is_online ? 'Online' : 'Offline' }}
            </span>
          </div>

          <!-- Bluetooth Connection (Mobile Only) -->
          <BluetoothButton
            v-if="isMobile"
            :mac-address="smartPack.bluetooth_mac_address"
            v-model:isBluetoothConnected="isBluetoothConnected"
            @message="onBluetoothMessage"
          />
        </div>
      </header>

      <!-- Details Card -->
      <section class="main-card grid gap-6 p-6">
        <!-- Tab Switcher -->
        <div class="flex gap-2 border-b border-white/10">
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold"
            :class="
              activeDetailsTab === 'details'
                ? 'text-primary border-b-2 border-primary'
                : 'secondary-text'
            "
            :disabled="activeDetailsTab === 'details'"
            @click="activeDetailsTab = 'details'"
          >
            Details
          </button>

          <button
            v-if="isMobile"
            type="button"
            class="px-4 py-2 text-sm font-semibold"
            :class="
              activeDetailsTab === 'settings'
                ? 'text-primary border-b-2 border-primary'
                : 'secondary-text'
            "
            :disabled="activeDetailsTab === 'settings'"
            @click="activeDetailsTab = 'settings'"
          >
            Settings
          </button>
        </div>

        <!-- Details Tab -->
        <template v-if="activeDetailsTab === 'details'">
          <div
            class="card-base bg-page dark:bg-page-dark grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 lg:text-lg break-words"
          >
            <!-- Left -->
            <div>
              <div>
                <dt class="mt-1 primary-text">IMEI</dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPack.imei || '—' }}
                </dd>
              </div>

              <div>
                <dt class="mt-1 primary-text">Firmware Version</dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPack.firmware_version || '—' }}
                </dd>
              </div>
            </div>

            <!-- Right -->
            <div>
              <div>
                <dt class="mt-1 primary-text">Last Seen</dt>
                <dd class="mt-1 secondary-text">
                  {{ formatLastSeen(smartPack.last_seen) }}
                </dd>
              </div>

              <div>
                <dt class="mt-1 primary-text">Added</dt>
                <dd class="mt-1 secondary-text">
                  {{ $filters.dateTime(smartPack.created) || '—' }}
                </dd>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4 items-center justify-start lg:justify-between flex-wrap p-4">
            <button
              v-if="!smartPack.group || authStore.isGroupAdmin(smartPack.group.id)"
              type="button"
              :class="
                smartPack.group
                  ? 'px-4 py-2 rounded-full text-sm font-semibold error-btn'
                  : 'px-4 py-2 rounded-full text-sm font-semibold form-submit'
              "
              @click="handleGroupAction"
              :disabled="submitting"
            >
              {{ smartPack.group ? 'Unassign from Group' : 'Assign to Group' }}
            </button>

            <button
              v-if="!smartPack.group || authStore.isGroupAdmin(smartPack.group.id)"
              type="button"
              class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
              @click="handlePageChange('assignChild')"
              :disabled="submitting"
            >
              Assign to Child
            </button>

            <button
              type="button"
              :disabled="printingQr"
              class="px-4 py-2 rounded-full text-sm font-semibold form-submit-secondary"
              @click="handlePrintQr(true)"
            >
              Print QR
            </button>
          </div>
        </template>

        <!-- Settings Tab (Mobile Only) -->
        <template v-else-if="activeDetailsTab === 'settings' && isMobile">
          <!-- Bluetooth Disconnected -->
          <div
            v-if="!isBluetoothConnected"
            class="card-base bg-page dark:bg-page-dark flex flex-col items-center justify-center text-center p-8 gap-2"
          >
            <h3 class="primary-text font-semibold">SmartPack Disconnected</h3>

            <p class="secondary-text text-sm max-w-md">
              Connect to your SmartPack via Bluetooth to view its configuration settings.
            </p>
          </div>

          <!-- Configuration Not Received -->
          <div
            v-else-if="!smartPackConfiguration"
            class="card-base bg-page dark:bg-page-dark flex flex-col items-center justify-center text-center p-8 gap-2"
          >
            <h3 class="primary-text font-semibold">Waiting for Configuration</h3>

            <p class="secondary-text text-sm max-w-md">
              Connected successfully. Waiting to receive configuration settings from your SmartPack.
            </p>
          </div>

          <!-- Configuration Details -->
          <div
            v-else
            class="card-base bg-page dark:bg-page-dark grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 lg:text-lg break-words"
          >
            <!-- Left Column -->
            <div>
              <div>
                <dt class="mt-1 primary-text flex items-center gap-2">
                  Weight Limit
                  <InfoTooltip
                    text="Maximum permitted weight of the SmartPack's contents. The buzzer alerts the child when this limit is exceeded."
                  />
                </dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPackConfiguration.weight_limit.toLocaleString() }} grams
                </dd>
              </div>

              <div>
                <dt class="mt-1 primary-text flex items-center gap-2">
                  Delay
                  <InfoTooltip
                    text="Time interval, in seconds, between sensor measurement updates."
                  />
                </dt>
                <dd class="mt-1 secondary-text">{{ smartPackConfiguration.delay }} seconds</dd>
              </div>

              <div>
                <dt class="mt-1 primary-text flex items-center gap-2">
                  Bluetooth Name
                  <InfoTooltip
                    text="Bluetooth device name advertised by the SmartPack when discoverable."
                  />
                </dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPackConfiguration.bluetooth_name || '—' }}
                </dd>
              </div>
            </div>

            <!-- Right Column -->
            <div>
              <div>
                <dt class="mt-1 primary-text flex items-center gap-2">
                  Communication Mode
                  <InfoTooltip
                    placement="right"
                    text="Communication method used by the SmartPack to transmit data: GSM or Wi-Fi. Bluetooth is used for local configuration and communication with the mobile app."
                  />
                </dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPackConfiguration.com_mode === 0 ? 'GSM' : 'Wi-Fi' }}
                </dd>
              </div>

              <div>
                <dt class="mt-1 primary-text flex items-center gap-2">
                  Wi-Fi SSID
                  <InfoTooltip
                    text="Name of the Wi-Fi network the SmartPack connects to when Wi-Fi communication mode is selected."
                  />
                </dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPackConfiguration.wifi_settings.ssid || '—' }}
                </dd>
              </div>

              <div>
                <dt class="mt-1 primary-text flex items-center gap-2">
                  Wi-Fi Password
                  <InfoTooltip
                    text="Password used to authenticate with the configured Wi-Fi network."
                  />
                </dt>
                <dd class="mt-1 secondary-text">
                  {{ smartPackConfiguration.wifi_settings.password || '—' }}
                </dd>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4 items-center justify-start lg:justify-between flex-wrap p-4">
            <button
              type="button"
              class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
              @click="updateSmartPackConfiguration"
              :disabled="!isBluetoothConnected || !smartPackConfiguration || submitting"
            >
              Update
            </button>
          </div>
        </template>
      </section>
    </div>

    <!-- Assign Child Card -->
    <div v-else class="main-card">
      <header class="flex gap-3 items-center justify-between p-4">
        <h2 class="main-heading text-2xl lg:text-3xl">Assign to Child</h2>

        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
          @click="activePage = 'showDetails'"
        >
          Cancel
        </button>
      </header>

      <AssignChildForm :initial-values="{ ...smartPack }" @close="handlePageChange" />
    </div>

    <!-- Sensor Measurements -->
    <SmartPackSensorMeasurements
      v-if="smartPack.id && smartPack.device_uid && activePage === 'showDetails'"
      class="mt-8 mx-auto max-w-6xl"
      :smartpack-id="smartPack.id"
      :smartpack-uid="smartPack.device_uid"
      :is-bluetooth-connected="isBluetoothConnected"
      :sensor-history="sensorHistory"
    />

    <!-- Assign Group Modal -->
    <AssignGroup
      v-if="showAssignGroupTable"
      :smart-pack="smartPack"
      :submitting="submitting"
      @close="handleShowAssignGroupTable"
      @assign="handleAssignGroup"
    />

    <!-- QR Code Helper -->
    <SmartPackQrComponent v-if="printingQr" :item="smartPack" @show-qr="handlePrintQr" />
  </div>
</template>

<script lang="ts">
/**
 * @module views/SmartPacks/Details
 * @description Displays SmartPack details and configuration settings with offline caching support.
 * Allows authorized users to manage group and child assignments, view sensor measurements,
 * configure the SmartPack via Bluetooth on mobile devices, and print its QR code.
 */

import { defineComponent } from 'vue'
import type { SmartPack } from '@/api/modules/smartpacks'
import type { Group } from '@/api/modules/groups'
import type { ItemNotFoundError } from '@/api/types'
import InfoTooltip from '@/components/Base/InfoTooltip.vue'
import SmartPackSensorMeasurements from '@/components/Smartpacks/SensorMeasurements.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import AssignGroup from '@/components/Smartpacks/AssignGroup.vue'
import AssignChildForm from '@/components/Smartpacks/UpdateForm.vue'
import SmartPackQrComponent from '@/components/Smartpacks/QrCode.vue'
import BluetoothButton from '@/components/Smartpacks/BluetoothButton.vue'
import type {
  SmartPackSensorMessage,
  SmartPackSensorRecord,
  SmartPackConfiguration,
} from '@/types/bluetooth'
import { useAuthStore } from '@/stores/modules/auth'
import { fetchByIdWithCache, repositories } from '@/services/database'

/** Maximum number of Bluetooth sensor readings to retain. */
const MAX_SENSOR_HISTORY = 1000
const BLUETOOTH_SAVE_INTERVAL = 5000 // 5 seconds
/**
 * Validates whether a value is a valid SmartPack sensor message.
 *
 * @param {unknown} payload - Incoming Bluetooth message.
 * @returns {boolean} Whether the payload matches SmartPackSensorMessage.
 */
function isSmartPackSensorMessage(payload: unknown): payload is SmartPackSensorMessage {
  if (typeof payload !== 'object' || payload === null || !('type' in payload)) {
    return false
  }

  if (payload.type !== 'sensors' || !('data' in payload)) {
    return false
  }

  const data = payload.data

  return (
    typeof data === 'object' &&
    data !== null &&
    'weight' in data &&
    typeof data.weight === 'number' &&
    Number.isFinite(data.weight) &&
    data.weight >= 0 &&
    'steps' in data &&
    typeof data.steps === 'number' &&
    Number.isFinite(data.steps) &&
    data.steps >= 0
  )
}

/**
 * Validates whether a value is a valid SmartPack configuration.
 *
 * @param {unknown} payload - Incoming Bluetooth message.
 * @returns {boolean} Whether the payload matches SmartPackConfiguration.
 */
function isSmartPackConfiguration(payload: unknown): payload is SmartPackConfiguration {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  if (
    !('weight_limit' in payload) ||
    typeof payload.weight_limit !== 'number' ||
    !Number.isFinite(payload.weight_limit) ||
    payload.weight_limit < 0
  ) {
    return false
  }

  if (
    !('delay' in payload) ||
    typeof payload.delay !== 'number' ||
    !Number.isFinite(payload.delay) ||
    payload.delay < 0
  ) {
    return false
  }

  if (!('com_mode' in payload) || (payload.com_mode !== 0 && payload.com_mode !== 1)) {
    return false
  }

  if (
    !('wifi_settings' in payload) ||
    typeof payload.wifi_settings !== 'object' ||
    payload.wifi_settings === null ||
    !('ssid' in payload.wifi_settings) ||
    typeof payload.wifi_settings.ssid !== 'string' ||
    !('password' in payload.wifi_settings) ||
    typeof payload.wifi_settings.password !== 'string'
  ) {
    return false
  }

  return 'bluetooth_name' in payload && typeof payload.bluetooth_name === 'string'
}

export default defineComponent({
  name: 'SmartPackDetails',

  components: {
    AssignChildForm,
    BackPackIcon,
    BluetoothButton,
    InfoTooltip,
    UserIcon,
    UserGroupIcon,
    AssignGroup,
    SmartPackQrComponent,
    SmartPackSensorMeasurements,
  },

  computed: {
    /**
     * Returns the authenticated user's Pinia store.
     *
     * @returns The authentication store.
     */
    authStore() {
      return useAuthStore(this.$pinia)
    },

    /**
     * Extracts the SmartPack ID from the current route.
     *
     * @returns An object containing the SmartPack ID.
     */
    smartPackId(): { id: string } {
      const id = this.$route.params.id

      return {
        id: typeof id === 'string' ? id : '',
      }
    },
    /**
     * Determines whether the application is running in mobile mode.
     *
     * Checks the Vite environment mode configured during the build.
     *
     * @returns {boolean} `true` when running in mobile mode; otherwise, `false`.
     */
    isMobile(): boolean {
      return import.meta.env.MODE === 'mobile'
    },
  },

  data() {
    return {
      smartPack: {} as SmartPack,

      // null means the device has not sent its configuration yet.
      smartPackConfiguration: null as SmartPackConfiguration | null,

      activePage: 'showDetails' as 'showDetails' | 'assignChild',

      // Controls the Details / Settings tabs.
      activeDetailsTab: 'details' as 'details' | 'settings',

      showAssignGroupTable: false,
      submitting: false,
      isBluetoothConnected: false,

      sensorHistory: [] as SmartPackSensorRecord[],
      bluetoothMeasurementBuffer: [] as SmartPackSensorRecord[],
      isFlushingBluetoothMeasurements: false,
      bluetoothSaveTimer: null as ReturnType<typeof setInterval> | null,

      // Indicates whether a configuration update is in progress.
      updatingConfiguration: false,

      /**
       * Indicates whether the hidden QR helper should render and download.
       */
      printingQr: false,
    }
  },

  /**
   * Refreshes the authenticated user's data to ensure the latest permissions
   * are available, then fetches the SmartPack details.
   *
   * User data fetching runs asynchronously without blocking the SmartPack
   * details request. Errors during user data fetching are ignored.
   *
   * @returns A promise that resolves when the SmartPack details are loaded.
   */
  async mounted() {
    this.authStore.fetchUser().catch(() => {})
    await this.getSmartPack()
  },

  methods: {
    /**
     * Handles incoming SmartPack sensor messages.
     *
     * Validates sensor readings, records their values and reception timestamp,
     * and updates the in-memory sensor history.
     *
     * Valid readings are queued for periodic batch persistence when running
     * on mobile and Bluetooth is connected.
     *
     * @param {unknown} payload - Incoming Bluetooth message.
     * @returns {void}
     */
    handleSensorMessage(payload: unknown): void {
      if (!isSmartPackSensorMessage(payload)) {
        return
      }

      const reading: SmartPackSensorRecord = {
        ...payload.data,
        timestamp: new Date().toISOString(),
      }

      this.sensorHistory.push(reading)

      if (this.sensorHistory.length > MAX_SENSOR_HISTORY) {
        this.sensorHistory.shift()
      }

      if (this.isMobile && this.isBluetoothConnected) {
        this.queueBluetoothMeasurement(reading)
      }
    },

    /**
     * Handles incoming SmartPack configuration messages.
     *
     * Validates the configuration payload and updates the in-memory
     * SmartPack configuration.
     *
     * @param {unknown} payload - Incoming Bluetooth message.
     * @returns {void}
     */
    handleConfigurationMessage(payload: unknown): void {
      if (!isSmartPackConfiguration(payload)) {
        return
      }

      this.smartPackConfiguration = {
        ...payload,
        wifi_settings: { ...payload.wifi_settings },
      }
    },

    /**
     * Handles incoming Bluetooth messages from the SmartPack device.
     *
     * Identifies supported message types and delegates processing to
     * their respective handlers.
     *
     * @param {unknown} payload - Parsed message received over Bluetooth.
     * @returns {void}
     */
    onBluetoothMessage(payload: unknown): void {
      if (isSmartPackSensorMessage(payload)) {
        this.handleSensorMessage(payload)
        return
      }

      if (isSmartPackConfiguration(payload)) {
        this.handleConfigurationMessage(payload)
      }
    },
    /**
     * Fetches the SmartPack details using the ID from the current route.
     *
     * Redirects to the SmartPacks list if the device no longer exists.
     *
     * @returns A promise that resolves when the fetch completes.
     */
    async getSmartPack(): Promise<void> {
      try {
        const smartpack = await fetchByIdWithCache(
          () => this.$api.smartpacks.getById(this.smartPackId),
          repositories.smartpacks,
          Number(this.smartPackId.id),
        )

        this.smartPack = smartpack

        if (this.isMobile) {
          this.loadBluetoothHistory()
        }
      } catch (error) {
        const itemError = error as ItemNotFoundError

        this.$notifyError(itemError.message)

        if (itemError.reload) {
          this.$router.push({ name: 'smartpacks' })
        }
      }
    },

    /**
     * Changes the active page and optionally refreshes the SmartPack details.
     *
     * @param value - The page to display.
     * @param refresh - Whether to reload the SmartPack details.
     * @returns Nothing.
     */
    handlePageChange(value: 'showDetails' | 'assignChild', refresh = false): void {
      this.activePage = value

      if (refresh) {
        this.getSmartPack()
      }
    },

    /**
     * Formats the SmartPack's last-seen timestamp.
     *
     * @param lastSeen - The last-seen timestamp.
     * @returns The formatted date and time, or an em dash when unavailable.
     */
    formatLastSeen(lastSeen: string | null | undefined): string {
      if (!lastSeen) return '—'

      return this.$filters.dateTime(lastSeen) || '—'
    },

    /**
     * Opens the group assignment modal when the SmartPack has no group.
     * Otherwise, starts the process of unassigning the existing group.
     *
     * @returns Nothing.
     */
    handleGroupAction(): void {
      if (this.smartPack.group) {
        this.unassignGroup()
        return
      }

      this.showAssignGroupTable = true
    },

    /**
     * Assigns the selected group to the SmartPack.
     *
     * Refreshes the SmartPack details and displays a success notification
     * when the assignment succeeds.
     *
     * @param group - The group to assign to the SmartPack.
     * @returns A promise that resolves when the assignment completes.
     */
    async handleAssignGroup(group: Group): Promise<void> {
      try {
        this.submitting = true

        const message = await this.$api.smartpacks.assignGroup(this.smartPack.id, {
          group: group.id,
        })

        this.showAssignGroupTable = false

        await this.getSmartPack()

        this.$notifySuccess(message)
      } catch (error) {
        const err = error as ItemNotFoundError

        this.$notifyError(err.message)

        if (err.reload) {
          this.$router.push({ name: 'smartpacks' })
        }
      } finally {
        this.submitting = false
      }
    },

    /**
     * Unassigns the current group from the SmartPack after confirmation.
     *
     * Refreshes the SmartPack details and displays a success notification
     * when the unassignment succeeds.
     *
     * @returns A promise that resolves when the unassignment completes.
     */
    async unassignGroup(): Promise<void> {
      if (!this.smartPack.group) return

      try {
        const confirmation = await this.$deleteModal('Unassign Group', '', {
          text: `Are you sure you want to remove the SmartPack from the group "${this.smartPack.group.name}"?`,
        })

        if (!confirmation) return

        this.submitting = true

        const message = await this.$api.smartpacks.unassignGroup(this.smartPack.id)

        await this.getSmartPack()

        this.$notifySuccess(message)
      } catch (error) {
        const err = error as ItemNotFoundError

        this.$notifyError(err.message)

        if (err.reload) {
          this.$router.push({ name: 'smartpacks' })
        }
      } finally {
        this.submitting = false
      }
    },

    /**
     * Updates the visibility of the group assignment modal.
     *
     * @param value - Whether the modal should be visible.
     * @returns Nothing.
     */
    handleShowAssignGroupTable(value: boolean): void {
      this.showAssignGroupTable = value
    },

    /**
     * Toggles the QR helper so it can trigger the download, then hides it.
     *
     * @param value - Whether the QR helper should be visible.
     * @returns Nothing.
     */
    handlePrintQr(value: boolean): void {
      this.printingQr = value
    },
    /**
     * Loads previously cached Bluetooth sensor measurements for the current
     * SmartPack from the local SQLite database.
     *
     * Only runs in mobile mode. Loads the most recent readings while preserving
     * chronological order for subsequent real-time updates.
     *
     * @returns A promise that resolves when the history has been loaded.
     */
    async loadBluetoothHistory(): Promise<void> {
      if (!this.isMobile || !this.smartPack.id) {
        return
      }

      try {
        const measurements = await repositories.bluetoothSensorMeasurements.getBySmartPackId(
          this.smartPack.id,
        )

        this.sensorHistory = measurements
          .slice(0, MAX_SENSOR_HISTORY)
          .reverse()
          .map(({ weight, steps, timestamp }) => ({
            weight,
            steps,
            timestamp,
          }))
      } catch (error) {
        console.error('[SmartPack] Failed to load Bluetooth sensor history:', error)
      }
    },
    /**
     * Adds a Bluetooth sensor reading to the persistence buffer.
     *
     * @param reading - The sensor reading to cache.
     */
    queueBluetoothMeasurement(reading: SmartPackSensorRecord): void {
      this.bluetoothMeasurementBuffer.push(reading)
    },

    /**
     * Persists buffered Bluetooth sensor measurements to SQLite.
     *
     * Uses batch saving to reduce database transactions and prevents
     * concurrent flush operations.
     */
    async flushBluetoothMeasurements(): Promise<void> {
      if (
        !this.smartPack.id ||
        this.bluetoothMeasurementBuffer.length === 0 ||
        this.isFlushingBluetoothMeasurements
      ) {
        return
      }

      this.isFlushingBluetoothMeasurements = true

      const measurements = this.bluetoothMeasurementBuffer
      this.bluetoothMeasurementBuffer = []

      try {
        await repositories.bluetoothSensorMeasurements.saveList(this.smartPack.id, measurements)
      } catch (error) {
        this.bluetoothMeasurementBuffer.unshift(...measurements)

        console.error('[SmartPack] Failed to cache Bluetooth measurements:', error)
      } finally {
        this.isFlushingBluetoothMeasurements = false
      }
    },
    /**
     * Starts periodic persistence of buffered Bluetooth measurements.
     */
    startBluetoothPersistence(): void {
      if (this.bluetoothSaveTimer !== null) {
        return
      }

      this.bluetoothSaveTimer = setInterval(() => {
        this.flushBluetoothMeasurements()
      }, BLUETOOTH_SAVE_INTERVAL)
    },

    /**
     * Stops periodic persistence and saves any remaining measurements.
     */
    stopBluetoothPersistence(): void {
      if (this.bluetoothSaveTimer !== null) {
        clearInterval(this.bluetoothSaveTimer)
        this.bluetoothSaveTimer = null
      }

      this.flushBluetoothMeasurements()
    },
    /**
     * Validates the current configuration before sending it to the SmartPack.
     *
     * The Bluetooth write operation will be added once the service's
     * write API is confirmed.
     *
     * @returns A promise that resolves when the operation completes.
     */
    async updateSmartPackConfiguration(): Promise<void> {
      if (!this.isMobile) {
        this.$notifyError('Configuration updates are only available on mobile.')
        return
      }

      if (!this.isBluetoothConnected) {
        this.$notifyError('Connect to your SmartPack before updating its configuration.')
        return
      }

      if (!this.smartPackConfiguration) {
        this.$notifyError('SmartPack configuration has not been received.')
        return
      }

      if (!isSmartPackConfiguration(this.smartPackConfiguration)) {
        this.$notifyError('Please provide valid configuration settings.')
        return
      }

      // TODO: Send the configuration to the device using the Bluetooth
      // service's confirmed write API.

      this.$notifyError('Bluetooth configuration writing has not been implemented yet.')
    },
  },
  watch: {
    /**
     * Watches the Bluetooth connection state and manages periodic
     * persistence of buffered sensor measurements.
     *
     * Starts the Bluetooth persistence timer when the device connects
     * and stops the timer while flushing pending measurements when
     * the device disconnects.
     *
     * @param {boolean} connected - Whether the SmartPack device is connected over Bluetooth.
     * @returns {void}
     */
    isBluetoothConnected(connected: boolean): void {
      if (connected) {
        // Wait for the device to send its configuration.
        this.smartPackConfiguration = null

        this.startBluetoothPersistence()
      } else {
        this.smartPackConfiguration = null
        this.activeDetailsTab = 'details'

        this.stopBluetoothPersistence()
      }
    },
  },
  beforeUnmount() {
    this.stopBluetoothPersistence()
  },
})
</script>

<style scoped></style>
