<template>
  <nav
    class="flex flex-col gap-2 items-center fixed left-0 h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] lg:flex pt-8 pb-20 card-base !rounded-none lg:static min-w-36 lg:min-w-40 overflow-y-auto border-box z-50"
    :class="{
      hidden: !uiStore.isSideNavOpen,
    }"
  >
    <!-- Mobile User Information -->
    <div class="lg:hidden center-flex-col gap-2">
      <img
        v-if="authStore.loggedInUser?.profile_pic"
        :src="withCacheBust(authStore.loggedInUser.profile_pic)"
        :key="authStore.loggedInUser.profile_pic"
        alt="Profile Picture"
        class="w-20 h-20 object-cover rounded-full"
      />

      <UserIcon v-else class="block w-16 h-16 field-icon primary-text" />

      <h3 class="mb-2 sub-heading font-bold text-sm">
        {{ authStore.loggedInUser?.first_name }}
      </h3>
    </div>

    <!-- Menu -->
    <h2 class="hidden lg:block sub-heading font-bold">Menu</h2>

    <!-- Mobile Theme Toggle -->
    <button
      class="primary-text center-flex-col mb-4 lg:hidden py-2 px-4 text-center"
      type="button"
      :aria-label="uiStore.isLightMode ? 'Switch to dark mode' : 'Switch to light mode'"
      @click="toggleTheme"
    >
      <LightModeIcon v-if="uiStore.isLightMode" class="text-2xl w-12 h-12" />
      <DarkModeIcon v-else class="text-2xl w-12 h-12" />
    </button>

    <!-- Main Menu -->
    <div
      v-for="item in menuItems"
      :key="item.name"
      class="center-flex-col rounded-lg"
      :class="[
        item.extraClass,
        uiStore.hasBreadcrumb(item.name, route.name)
          ? 'bg-primary dark:bg-primary-dark'
          : 'secondary-text',
      ]"
    >
      <button
        type="button"
        class="center-flex-col gap-1 py-2 px-4 rounded-md text-center focus:outline-none transition"
        :class="
          uiStore.hasBreadcrumb(item.name, route.name)
            ? 'form-submit disabled:opacity-100'
            : 'secondary-text hover:primary-text'
        "
        @click="item.onClick ? item.onClick() : navigateTo(item)"
      >
        <component :is="item.icon" class="w-6 h-6" />

        <span
          v-for="(word, index) in splitLabel(item.label)"
          :key="index"
          class="text-xs font-poppins font-semibold"
        >
          {{ word }}
        </span>
      </button>
    </div>

    <!-- Manual Synchronization (Mobile Only) -->
    <div v-if="isMobileDevice" class="center-flex-col gap-2 mb-4">
      <button
        type="button"
        class="primary-text center-flex-col gap-1 py-2 px-4 text-center disabled:opacity-50"
        :disabled="isSyncing"
        :aria-label="isSyncing ? 'Synchronizing data' : 'Synchronize data now'"
        @click="handleManualSync"
      >
        <RefreshIcon class="w-6 h-6" />

        <span class="text-xs font-poppins font-semibold"> Sync Now </span>

        <div v-if="isSyncing" class="submit-spinner"></div>
      </button>

      <!-- Last Synchronization Information -->
      <div v-if="!isManualSyncing" class="center-flex-col gap-1 text-center px-2">
        <span class="text-xs secondary-text">Last synced</span>

        <span class="text-xs font-semibold secondary-text">
          {{ formatLastSynced(lastSyncedAt) }}
        </span>
      </div>

      <span v-else class="text-xs secondary-text"> Synchronizing... </span>
    </div>
  </nav>
</template>

<script setup lang="ts">
/**
 * @module components/Dashboard/SideNav
 * @description
 * Provides the dashboard's responsive side navigation, including navigation
 * links, mobile user information, theme switching, and logout functionality.
 *
 * On mobile devices, it also provides manual cache synchronization and
 * manages automatic synchronization through a 30-minute scheduler.
 * Synchronization is triggered when the application starts and whenever
 * it returns to the foreground.
 *
 * Automatic synchronization failures are logged, while manual synchronization
 * provides success and error notifications to the user.
 */
import { onMounted, onUnmounted, ref, markRaw } from 'vue'
import { App } from '@capacitor/app'
import { useRoute, useRouter } from 'vue-router'

import HomeIcon from '@/components/Icons/HomeIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import DarkModeIcon from '@/components/Icons/DarkModeIcon.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import LightModeIcon from '@/components/Icons/LightModeIcon.vue'
import LogOutIcon from '@/components/Icons/LogOutIcon.vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import RefreshIcon from '@/components/Icons/RefreshIcon.vue'

import { useAuthStore, useUiStore } from '@/stores'
import { useGlobals } from '@/composables/useGlobals'
import { isMobile } from '@/utils/platform'
import { withCacheBust } from '@/utils/urlSecurity'
import {
  startSyncScheduler,
  stopSyncScheduler,
  triggerSync,
  isSyncing,
  lastSyncedAt,
  refreshLastSyncedAt,
} from '@/services/database/sync'

defineOptions({
  name: 'DashboardSideNav',
})

interface MenuItem {
  name: string
  label: string
  icon: ReturnType<typeof markRaw>
  onClick?: () => void
  extraClass?: string
}

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const uiStore = useUiStore()

const { $notifySuccess, $notifyError } = useGlobals()

const isMobileDevice = isMobile()
const isManualSyncing = ref(false)

let appStateListener: Awaited<ReturnType<typeof App.addListener>> | null = null
let isUnmounted = false

function toggleTheme(): void {
  uiStore.updateThemePreference(uiStore.isLightMode ? 2 : 1)
}

function navigateTo(item: MenuItem): void {
  if (route.name === item.name) {
    return
  }

  uiStore.updateIsSideNavOpen(false)

  void router.push({
    name: item.name,
  })
}

/**
 * Logs the user out of the application.
 *
 * The local authentication state is cleared and the user is redirected
 * to the login page even if the server-side logout request fails.
 */
async function logout(): Promise<void> {
  await authStore.logOut()
  await router.push({ name: 'login' })
}

/**
 * Manually synchronizes cached data with the backend.
 *
 * Unlike automatic synchronization, manual synchronization provides
 * feedback to the user through success and error notifications.
 */
async function handleManualSync(): Promise<void> {
  if (isSyncing.value) {
    return
  }

  isManualSyncing.value = true

  try {
    await triggerSync()
    await $notifySuccess('Data synchronized successfully.')
  } catch (error) {
    console.error('Manual synchronization failed:', error)

    const message =
      error instanceof Error ? error.message : 'Unable to synchronize data. Please try again.'

    await $notifyError(message)
  } finally {
    isManualSyncing.value = false
  }
}

/**
 * Starts mobile synchronization services.
 *
 * Synchronization runs immediately, then every 30 minutes.
 * The app-state listener also triggers synchronization whenever
 * the application returns to the foreground.
 */
function startMobileSync(): void {
  startSyncScheduler({
    intervalMs: 30 * 60 * 1000,
    onError: (error) => {
      console.error('Automatic synchronization failed:', error)
    },
  })

  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      return
    }

    void triggerSync().catch((error) => {
      console.error('Foreground synchronization failed:', error)
    })
  })
    .then((listener) => {
      if (isUnmounted) {
        void listener.remove()
        return
      }

      appStateListener = listener
    })
    .catch((error) => {
      console.error('Failed to register app-state listener:', error)
    })
}

function splitLabel(label: string): string[] {
  const words = label.split(' ')

  return words.length >= 2 ? words : [label]
}

/**
 * Formats the last successful synchronization timestamp for display.
 *
 * - Returns the time (e.g. "2:50 PM") if synchronization occurred today.
 * - Returns "Yesterday" if synchronization occurred the previous day.
 * - Returns a formatted date (e.g. "Nov 16, 2026") for older timestamps.
 * - Returns "Never" if no successful synchronization has occurred.
 *
 * Uses the device's local timezone and locale.
 *
 * @param timestamp - ISO timestamp of the last successful synchronization.
 * @returns Human-readable synchronization timestamp.
 */
function formatLastSynced(timestamp: string | null): string {
  if (!timestamp) {
    return 'Never'
  }

  const date = new Date(timestamp)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const menuItems: MenuItem[] = [
  {
    name: 'dashboard',
    label: 'Home',
    icon: markRaw(HomeIcon),
  },
  {
    name: 'smartpacks-parent',
    label: 'SmartPack Management',
    icon: markRaw(BackPackIcon),
  },
  {
    name: 'my-profile',
    label: 'My Profile',
    icon: markRaw(UserIcon),
  },
  {
    name: 'groups-parent',
    label: 'Group Management',
    icon: markRaw(UserGroupIcon),
  },
  {
    name: 'logout',
    label: 'Logout',
    icon: markRaw(LogOutIcon),
    onClick: logout,
    extraClass: 'lg:hidden',
  },
]

onMounted(() => {
  if (isMobileDevice) {
    void refreshLastSyncedAt().catch((error) => {
      console.error('Failed to load last synchronization time:', error)
    })
    startMobileSync()
  }
})

onUnmounted(() => {
  isUnmounted = true

  if (isMobileDevice) {
    stopSyncScheduler()
    void appStateListener?.remove()
    appStateListener = null
  }
})
</script>
