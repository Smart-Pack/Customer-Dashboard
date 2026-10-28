<script setup lang="ts">
defineOptions({
  name: 'HomeView',
})
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import ScaleIcon from '@/components/Icons/ScaleIcon.vue'
import WalkingIcon from '@/components/Icons/WalkingIcon.vue'
import { computed, onMounted, ref, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useAuthStore } from '@/stores/modules/auth'
import api from '@/api/modules'
import { getStepsDelta } from '@/api/modules/smartpacks'
import type { UserGroup } from '@/api/modules/users'
import type { SmartPack, SmartPackSensorMeasurement } from '@/api/modules/smartpacks'
import type { ApexOptions } from 'apexcharts'

type DateRange = 7 | 30
type SmartPackFilter = 'all' | number

/**
 * The API does not return the SmartPack ID on each measurement, so we tag
 * measurements with the SmartPack they were fetched for.
 */
type TaggedMeasurement = SmartPackSensorMeasurement & { smartpackId: number }

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface DailyWeightAverage {
  date: string
  label: string
  average: number
}

interface DailyStepTotal {
  date: string
  label: string
  steps: number
}

const authStore = useAuthStore()

const selectedDateRange = ref<DateRange>(7)
const selectedSmartPack = ref<SmartPackFilter>('all')

const smartpacks = ref<SmartPack[]>([])
const measurements = ref<TaggedMeasurement[]>([])

const isLoadingSmartPacks = ref(false)
const isLoadingMeasurements = ref(false)

const smartPackError = ref<string | null>(null)
const measurementError = ref<string | null>(null)

/**
 * Group memberships are read directly from the authenticated user's profile.
 *
 * This avoids assuming that the groups-list endpoint includes a membership
 * role for the current user.
 */
const groupMemberships = computed<UserGroup[]>(() => {
  const groups = authStore.loggedInUser?.groups

  return Array.isArray(groups) ? groups : []
})

/**
 * Owner and admin memberships are grouped under Admin.
 */
const adminGroupCount = computed(
  () =>
    groupMemberships.value.filter((group) => group.role === 'owner' || group.role === 'admin')
      .length,
)

/**
 * Ordinary memberships are grouped under Regular member.
 */
const regularMemberCount = computed(
  () => groupMemberships.value.filter((group) => group.role === 'member').length,
)

const totalGroupMemberships = computed(() => groupMemberships.value.length)

const groupMembershipChartSeries = computed(() => [adminGroupCount.value, regularMemberCount.value])

const groupMembershipChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'donut',
    toolbar: {
      show: false,
    },
  },
  labels: ['Admin', 'Regular member'],
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
  },
  noData: {
    text: 'No group memberships available',
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Groups',
            formatter: () => String(totalGroupMemberships.value),
          },
        },
      },
    },
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          height: 260,
        },
        legend: {
          position: 'bottom',
        },
      },
    },
  ],
}))

/**
 * SmartPacks with a non-empty child_name are assigned to a child.
 */
const assignedSmartPacks = computed(() =>
  smartpacks.value.filter((smartpack) => smartpack.child_name?.trim().length > 0),
)

const unassignedSmartPacks = computed(() =>
  smartpacks.value.filter((smartpack) => !smartpack.child_name?.trim()),
)

const totalSmartPacks = computed(() => smartpacks.value.length)

const assignedSmartPackCount = computed(() => assignedSmartPacks.value.length)

const unassignedSmartPackCount = computed(() => unassignedSmartPacks.value.length)

const smartPackAssignmentChartSeries = computed(() => [
  assignedSmartPackCount.value,
  unassignedSmartPackCount.value,
])

const smartPackAssignmentChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'donut',
    toolbar: {
      show: false,
    },
  },
  labels: ['Assigned to a child', 'No child assigned'],
  legend: {
    position: 'bottom',
  },
  dataLabels: {
    enabled: true,
  },
  noData: {
    text: 'No SmartPacks available',
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'SmartPacks',
            formatter: () => String(totalSmartPacks.value),
          },
        },
      },
    },
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          height: 260,
        },
        legend: {
          position: 'bottom',
        },
      },
    },
  ],
}))

/**
 * Fetch all pages from a paginated API endpoint.
 *
 * This implementation uses the `next` URL returned by the backend.
 */
async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const results: T[] = []
  let page = 1

  while (true) {
    const response = await fetchPage(page)

    results.push(...response.results)

    if (!response.next) {
      break
    }

    page += 1
  }

  return results
}

/**
 * Label shown in the SmartPack selector.
 */
function getSmartPackLabel(smartpack: SmartPack): string {
  return smartpack.child_name?.trim() || smartpack.imei
}

/**
 * Fetch the SmartPacks available to the authenticated user.
 */
async function loadSmartPacks(): Promise<void> {
  isLoadingSmartPacks.value = true
  smartPackError.value = null

  try {
    smartpacks.value = await fetchAllPages(async (page) => {
      const response = await api.smartpacks.list({
        page,
      })

      return response as PaginatedResponse<SmartPack>
    })
  } catch (error) {
    console.error('Failed to load SmartPacks:', error)
    smartPackError.value = 'Unable to load SmartPacks. Please try again.'
  } finally {
    isLoadingSmartPacks.value = false
  }
}

/**
 * Calculate the ISO date boundaries for the selected date range.
 */
function getDateRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now)

  start.setDate(start.getDate() - (selectedDateRange.value - 1))
  start.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Fetch all measurements for one SmartPack and tag them with its ID.
 */
async function fetchMeasurementsForPack(
  smartpackId: number,
  start: string,
  end: string,
): Promise<TaggedMeasurement[]> {
  const items = await fetchAllPages(async (page) => {
    const response = await api.smartpacks.listSensorMeasurements({
      page,
      smartpack: smartpackId,
      timestamp_gte: start,
      timestamp_lte: end,
    })

    return response as PaginatedResponse<SmartPackSensorMeasurement>
  })

  return items.map((item) => ({ ...item, smartpackId }))
}

/**
 * Fetch measurements for the selected SmartPack, or for every SmartPack
 * when "All" is selected.
 */
async function loadMeasurements(): Promise<void> {
  isLoadingMeasurements.value = true
  measurementError.value = null

  try {
    const { start, end } = getDateRange()

    const packIds =
      selectedSmartPack.value === 'all'
        ? smartpacks.value.map((smartpack) => smartpack.id)
        : [selectedSmartPack.value]

    const results = await Promise.all(packIds.map((id) => fetchMeasurementsForPack(id, start, end)))

    measurements.value = results.flat()
  } catch (error) {
    console.error('Failed to load sensor measurements:', error)
    measurementError.value = 'Unable to load sensor measurements. Please try again.'
  } finally {
    isLoadingMeasurements.value = false
  }
}

/**
 * Format dates consistently for chart labels.
 */
function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Local-time YYYY-MM-DD key used to bucket measurements by day.
 */
function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Build a daily average weight series.
 *
 * Sensor measurements store weight in grams, so values are converted
 * to kilograms for display.
 */
const dailyWeightAverages = computed<DailyWeightAverage[]>(() => {
  const dailyTotals = new Map<string, { total: number; count: number }>()

  for (const measurement of measurements.value) {
    const timestamp = new Date(measurement.timestamp)

    if (Number.isNaN(timestamp.getTime())) {
      continue
    }

    const weightKg = Number(measurement.weight) / 1000

    if (!Number.isFinite(weightKg) || weightKg < 0) {
      continue
    }

    const dateKey = toDateKey(timestamp)

    const existing = dailyTotals.get(dateKey) ?? {
      total: 0,
      count: 0,
    }

    existing.total += weightKg
    existing.count += 1

    dailyTotals.set(dateKey, existing)
  }

  const { start } = getDateRange()
  const firstDate = new Date(start)

  const averages: DailyWeightAverage[] = []

  for (let index = 0; index < selectedDateRange.value; index += 1) {
    const date = new Date(firstDate)
    date.setDate(firstDate.getDate() + index)

    const dateKey = toDateKey(date)
    const daily = dailyTotals.get(dateKey)

    averages.push({
      date: dateKey,
      label: formatDateLabel(date),
      average: daily && daily.count > 0 ? Number((daily.total / daily.count).toFixed(2)) : 0,
    })
  }

  return averages
})

const weightChartSeries = computed(() => [
  {
    name: 'Average load',
    data: dailyWeightAverages.value.map((item) => item.average),
  },
])

const weightChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'line',
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {
    size: 4,
  },
  xaxis: {
    categories: dailyWeightAverages.value.map((item) => item.label),
    title: {
      text: 'Date',
    },
  },
  yaxis: {
    min: 0,
    title: {
      text: 'Average load (kg)',
    },
    labels: {
      formatter: (value: number) => `${value.toFixed(1)} kg`,
    },
  },
  tooltip: {
    y: {
      formatter: (value: number) => `${value.toFixed(2)} kg`,
    },
  },
  noData: {
    text: 'No measurements available for this period',
  },
}))

const averageWeightAcrossDays = computed(() => {
  const daysWithMeasurements = dailyWeightAverages.value.filter((item) => item.average > 0)

  if (daysWithMeasurements.length === 0) {
    return 0
  }

  const total = daysWithMeasurements.reduce((sum, item) => sum + item.average, 0)

  return Number((total / daysWithMeasurements.length).toFixed(2))
})

/**
 * Build a daily steps series from cumulative step counters.
 *
 * Steps are a running total that can fluctuate, so each SmartPack's readings
 * are sorted by time and the difference between consecutive readings is
 * attributed to the day of the later reading. Negative differences are
 * clamped to 0 by `getStepsDelta`.
 */
const dailyStepTotals = computed<DailyStepTotal[]>(() => {
  const byPack = new Map<number, TaggedMeasurement[]>()

  for (const measurement of measurements.value) {
    const time = new Date(measurement.timestamp).getTime()
    const steps = Number(measurement.steps)

    if (Number.isNaN(time) || !Number.isFinite(steps) || steps < 0) {
      continue
    }

    const list = byPack.get(measurement.smartpackId) ?? []
    list.push(measurement)
    byPack.set(measurement.smartpackId, list)
  }

  const totals = new Map<string, number>()

  for (const list of byPack.values()) {
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    let previous: TaggedMeasurement | undefined

    for (const current of list) {
      if (previous) {
        const delta = getStepsDelta(current, previous)

        if (delta > 0) {
          const key = toDateKey(new Date(current.timestamp))
          totals.set(key, (totals.get(key) ?? 0) + delta)
        }
      }

      previous = current
    }
  }

  const { start } = getDateRange()
  const firstDate = new Date(start)
  const result: DailyStepTotal[] = []

  for (let index = 0; index < selectedDateRange.value; index += 1) {
    const date = new Date(firstDate)
    date.setDate(firstDate.getDate() + index)
    const key = toDateKey(date)

    result.push({
      date: key,
      label: formatDateLabel(date),
      steps: totals.get(key) ?? 0,
    })
  }

  return result
})

const totalSteps = computed(() => dailyStepTotals.value.reduce((sum, item) => sum + item.steps, 0))

const averageDailySteps = computed(() => {
  const activeDays = dailyStepTotals.value.filter((item) => item.steps > 0)

  return activeDays.length === 0 ? 0 : Math.round(totalSteps.value / activeDays.length)
})

const stepsChartSeries = computed(() => [
  {
    name: 'Steps',
    data: dailyStepTotals.value.map((item) => item.steps),
  },
])

const stepsChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  plotOptions: {
    bar: { borderRadius: 4, columnWidth: '60%' },
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: dailyStepTotals.value.map((item) => item.label),
    title: { text: 'Date' },
  },
  yaxis: {
    min: 0,
    title: { text: 'Steps' },
    labels: {
      formatter: (value: number) => Math.round(value).toLocaleString(),
    },
  },
  tooltip: {
    y: {
      formatter: (value: number) => `${Math.round(value).toLocaleString()} steps`,
    },
  },
  noData: { text: 'No measurements available for this period' },
}))

/**
 * Refresh measurements whenever the date range or SmartPack changes.
 */
watch([selectedDateRange, selectedSmartPack], () => {
  void loadMeasurements()
})

/**
 * SmartPacks must load first, since "All" depends on that list.
 */
onMounted(async () => {
  await loadSmartPacks()
  await loadMeasurements()
})
</script>

<template>
  <main class="space-y-6">
    <header>
      <h1 class="sub-heading text-xl lg:text-2xl">Dashboard</h1>

      <p class="mt-1 text-sm secondary-text">
        An overview of your groups, SmartPacks, backpack load, and steps.
      </p>
    </header>

    <!-- Summary cards -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        class="flex flex-col justify-between p-4 dashboard-card transform sm:hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <h3 class="sub-heading text-sm lg:text-base">Group memberships</h3>
          <UserGroupIcon class="dashboard-icon h-10 w-10 p-1 lg:h-12 lg:w-12" />
        </div>

        <span class="mt-4 text-2xl font-bold secondary-text">
          {{ totalGroupMemberships }}
        </span>
      </article>

      <article
        class="flex flex-col justify-between p-4 dashboard-card transform sm:hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <h3 class="sub-heading text-sm lg:text-base">Admin memberships</h3>
          <UserIcon class="dashboard-icon h-10 w-10 p-1 lg:h-12 lg:w-12" />
        </div>

        <span class="mt-4 text-2xl font-bold secondary-text">
          {{ adminGroupCount }}
        </span>
      </article>

      <article
        class="flex flex-col justify-between p-4 dashboard-card transform sm:hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <h3 class="sub-heading text-sm lg:text-base">Total SmartPacks</h3>
          <BackPackIcon class="dashboard-icon h-10 w-10 p-1 lg:h-12 lg:w-12" />
        </div>

        <span v-if="isLoadingSmartPacks" class="mt-4 h-4 w-1/2 rounded loading-animation"></span>
        <span v-else class="mt-4 text-2xl font-bold secondary-text">
          {{ totalSmartPacks }}
        </span>
      </article>

      <article
        class="flex flex-col justify-between p-4 dashboard-card transform sm:hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <h3 class="sub-heading text-sm lg:text-base">Assigned to children</h3>
          <BackPackIcon class="dashboard-icon h-10 w-10 p-1 lg:h-12 lg:w-12" />
        </div>

        <span v-if="isLoadingSmartPacks" class="mt-4 h-4 w-1/2 rounded loading-animation"></span>
        <span v-else class="mt-4 text-2xl font-bold secondary-text">
          {{ assignedSmartPackCount }}
        </span>
      </article>
    </section>

    <!-- Group memberships and SmartPack assignments -->
    <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <article class="p-6 dashboard-card">
        <h2 class="sub-heading text-base lg:text-lg">Group Memberships</h2>

        <p class="mt-1 text-sm secondary-text">Your roles across your groups.</p>

        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="flex flex-col justify-between p-4 dashboard-card">
            <h4 class="sub-heading text-sm lg:text-base">Admin</h4>

            <span class="mt-4 text-2xl font-bold secondary-text">
              {{ adminGroupCount }}
            </span>
          </div>

          <div class="flex flex-col justify-between p-4 dashboard-card">
            <h4 class="sub-heading text-sm lg:text-base">Regular member</h4>

            <span class="mt-4 text-2xl font-bold secondary-text">
              {{ regularMemberCount }}
            </span>
          </div>
        </div>

        <VueApexCharts
          v-if="totalGroupMemberships > 0"
          class="mt-4"
          type="donut"
          height="280"
          :options="groupMembershipChartOptions"
          :series="groupMembershipChartSeries"
        />

        <p
          v-else
          class="flex min-h-48 items-center justify-center text-center text-sm secondary-text"
        >
          No group memberships available
        </p>
      </article>

      <article class="p-6 dashboard-card">
        <h2 class="sub-heading text-base lg:text-lg">SmartPack Assignments</h2>

        <p class="mt-1 text-sm secondary-text">SmartPacks with and without an assigned child.</p>

        <p v-if="smartPackError" class="mt-4 text-sm text-red-600">
          {{ smartPackError }}
        </p>

        <div v-else-if="isLoadingSmartPacks" class="mt-4 grid gap-4">
          <span class="h-64 w-full rounded loading-animation"></span>

          <div class="grid grid-cols-2 gap-4">
            <span class="h-20 w-full rounded loading-animation"></span>
            <span class="h-20 w-full rounded loading-animation"></span>
          </div>
        </div>

        <template v-else>
          <VueApexCharts
            v-if="totalSmartPacks > 0"
            class="mt-4"
            type="donut"
            height="280"
            :options="smartPackAssignmentChartOptions"
            :series="smartPackAssignmentChartSeries"
          />

          <p
            v-else
            class="flex min-h-48 items-center justify-center text-center text-sm secondary-text"
          >
            No SmartPacks available
          </p>

          <div class="mt-4 grid grid-cols-2 gap-4">
            <div class="flex flex-col justify-between p-4 dashboard-card">
              <h4 class="sub-heading text-sm lg:text-base">Assigned</h4>

              <span class="mt-4 text-2xl font-bold secondary-text">
                {{ assignedSmartPackCount }}
              </span>
            </div>

            <div class="flex flex-col justify-between p-4 dashboard-card">
              <h4 class="sub-heading text-sm lg:text-base">Unassigned</h4>

              <span class="mt-4 text-2xl font-bold secondary-text">
                {{ unassignedSmartPackCount }}
              </span>
            </div>
          </div>
        </template>
      </article>
    </section>

    <!-- Shared filters for the weight and steps charts -->
    <section
      class="flex flex-col justify-between gap-4 p-4 dashboard-card sm:flex-row sm:items-center"
    >
      <div>
        <h2 class="sub-heading text-base lg:text-lg">Activity Analytics</h2>

        <p class="mt-1 text-sm secondary-text">Filters apply to both the load and steps charts.</p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="flex items-center gap-2 text-sm secondary-text">
          <span>SmartPack</span>

          <select
            v-model="selectedSmartPack"
            :disabled="isLoadingSmartPacks"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="all">All SmartPacks</option>

            <option v-for="smartpack in smartpacks" :key="smartpack.id" :value="smartpack.id">
              {{ getSmartPackLabel(smartpack) }}
            </option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm secondary-text">
          <span>Date range</span>

          <select
            v-model.number="selectedDateRange"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option :value="7">Last 7 days</option>

            <option :value="30">Last 30 days</option>
          </select>
        </label>
      </div>
    </section>

    <!-- Weight analytics -->
    <section class="p-6 dashboard-card">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="sub-heading text-base lg:text-lg">Backpack Load Analysis</h2>

          <p class="mt-1 text-sm secondary-text">
            Daily average recorded load for the selected SmartPack(s).
          </p>
        </div>

        <ScaleIcon class="dashboard-icon h-10 w-10 flex-shrink-0 p-1 lg:h-12 lg:w-12" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col justify-between p-4 dashboard-card">
          <div class="flex items-center justify-between">
            <h4 class="sub-heading text-sm lg:text-base">Average daily load</h4>
            <ScaleIcon class="dashboard-icon h-8 w-8 flex-shrink-0" />
          </div>

          <span
            v-if="isLoadingMeasurements"
            class="mt-4 h-4 w-1/2 rounded loading-animation"
          ></span>
          <span v-else class="mt-4 text-2xl font-bold secondary-text">
            {{ averageWeightAcrossDays.toFixed(2) }} kg
          </span>
        </div>

        <div class="flex flex-col justify-between p-4 dashboard-card">
          <div class="flex items-center justify-between">
            <h4 class="sub-heading text-sm lg:text-base">Measurements recorded</h4>
            <BackPackIcon class="dashboard-icon h-8 w-8 flex-shrink-0" />
          </div>

          <span
            v-if="isLoadingMeasurements"
            class="mt-4 h-4 w-1/2 rounded loading-animation"
          ></span>
          <span v-else class="mt-4 text-2xl font-bold secondary-text">
            {{ measurements.length }}
          </span>
        </div>
      </div>

      <p v-if="measurementError" class="mt-4 text-sm text-red-600">
        {{ measurementError }}
      </p>

      <span
        v-else-if="isLoadingMeasurements"
        class="mt-6 block h-64 w-full rounded loading-animation"
      ></span>

      <VueApexCharts
        v-else
        class="mt-6"
        type="line"
        height="350"
        :options="weightChartOptions"
        :series="weightChartSeries"
      />

      <p class="mt-3 text-xs secondary-text">
        Weight values are converted from grams to kilograms. Days without measurements are displayed
        as zero on the chart.
      </p>
    </section>

    <!-- Steps analytics -->
    <section class="p-6 dashboard-card">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="sub-heading text-base lg:text-lg">Daily Steps</h2>

          <p class="mt-1 text-sm secondary-text">
            Steps taken per day for the selected SmartPack(s).
          </p>
        </div>

        <WalkingIcon class="dashboard-icon h-10 w-10 flex-shrink-0 p-1 lg:h-12 lg:w-12" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col justify-between p-4 dashboard-card">
          <div class="flex items-center justify-between">
            <h4 class="sub-heading text-sm lg:text-base">Total steps</h4>
            <WalkingIcon class="dashboard-icon h-8 w-8 flex-shrink-0" />
          </div>

          <span
            v-if="isLoadingMeasurements"
            class="mt-4 h-4 w-1/2 rounded loading-animation"
          ></span>
          <span v-else class="mt-4 text-2xl font-bold secondary-text">
            {{ totalSteps.toLocaleString() }}
          </span>
        </div>

        <div class="flex flex-col justify-between p-4 dashboard-card">
          <div class="flex items-center justify-between">
            <h4 class="sub-heading text-sm lg:text-base">Average steps per active day</h4>
            <WalkingIcon class="dashboard-icon h-8 w-8 flex-shrink-0" />
          </div>

          <span
            v-if="isLoadingMeasurements"
            class="mt-4 h-4 w-1/2 rounded loading-animation"
          ></span>
          <span v-else class="mt-4 text-2xl font-bold secondary-text">
            {{ averageDailySteps.toLocaleString() }}
          </span>
        </div>
      </div>

      <p v-if="measurementError" class="mt-4 text-sm text-red-600">
        {{ measurementError }}
      </p>

      <span
        v-else-if="isLoadingMeasurements"
        class="mt-6 block h-64 w-full rounded loading-animation"
      ></span>

      <VueApexCharts
        v-else
        class="mt-6"
        type="bar"
        height="350"
        :options="stepsChartOptions"
        :series="stepsChartSeries"
      />

      <p class="mt-3 text-xs secondary-text">
        Steps are calculated from the difference between consecutive cumulative readings. Decreases
        in the counter are ignored.
      </p>
    </section>
  </main>
</template>
