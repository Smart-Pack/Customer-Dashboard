<template>
  <div ref="containerRef" class="relative">
    <!-- Notification toggle -->
    <button
      data-testid="notification-toggle"
      type="button"
      class="secondary-text flex flex-col items-center justify-center"
      aria-haspopup="true"
      :aria-expanded="isDropdownOpen"
      aria-controls="notification-dropdown"
      :aria-label="
        isSubscribed
          ? 'Notifications enabled. Manage notification settings'
          : 'Notifications disabled. Manage notification settings'
      "
      @click="toggleDropdown"
    >
      <BellIcon v-if="isSubscribed" class="w-6 h-6 lg:w-8 lg:h-8 field-icon cursor-pointer" />
      <BellSlashIcon v-else class="w-6 h-6 lg:w-8 lg:h-8 field-icon cursor-pointer" />
    </button>

    <!-- Notification dropdown -->
    <div
      v-if="isDropdownOpen"
      id="notification-dropdown"
      class="absolute top-[calc(100%+0.75rem)] right-0 z-50 w-72 card-base p-4 shadow-lg"
      role="region"
      aria-label="Notification settings"
    >
      <div class="flex justify-between items-center mb-2">
        <h2 class="primary-text text-sm font-semibold">Notifications</h2>
        <RouterLink
          :to="{
            name: 'my-profile',
            query: { tabs: 'notifications' },
          }"
        >
          <CogIcon class="primary-text w-5 h-5 cursor-pointer" />
        </RouterLink>
      </div>

      <p class="secondary-text text-sm mb-4">
        {{
          isSubscribed
            ? 'Browser notifications are enabled on this device.'
            : 'Receive important SmartPack alerts directly in your browser.'
        }}
      </p>

      <button
        data-testid="notification-action"
        type="button"
        class="form-submit w-full text-sm py-2 px-3"
        :disabled="isLoading || !isPushNotificationSupported()"
        :aria-busy="isLoading"
        @click="toggleNotifications"
      >
        <div v-if="isLoading" class="flex justify-center items-center">
          <span>Please wait...</span>
          <span class="ml-4 submit-spinner" aria-hidden="true"></span>
        </div>

        <span v-else-if="isSubscribed">Turn off notifications</span>
        <span v-else>Turn on notifications</span>
      </button>

      <p v-if="!isPushNotificationSupported()" class="secondary-text text-xs mt-3">
        Browser notifications are not supported by this browser.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import BellIcon from '@/components/Icons/BellIcon.vue'
import CogIcon from '@/components/Icons/CogIcon.vue'
import BellSlashIcon from '@/components/Icons/BellSlashIcon.vue'
import { useGlobals } from '@/composables/useGlobals'
import {
  syncPushSubscription,
  isPushNotificationSupported,
  isSubscribedToPushNotifications,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/services/pushNotifications'
defineOptions({
  name: 'NotificationBell',
})

/**
 * Tracks whether the notification dropdown is visible.
 */
const isDropdownOpen = ref(false)

/**
 * Tracks whether this browser currently has a push subscription.
 */
const isSubscribed = ref(false)

/**
 * Tracks whether a subscription operation is in progress.
 */
const isLoading = ref(false)

/**
 * Root element used to detect clicks outside the dropdown.
 */
const containerRef = ref<HTMLElement | null>(null)

/**
 * Opens or closes the notification dropdown.
 */
function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value
}
const { $notifySuccess, $notifyError } = useGlobals()

/**
 * Refreshes the browser's push subscription status and synchronizes
 * an existing subscription with the SmartPack backend.
 */
async function refreshSubscriptionStatus(): Promise<void> {
  try {
    isSubscribed.value = await isSubscribedToPushNotifications()

    if (isSubscribed.value) {
      await syncPushSubscription()
    }
  } catch (error: unknown) {
    $notifyError(
      error instanceof DOMException
        ? `${error.name}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unable to update notification settings.',
    )
  }
}

/**
 * Enables or disables browser push notifications and updates the UI
 * to reflect the browser's actual subscription state.
 */
async function toggleNotifications(): Promise<void> {
  if (isLoading.value) {
    return
  }

  isLoading.value = true

  try {
    const shouldSubscribe = !isSubscribed.value

    if (shouldSubscribe) {
      await subscribeToPushNotifications()
    } else {
      await unsubscribeFromPushNotifications()
    }

    isSubscribed.value = await isSubscribedToPushNotifications()

    if (isSubscribed.value !== shouldSubscribe) {
      throw new Error('Unable to update browser notification settings.')
    }

    $notifySuccess(
      shouldSubscribe
        ? 'Browser notifications have been enabled.'
        : 'Browser notifications have been disabled.',
    )
    isDropdownOpen.value = false
  } catch (error: unknown) {
    $notifyError(error instanceof Error ? error.message : 'Unable to update notification settings.')

    // Recheck the actual browser state after a failed operation.
    try {
      isSubscribed.value = await isSubscribedToPushNotifications()
    } catch (statusError: unknown) {
      $notifyError(
        statusError instanceof Error
          ? statusError.message
          : 'Unable to refresh notification subscription status.',
      )
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * Closes the dropdown when the user clicks outside it.
 */
function handleOutsideClick(event: MouseEvent): void {
  if (
    containerRef.value &&
    event.target instanceof Node &&
    !containerRef.value.contains(event.target)
  ) {
    isDropdownOpen.value = false
  }
}

/**
 * Closes the dropdown when the user presses Escape.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  void refreshSubscriptionStatus()

  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
