<template>
  <header
    class="flex items-center justify-between w-full h-12 lg:h-16 fixed top-0 z-50 !rounded-none px-3 lg:!px-12 card-base box-border"
  >
    <router-link :to="{ name: 'dashboard' }">
      <SmartPackLogo class="w-8 h-18 lg:w-12 lg:h-12" />
    </router-link>

    <h1>
      <router-link
        :to="{ name: 'dashboard' }"
        class="form-submit text-sm lg:text-lg !rounded-lg py-1 px-2 lg:!px-8 hover:text-white"
      >
        SMARTPACK ADMIN DASHBOARD
      </router-link>
    </h1>

    <button
      data-testid="side-nav-toggle"
      class="primary-text lg:hidden"
      type="button"
      :aria-expanded="uiStore.isSideNavOpen"
      :aria-label="uiStore.isSideNavOpen ? 'Close navigation menu' : 'Open navigation menu'"
      @click="toggleSideNav"
    >
      <HamburgerIcon v-if="!uiStore.isSideNavOpen" class="w-6 h-6 field-icon" />
      <CloseIcon v-else class="w-6 h-6 field-icon" />
    </button>

    <div class="relative hidden lg:flex items-center">
      <button
        data-testid="theme-toggle"
        class="primary-text flex flex-col items-center justify-center mr-12"
        type="button"
        @click="toggleTheme"
      >
        <LightModeIcon v-if="uiStore.isLightMode" class="lg:w-10 lg:h-10" />
        <DarkModeIcon v-else class="lg:w-10 lg:h-10" />
      </button>

      <button
        data-testid="account-toggle"
        class="secondary-text flex flex-col items-center justify-center text-center gap-1"
        type="button"
        aria-haspopup="true"
        :aria-expanded="isDropdownOpen"
        aria-controls="account-dropdown"
        @click="toggleDropdown"
      >
        <img
          v-if="authStore.loggedInUser?.profile_pic"
          :src="withCacheBust(authStore.loggedInUser.profile_pic)"
          :key="authStore.loggedInUser.profile_pic"
          alt="Profile Picture"
          class="w-12 h-12 object-cover inline rounded-full"
        />
        <UserIcon v-else class="lg:w-10 lg:h-10 field-icon" />
      </button>

      <span class="secondary-text text-sm ml-4">
        Welcome
        <span class="block primary-text font-semibold">
          {{ authStore.loggedInUser?.first_name }}
        </span>
      </span>

      <div
        id="account-dropdown"
        role="menu"
        class="hidden lg:absolute lg:block top-[105%] right-0 card-base !rounded-none min-w-36 secondary-text text-sm"
        :class="isDropdownOpen ? 'lg:block' : 'lg:hidden'"
      >
        <button
          data-testid="profile-button"
          type="button"
          class="px-4 py-2 hover:text-primary dark:hover:text-primary-dark w-full"
          role="menuitem"
          @click="goToProfile"
        >
          My Profile
        </button>

        <button
          data-testid="logout-button"
          type="button"
          class="px-4 py-2 hover:text-primary dark:hover:text-primary-dark w-full"
          role="menuitem"
          @click.stop="logout"
        >
          Sign Out
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CloseIcon from '@/components/Icons/CloseIcon.vue'
import DarkModeIcon from '@/components/Icons/DarkModeIcon.vue'
import HamburgerIcon from '@/components/Icons/HamburgerIcon.vue'
import LightModeIcon from '@/components/Icons/LightModeIcon.vue'
import SmartPackLogo from '@/components/Icons/SmartPackLogo.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import { auth } from '@/api'
import { useAuthStore, useUiStore } from '@/stores'
import { withCacheBust } from '@/utils/urlSecurity'

/**
 * Dashboard navigation bar.
 *
 * Provides the primary dashboard navigation controls, including:
 * - Navigation to the dashboard.
 * - Mobile side navigation toggle.
 * - Light/dark theme toggle.
 * - Authenticated user information.
 * - Account dropdown actions.
 */
defineOptions({
  name: 'DashboardNavbar',
})

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const uiStore = useUiStore()

/**
 * Controls the visibility of the authenticated user's account dropdown.
 */
const isDropdownOpen = ref(false)

/**
 * Toggles the mobile dashboard side navigation.
 */
function toggleSideNav(): void {
  uiStore.updateIsSideNavOpen(!uiStore.isSideNavOpen)
}

/**
 * Toggles between light and dark theme preferences.
 *
 * When light mode is active, the theme preference is changed to dark.
 * Otherwise, it is changed to light.
 */
function toggleTheme(): void {
  uiStore.updateThemePreference(uiStore.isLightMode ? 2 : 1)
}

/**
 * Toggles the authenticated user's account dropdown.
 */
function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value
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

/**
 * Navigates to the authenticated user's profile page.
 *
 * The account dropdown is closed before navigation. Navigation is skipped
 * when the user is already on the profile page.
 */
async function goToProfile(): Promise<void> {
  isDropdownOpen.value = false

  if (route.name !== 'my-profile') {
    await router.push({ name: 'my-profile' })
  }
}
</script>
