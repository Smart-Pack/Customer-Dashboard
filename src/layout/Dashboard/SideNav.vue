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
  </nav>
</template>

<script setup lang="ts">
import { markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { auth } from '@/api'
import HomeIcon from '@/components/Icons/HomeIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import DarkModeIcon from '@/components/Icons/DarkModeIcon.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import LightModeIcon from '@/components/Icons/LightModeIcon.vue'
import LogOutIcon from '@/components/Icons/LogOutIcon.vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import { useAuthStore, useUiStore } from '@/stores'
import { withCacheBust } from '@/utils/urlSecurity'

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
  try {
    await auth.logout()
  } catch {
    // Continue with local logout if the server logout request fails.
  } finally {
    authStore.clearStore()
    await router.push({ name: 'login' })
  }
}

function splitLabel(label: string): string[] {
  const words = label.split(' ')

  return words.length >= 2 ? words : [label]
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
    name: 'users-parent',
    label: 'User Management',
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
</script>
