<template>
  <div class="main-card p-6 lg:p-10 space-y-6 mx-auto lg:w-[90%]">
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <h1 class="main-heading text-2xl lg:text-3xl">My Account</h1>

      <div class="flex flex-wrap gap-2">
        <button
          data-testid="profile-tab"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-semibold transition"
          :class="
            activeTab === 'profile' ? 'form-submit' : 'secondary-text bg-page dark:bg-page-dark'
          "
          @click="activeTab = 'profile'"
        >
          Profile
        </button>

        <button
          data-testid="password-tab"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-semibold transition"
          :class="
            activeTab === 'password' ? 'form-submit' : 'secondary-text bg-page dark:bg-page-dark'
          "
          @click="activeTab = 'password'"
        >
          Update Password
        </button>

        <button
          data-testid="notifications-tab"
          type="button"
          class="basis-full max-w-max rounded-full px-4 py-2 text-sm font-semibold transition md:basis-auto"
          :class="
            activeTab === 'notifications'
              ? 'form-submit'
              : 'secondary-text bg-page dark:bg-page-dark'
          "
          @click="activeTab = 'notifications'"
        >
          Notifications
        </button>
      </div>
    </header>

    <section>
      <ProfileCard v-if="activeTab === 'profile'" />
      <UpdatePasswordForm v-else-if="activeTab === 'password'" />
      <Notifications v-else />
    </section>
  </div>
</template>

<script lang="ts">
import ProfileCard from '@/components/Users/ProfileCard.vue'
import UpdatePasswordForm from '@/components/Users/UpdatePasswordForm.vue'
import Notifications from '@/components/Users/Notifications.vue'

/**
 * @module views/Users/profile.vue
 * @description This view component displays the user's profile information and allows them to update it,
 * including their personal details, password, and notification preferences. It uses a tabbed interface
 * synchronized with the URL query parameters.
 */
export default {
  name: 'ProfileView',
  components: {
    ProfileCard,
    UpdatePasswordForm,
    Notifications,
  },
  computed: {
    /**
     * Controls the active tab using the `tabs` query parameter.
     * Defaults to 'profile' if the parameter is missing or invalid.
     */
    activeTab: {
      get(): string {
        const tab = this.$route.query.tabs
        const validTabs = ['profile', 'password', 'notifications']

        return typeof tab === 'string' && validTabs.includes(tab) ? tab : 'profile'
      },

      set(tab: string) {
        this.$router.replace({
          query: {
            ...this.$route.query,
            tabs: tab,
          },
        })
      },
    },
  },
}
</script>
