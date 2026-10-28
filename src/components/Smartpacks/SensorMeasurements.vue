<template>
  <div class="main-card w-full">
    <header class="flex items-center justify-between gap-3 p-4">
      <div>
        <h3 class="sub-heading text-xl text-left">Sensor Measurements</h3>
        <p class="secondary-text mt-1 text-sm">
          Weight and cumulative step measurements recorded by this SmartPack.
        </p>
      </div>
    </header>
    <div
      class="secondary-text flex items-center gap-2 px-4 text-xs"
      role="status"
      aria-live="polite"
    >
      <span
        class="h-2 w-2 shrink-0 rounded-full"
        :class="mqttConnected ? 'bg-green-500' : 'bg-gray-400'"
        aria-hidden="true"
      />

      {{
        mqttConnected
          ? 'Live sensor updates connected'
          : 'Live sensor updates disconnected. Reconnecting...'
      }}
    </div>
    <div class="p-4">
      <div v-if="loading" class="flex items-center justify-center p-8">
        <div class="loading-animation flex h-20 w-20 items-center justify-center rounded-full">
          <AnalyticsIcon class="h-8 w-8 animate-pulse" />
        </div>
      </div>

      <div v-else-if="error" class="p-8 text-center text-red-500">
        <p>Failed to load sensor measurements.</p>
        <p class="mt-2 text-sm">{{ error }}</p>

        <button type="button" class="primary-button mt-4" @click="fetchMeasurements">
          Try again
        </button>
      </div>

      <div v-else-if="!measurements.length" class="secondary-text p-8 text-center">
        No sensor measurements available for this SmartPack.
      </div>

      <div v-else class="grid w-full gap-6">
        <!-- Summary cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article
            v-for="item in summaryCards"
            :key="item.label"
            class="dashboard-card flex min-w-0 flex-col p-4"
          >
            <h4 class="sub-heading text-sm lg:text-base">
              {{ item.label }}
            </h4>

            <span class="secondary-text mt-4 text-2xl font-bold">
              {{ item.value }}
            </span>

            <span class="secondary-text mt-1 text-xs">
              {{ item.description }}
            </span>
          </article>
        </div>

        <!-- Weight and cumulative steps charts -->
        <div class="grid gap-6 xl:grid-cols-2">
          <section class="dashboard-card min-w-0 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="sub-heading text-lg">Weight Trend</h4>
                <p class="secondary-text mt-1 text-sm">Recorded load over time</p>
              </div>

              <span class="secondary-text text-sm">Grams (g)</span>
            </div>

            <div v-if="weightSeries[0]?.data.length" class="mt-4 h-64 sm:h-72 md:h-80">
              <apexchart
                type="line"
                height="100%"
                :options="weightChartOptions"
                :series="weightSeries"
              />
            </div>

            <div v-else class="card-base secondary-text mt-4 p-6 text-center">
              No weight data available.
            </div>
          </section>

          <section class="dashboard-card min-w-0 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="sub-heading text-lg">Cumulative Steps</h4>
                <p class="secondary-text mt-1 text-sm">Recorded step counter over time</p>
              </div>

              <span class="secondary-text text-sm">Steps</span>
            </div>

            <div v-if="stepsSeries[0]?.data.length" class="mt-4 h-64 sm:h-72 md:h-80">
              <apexchart
                type="line"
                height="100%"
                :options="stepsChartOptions"
                :series="stepsSeries"
              />
            </div>

            <div v-else class="card-base secondary-text mt-4 p-6 text-center">
              No step data available.
            </div>
          </section>
        </div>

        <!-- Recent measurements -->
        <section class="dashboard-card min-w-0 overflow-hidden p-4">
          <div class="mb-4">
            <h4 class="sub-heading text-lg">Recent Measurements</h4>
            <p class="secondary-text mt-1 text-sm">Latest sensor readings for this SmartPack.</p>
          </div>

          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="px-3 py-3 font-semibold">Timestamp</th>
                  <th class="px-3 py-3 text-right font-semibold">Weight (g)</th>
                  <th class="px-3 py-3 text-right font-semibold">Cumulative Steps</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="measurement in recentMeasurements"
                  :key="measurement.id"
                  class="border-b border-gray-100 last:border-0"
                >
                  <td class="px-3 py-3">
                    {{ formatTimestamp(measurement.timestamp) }}
                  </td>

                  <td class="px-3 py-3 text-right">
                    {{ formatNumber(measurement.weight) }}
                  </td>

                  <td class="px-3 py-3 text-right">
                    {{ formatNumber(measurement.steps) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="secondary-text mt-3 text-xs">
            Showing {{ recentMeasurements.length }} of {{ formatNumber(totalCount) }} measurements.
          </p>

          <div v-if="hasMorePages" class="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              class="secondary-button"
              :disabled="currentPage <= 1 || loading"
              @click="changePage(currentPage - 1)"
            >
              Previous
            </button>

            <span class="secondary-text text-sm"> Page {{ currentPage }} of {{ totalPages }} </span>

            <button
              type="button"
              class="secondary-button"
              :disabled="currentPage >= totalPages || loading"
              @click="changePage(currentPage + 1)"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import type { ApexOptions } from 'apexcharts'
import AnalyticsIcon from '@/components/Icons/AnalyticsIcon.vue'
import { listSensorMeasurements } from '@/api/modules/smartpacks'
import type {
  SmartPackSensorMeasurement,
  SmartPackSensorMeasurementListResult,
  SmartPackSensorMeasurementQueryParams,
} from '@/api/modules/smartpacks'

import { useMqttStore } from '@/stores'

defineOptions({
  name: 'SmartPackSensorMeasurements',
})

const props = defineProps<{
  smartpackId: number
  smartpackUid: string
}>()

const PAGE_SIZE = 100

const mqttStore = useMqttStore()

const measurements = ref<SmartPackSensorMeasurement[]>([])
const loading = ref(false)
const error = ref('')
const currentPage = ref(1)
const totalCount = ref(0)
const nextPage = ref<string | null>(null)
const previousPage = ref<string | null>(null)
const mqttConnected = ref(false)

let requestId = 0
let mqttClient: MqttClient | null = null
let connectionAttempt: Promise<void> | null = null
let activeTopic: string | null = null
let isUnmounted = false

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))

const hasMorePages = computed(() => totalPages.value > 1)

/**
 * Fetches a page of historical sensor measurements from the REST API.
 */
async function fetchMeasurements(): Promise<void> {
  const currentRequestId = ++requestId

  loading.value = true
  error.value = ''

  const params: SmartPackSensorMeasurementQueryParams = {
    smartpack: props.smartpackId,
    page: currentPage.value,
    page_size: PAGE_SIZE,
  }

  try {
    const response: SmartPackSensorMeasurementListResult = await listSensorMeasurements(params)

    if (isUnmounted || currentRequestId !== requestId) {
      return
    }

    measurements.value = response.results
    totalCount.value = response.count
    nextPage.value = response.next
    previousPage.value = response.previous
  } catch (err: unknown) {
    if (isUnmounted || currentRequestId !== requestId) {
      return
    }

    measurements.value = []
    totalCount.value = 0
    nextPage.value = null
    previousPage.value = null

    error.value = err instanceof Error ? err.message : 'Unable to load sensor measurements.'
  } finally {
    if (!isUnmounted && currentRequestId === requestId) {
      loading.value = false
    }
  }
}

/**
 * Checks whether a value is a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates the sensor measurement payload received over MQTT.
 */
function isSensorMeasurement(value: unknown): value is SmartPackSensorMeasurement & {
  smartpack_uid: string
} {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.smartpack_uid === 'string' &&
    typeof value.steps === 'number' &&
    Number.isFinite(value.steps) &&
    typeof value.weight === 'number' &&
    Number.isFinite(value.weight) &&
    typeof value.timestamp === 'string' &&
    typeof value.created === 'string' &&
    typeof value.updated === 'string'
  )
}

/**
 * Handles a sensor_measurement event received over MQTT.
 *
 * Expected payload:
 * {
 *   event: 'sensor_measurement',
 *   data: {
 *     id,
 *     smartpack_uid,
 *     steps,
 *     weight,
 *     timestamp,
 *     created,
 *     updated
 *   }
 * }
 */
function handleMqttMessage(payload: Uint8Array): void {
  try {
    const message: unknown = JSON.parse(new TextDecoder().decode(payload))

    if (!isRecord(message) || message.event !== 'sensor_measurement') {
      return
    }

    if (!isSensorMeasurement(message.data)) {
      console.warn('[MQTT] Ignoring invalid sensor measurement payload.')
      return
    }

    const measurement = message.data

    // Ignore events belonging to another SmartPack.
    if (measurement.smartpack_uid !== props.smartpackUid) {
      return
    }

    // Avoid inserting duplicate records.
    if (measurements.value.some((item) => item.id === measurement.id)) {
      return
    }

    // Preserve the current historical page when not viewing page 1.
    if (currentPage.value !== 1) {
      totalCount.value += 1
      return
    }

    // Insert the new reading and keep the newest records first.
    measurements.value = [measurement, ...measurements.value]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, PAGE_SIZE)

    totalCount.value += 1
    error.value = ''

    console.info('[MQTT] Sensor measurement received:', measurement.id)
  } catch (err: unknown) {
    console.error('[MQTT] Failed to process sensor measurement:', err)
  }
}

/**
 * Connects to the MQTT broker and subscribes to the selected SmartPack.
 */
async function connectToSmartPack(): Promise<void> {
  if (isUnmounted || mqttClient || !props.smartpackUid) {
    return
  }

  if (connectionAttempt) {
    return connectionAttempt
  }

  connectionAttempt = (async () => {
    try {
      await mqttStore.fetchConfig()

      if (isUnmounted) return

      const config = mqttStore.config

      if (!config) {
        throw new Error('MQTT configuration is unavailable.')
      }

      // Normalize the broker hostname.
      const hostname = config.host
        .replace(/^wss?:\/\//i, '')
        .replace(/\/mqtt\/?$/i, '')
        .replace(/:\d+$/, '')

      if (!hostname || /[/\s]/.test(hostname)) {
        throw new Error('The configured MQTT hostname is invalid.')
      }

      const brokerUrl = `wss://${hostname}:8884/mqtt`

      const client = mqtt.connect(brokerUrl, {
        username: config.username,
        password: config.password,
        reconnectPeriod: 3000,
        connectTimeout: 15000,
        clean: true,
      })

      mqttClient = client

      client.on('connect', () => {
        if (isUnmounted || mqttClient !== client) {
          return
        }

        mqttConnected.value = false

        // Subscribe to the currently selected SmartPack.
        const currentTopic = `smartpacks/${props.smartpackUid}`

        client.subscribe(currentTopic, { qos: 0 }, (err, granted) => {
          if (isUnmounted || mqttClient !== client) {
            return
          }

          if (err || !granted?.length || granted.some((subscription) => subscription.qos === 128)) {
            mqttConnected.value = false

            console.error('[MQTT] SmartPack subscription failed:', err ?? currentTopic)

            return
          }

          activeTopic = currentTopic
          mqttConnected.value = true

          console.info('[MQTT] Subscribed to:', currentTopic)
        })
      })

      client.on('message', (topic, payload) => {
        if (isUnmounted || topic !== activeTopic) {
          return
        }

        handleMqttMessage(payload)
      })

      client.on('reconnect', () => {
        mqttConnected.value = false

        console.info('[MQTT] Reconnecting...')
      })

      client.on('offline', () => {
        mqttConnected.value = false
      })

      client.on('close', () => {
        mqttConnected.value = false
      })

      client.on('error', (err) => {
        mqttConnected.value = false

        console.error('[MQTT] Connection error:', err.message)
      })
    } catch (err: unknown) {
      if (!isUnmounted) {
        console.error('[MQTT] Setup failed:', err)
      }
    }
  })()

  try {
    await connectionAttempt
  } finally {
    connectionAttempt = null
  }
}

/**
 * Disconnects the MQTT client and clears connection state.
 */
function disconnectFromSmartPack(): void {
  const client = mqttClient

  mqttClient = null
  activeTopic = null
  mqttConnected.value = false

  if (client) {
    client.removeAllListeners()
    client.end(true)
  }
}

/**
 * Changes the historical measurements page.
 */
function changePage(page: number): void {
  if (page < 1 || page > totalPages.value || loading.value) {
    return
  }

  currentPage.value = page
  void fetchMeasurements()
}

const chronologicalMeasurements = computed(() =>
  [...measurements.value].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  ),
)

const latestMeasurement = computed(() => {
  if (!measurements.value.length) {
    return null
  }

  return measurements.value.reduce((latest, current) =>
    new Date(current.timestamp).getTime() > new Date(latest.timestamp).getTime() ? current : latest,
  )
})

const summaryCards = computed(() => {
  const latest = latestMeasurement.value

  return [
    {
      label: 'Latest Weight',
      value: latest ? `${formatNumber(latest.weight)} g` : '—',
      description: 'Most recent recorded load',
    },
    {
      label: 'Cumulative Steps',
      value: latest ? formatNumber(latest.steps) : '—',
      description: 'Latest recorded step counter',
    },
    {
      label: 'Total Measurements',
      value: formatNumber(totalCount.value),
      description: 'Records available for this SmartPack',
    },
  ]
})

type ChartPoint = {
  x: number
  y: number
}

function toChartPoints(
  selectValue: (measurement: SmartPackSensorMeasurement) => number,
): ChartPoint[] {
  return chronologicalMeasurements.value
    .filter((measurement) => Number.isFinite(selectValue(measurement)))
    .map((measurement) => ({
      x: new Date(measurement.timestamp).getTime(),
      y: selectValue(measurement),
    }))
}

const weightSeries = computed(() => [
  {
    name: 'Weight (g)',
    data: toChartPoints((measurement) => measurement.weight),
  },
])

const stepsSeries = computed(() => [
  {
    name: 'Cumulative Steps',
    data: toChartPoints((measurement) => measurement.steps),
  },
])

function buildChartOptions(yAxisTitle: string): ApexOptions {
  return {
    chart: {
      type: 'line',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
      fontFamily: 'inherit',
      animations: {
        enabled: false,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    markers: {
      size: 0,
      hover: {
        size: 5,
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
      },
      title: {
        text: 'Time',
      },
    },
    yaxis: {
      title: {
        text: yAxisTitle,
      },
      labels: {
        formatter: (value: number) => formatNumber(value),
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy, HH:mm:ss',
      },
    },
    legend: {
      position: 'bottom',
    },
    grid: {
      borderColor: '#e5e7eb',
    },
    noData: {
      text: 'No data available',
    },
  }
}

const weightChartOptions = computed<ApexOptions>(() => ({
  ...buildChartOptions('Weight (g)'),
  colors: ['#7c3aed'],
  tooltip: {
    x: {
      format: 'dd MMM yyyy, HH:mm:ss',
    },
    y: {
      formatter: (value: number) => `${formatNumber(value)} g`,
    },
  },
}))

const stepsChartOptions = computed<ApexOptions>(() => ({
  ...buildChartOptions('Cumulative Steps'),
  colors: ['#0f766e'],
  tooltip: {
    x: {
      format: 'dd MMM yyyy, HH:mm:ss',
    },
    y: {
      formatter: (value: number) => `${formatNumber(value)} steps`,
    },
  },
}))

const recentMeasurements = computed(() =>
  [...measurements.value]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10),
)

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date)
}

/**
 * Reloads history and reconnects when the selected SmartPack changes.
 */
watch(
  () => [props.smartpackId, props.smartpackUid] as const,
  async () => {
    requestId += 1

    disconnectFromSmartPack()

    currentPage.value = 1
    measurements.value = []
    totalCount.value = 0
    nextPage.value = null
    previousPage.value = null
    error.value = ''

    await fetchMeasurements()

    if (!isUnmounted) {
      await connectToSmartPack()
    }
  },
  { immediate: true },
)

/**
 * Releases the MQTT connection and invalidates pending REST requests.
 */
onBeforeUnmount(() => {
  isUnmounted = true
  requestId += 1
  disconnectFromSmartPack()
})
</script>
