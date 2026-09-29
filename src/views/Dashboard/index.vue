<template>
  <section class="mb-8 flex min-h-[50vh] flex-col gap-8">
    <!-- User Analysis -->
    <div class="grid gap-6">
      <div class="flex items-center justify-between">
        <h3 class="sub-heading text-base lg:text-lg">User Summary</h3>
      </div>

      <div class="w-[90%] grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in userSummaryCards"
          :key="item.label"
          class="flex flex-col p-4 dashboard-card transform sm:hover:scale-105 justify-between"
        >
          <div class="flex items-center justify-between">
            <h4 class="sub-heading text-sm lg:text-base">
              {{ item.label }}
            </h4>

            <component :is="item.icon" class="dashboard-icon h-8 w-8 flex-shrink-0" />
          </div>

          <span v-if="loading" class="mt-4 h-4 w-1/2 rounded loading-animation"></span>

          <span v-else class="mt-4 text-2xl font-bold secondary-text">
            {{ item.value }}
          </span>
        </div>
      </div>
    </div>

    <!-- SmartPack Analysis -->
    <div class="grid gap-6">
      <div class="flex items-center justify-between">
        <h3 class="sub-heading text-base lg:text-lg">SmartPack Summary</h3>
      </div>

      <div class="w-[90%] grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in smartPackSummaryCards"
          :key="item.label"
          class="flex flex-col p-4 dashboard-card transform sm:hover:scale-105 justify-between"
        >
          <div class="flex items-center justify-between">
            <h4 class="sub-heading text-sm lg:text-base">
              {{ item.label }}
            </h4>

            <component :is="item.icon" class="dashboard-icon h-8 w-8 flex-shrink-0" />
          </div>

          <span v-if="loading" class="mt-4 h-4 w-1/2 rounded loading-animation"></span>

          <span v-else class="mt-4 text-2xl font-bold secondary-text">
            {{ item.value }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Dashboard View
 *
 * Provides an overview of user and SmartPack statistics for administrators.
 * Analysis data is retrieved from the admin general analysis API and displayed
 * through summary cards.
 */

import { computed, onMounted, ref } from 'vue'

import UsersIcon from '@/components/Icons/UsersIcon.vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'

import { getAdminGeneralAnalysis } from '@/api/modules/analysis'
import type { AdminGeneralAnalysis } from '@/api/modules/analysis'
import { useGlobals } from '@/composables/useGlobals'

defineOptions({
  name: 'DashboardView',
})

const { $notifyError } = useGlobals()

/**
 * Indicates whether the dashboard analysis request is in progress.
 */
const loading = ref(false)

/**
 * Stores the general analysis data displayed on the dashboard.
 */
const analysis = ref<AdminGeneralAnalysis>({
  users: {
    total: 0,
    customers: 0,
    internal: 0,
  },
  smartpacks: {
    total: 0,
    assigned: 0,
    unassigned: 0,
  },
})

/**
 * Provides summary cards for user statistics.
 *
 * @returns Array of user summary card configurations.
 */
const userSummaryCards = computed(() => [
  {
    label: 'Total Users',
    value: analysis.value.users.total,
    icon: UsersIcon,
  },
  {
    label: 'Customers',
    value: analysis.value.users.customers,
    icon: UserGroupIcon,
  },
  {
    label: 'Internal Users',
    value: analysis.value.users.internal,
    icon: UserGroupIcon,
  },
])

/**
 * Provides summary cards for SmartPack statistics.
 *
 * @returns Array of SmartPack summary card configurations.
 */
const smartPackSummaryCards = computed(() => [
  {
    label: 'Total SmartPacks',
    value: analysis.value.smartpacks.total,
    icon: BackPackIcon,
  },
  {
    label: 'Assigned',
    value: analysis.value.smartpacks.assigned,
    icon: BackPackIcon,
  },
  {
    label: 'Unassigned',
    value: analysis.value.smartpacks.unassigned,
    icon: BackPackIcon,
  },
])

/**
 * Fetches the general dashboard analysis from the API.
 *
 * Updates the analysis state with the returned data and displays an error
 * notification if the request fails.
 *
 * @returns A promise that resolves when the analysis request completes.
 */
const fetchAnalysis = async () => {
  try {
    loading.value = true
    analysis.value = await getAdminGeneralAnalysis()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard analysis'

    $notifyError(message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchAnalysis)
</script>
