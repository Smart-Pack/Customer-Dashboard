<template>
  <header class="w-full flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
    <nav aria-label="breadcrumb" class="flex-1">
      <ol class="flex flex-wrap items-center gap-2">
        <li
          v-for="(breadcrumb, index) in breadcrumbTrail"
          :key="breadcrumb.name || index"
          class="flex items-center gap-2"
        >
          <router-link
            v-if="index < breadcrumbTrail.length - 1"
            :to="{ name: breadcrumb.name }"
            class="primary-text hover:text-primary-hover dark:hover:text-primary-darkHover font-bold transition"
          >
            {{ breadcrumb.breadcrumb }}
          </router-link>

          <span v-else class="font-semibold secondary-text">
            {{ breadcrumb.breadcrumb }}
          </span>

          <span v-if="index < breadcrumbTrail.length - 1" class="secondary-text"> / </span>
        </li>
      </ol>
    </nav>

    <div
      class="flex items-center inline-flex w-fit ml-auto justify-end gap-2 px-3 py-1 text-sm font-semibold secondary-text card-base"
    >
      <span>
        Today:
        <span class="primary-text font-bold">{{ formattedDate }}</span>
      </span>

      <CalendarIcon class="w-5 h-5 primary-text" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import { useUiStore } from '@/stores'

/**
 * @module layout/ContentHeader
 * @description
 * Displays the page header, including dashboard breadcrumbs and the
 * current date.
 */

const uiStore = useUiStore()

/**
 * The current date displayed in the header.
 */
const currentDate = ref(new Date())

/**
 * The ID of the timeout that refreshes the date at midnight.
 */
let timerId: ReturnType<typeof setTimeout> | null = null

/**
 * Retrieves the breadcrumb entries from the UI store.
 */
const breadcrumbTrail = computed(() => uiStore.breadcrumbs)

/**
 * Formats the current date into a human-readable string.
 *
 * @returns The formatted date, for example, "February 20th".
 */
const formattedDate = computed(() => {
  const date = currentDate.value
  const day = date.getDate()
  const month = date.toLocaleString('default', {
    month: 'long',
  })

  return `${month} ${day}${getDaySuffix(day)}`
})

/**
 * Returns the appropriate suffix for a given day of the month.
 *
 * @param day - The day of the month.
 * @returns The day suffix.
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th'
  }

  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/**
 * Refreshes the current date and schedules the next update for midnight.
 */
function scheduleMidnightRefresh(): void {
  const now = new Date()

  currentDate.value = now

  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const msUntilMidnight = midnight.getTime() - now.getTime()

  if (timerId) {
    clearTimeout(timerId)
  }

  timerId = setTimeout(
    () => {
      scheduleMidnightRefresh()
    },
    Math.max(msUntilMidnight, 0),
  )
}

onMounted(() => {
  scheduleMidnightRefresh()
})

onBeforeUnmount(() => {
  if (timerId) {
    clearTimeout(timerId)
  }
})
</script>
