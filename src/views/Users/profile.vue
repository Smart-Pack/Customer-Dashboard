<template>
  <div class="main-card p-6 lg:p-10 space-y-6 mx-auto lg:w-[90%]">
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <h1 class="main-heading text-2xl lg:text-3xl">My Account</h1>
      <div class="flex gap-2">
        <button
          data-testid="profile-tab"
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold transition"
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
          class="px-4 py-2 rounded-full text-sm font-semibold transition"
          :class="
            activeTab === 'password' ? 'form-submit' : 'secondary-text bg-page dark:bg-page-dark'
          "
          @click="activeTab = 'password'"
        >
          Update Password
        </button>
      </div>
    </header>
    <section>
      <ProfileCard v-if="activeTab === 'profile'" />
      <UpdatePasswordForm v-else />
    </section>
  </div>
</template>

<script lang="ts">
import ProfileCard from '@/components/Users/ProfileCard.vue'
import UpdatePasswordForm from '@/components/Users/UpdatePasswordForm.vue'

/**
 * @module views/Users/profile.vue
 * @description This view component displays the user's profile information and allows them to update it,
 * including their personal details and password. It uses a tabbed interface to switch between
 * the `ProfileCard` and `UpdatePasswordForm` components.
 */
export default {
  name: 'ProfileView',
  components: {
    ProfileCard,
    UpdatePasswordForm,
  },
  data() {
    return {
      /**
       * Controls which tab is currently active: 'profile' or 'password'.
       * @type {string}
       */
      activeTab: 'profile',
    }
  },
}
</script>
