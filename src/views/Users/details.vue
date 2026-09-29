<template>
  <div class="w-full px-4 py-10">
    <div
      v-if="activePage === 'showDetails'"
      class="grid gap-6 lg:grid-cols-[28%_72%] mx-auto max-w-6xl"
    >
      <header class="main-card p-6">
        <div class="flex flex-col items-center justify-center gap-4">
          <div
            v-if="!user?.profile_pic"
            class="flex h-32 w-32 lg:w-36 lg:h-36 items-center justify-center rounded-full border-2 card-base"
          >
            <MaleIcon
              v-if="user.gender === 'male'"
              class="h-24 w-24 lg:w-28 lg:h-28 primary-text"
            />
            <FemaleIcon v-else class="h-20 w-20 lg:w-24 lg:h-24 primary-text" />
          </div>
          <img
            v-else
            :src="user?.profile_pic"
            class="w-36 h-36 lg:w-40 lg:h-40 object-cover rounded-full border-2 card-base"
          />
          <h2 class="main-heading text-xl lg:text-2xl">
            {{ headingTitle }}
          </h2>
          <h3 class="sub-heading lg:text-lg">{{ user.first_name }} {{ user.last_name }}</h3>
          <div
            v-if="showAccountType"
            class="flex secondary-text justify-start w-full"
            :title="user?.account_type"
          >
            <BriefcaseIcon class="secondary-text text-left" />
            <span>{{ $filters.capitalize(user.account_type) }}</span>
          </div>
          <div class="flex secondary-text justify-start w-full" title="Phone Number">
            <PhoneIcon class="secondary-text text-left" />
            <span>{{ user.phone }}</span>
          </div>
        </div>
      </header>

      <section class="main-card grid gap-6 p-6">
        <h3 class="sub-heading text-xl text-left">Details</h3>
        <div
          class="card-base bg-page dark:bg-page-dark grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 lg:text-lg"
        >
          <div>
            <div>
              <dt class="mt-1 primary-text">Email</dt>
              <dd class="mt-1 secondary-text break-words">{{ user.email }}</dd>
            </div>
            <div>
              <dt class="mt-1 primary-text">Gender</dt>
              <dd class="mt-1 secondary-text">
                {{ $filters.capitalize(user.gender) }}
              </dd>
            </div>
            <div>
              <dt class="mt-1 primary-text">Two-Factor Auth</dt>
              <dd class="mt-1 secondary-text">
                {{ user.two_factor_enabled ? 'Enabled' : 'Disabled' }}
              </dd>
            </div>
          </div>
          <div>
            <div>
              <dt class="mt-1 primary-text">Status</dt>
              <dd class="mt-1 secondary-text">
                {{ $filters.capitalize(user.status) }}
              </dd>
            </div>
            <div v-if="user.date_of_birth">
              <dt class="mt-1 primary-text">Date of birth</dt>
              <dd class="mt-1 secondary-text">
                {{ $filters.dateOnly(user.date_of_birth) }}
              </dd>
            </div>

            <div>
              <dt class="mt-1 primary-text">Added</dt>
              <dd class="mt-1 secondary-text">
                {{ $filters.dateTime(user.created_at) }}
              </dd>
            </div>
          </div>
        </div>
        <div v-if="authStore.isAdmin" class="flex gap-3 items-center justify-between p-4">
          <button
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
            @click="handlePageChange('update')"
          >
            Update
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold error-btn"
            @click="toggleUser"
            :disabled="submitting || authStore.isCurrentUser(user.id)"
            :title="
              authStore.isCurrentUser(user.id)
                ? 'You cannot suspend or activate your own account'
                : undefined
            "
          >
            {{ user.status === 'active' ? 'Suspend' : 'Activate' }}
          </button>
        </div>
      </section>
    </div>

    <!-- Update Card -->
    <div v-else class="main-card">
      <header class="flex gap-3 items-center justify-between p-4">
        <h2 class="main-heading text-2xl lg:text-3xl">User</h2>
        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
          @click="activePage = 'showDetails'"
        >
          Cancel
        </button>
      </header>
      <UserUpdateForm :initial-values="{ ...user }" @close="handlePageChange" />
    </div>
    <UserAssets
      v-if="isCustomer && user.id"
      class="mt-8"
      :user-id="user.id"
      :user-name="user?.full_name"
    />
  </div>
</template>

<script lang="ts">
/**
 * @module views/Users/UserDetails
 * @description Displays user metadata in a two-pane profile layout, mirrors the Docker detail card pattern, and swaps in the edit form when updating the user.
 */
import { defineComponent } from 'vue'
import type { User } from '@/api/modules/users'
import type { ItemNotFoundError } from '@/api/types'
import BriefcaseIcon from '@/components/Icons/BriefcaseIcon.vue'
import MaleIcon from '@/components/Icons/MaleIcon.vue'
import FemaleIcon from '@/components/Icons/FemaleIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import UserUpdateForm from '@/components/Users/UpdateForm.vue'
import UserAssets from '@/components/Users/Assets.vue'
import { useAuthStore } from '@/stores/modules/auth'

export default defineComponent({
  name: 'UserDetails',
  components: {
    BriefcaseIcon,
    MaleIcon,
    FemaleIcon,
    PhoneIcon,
    UserAssets,
    UserUpdateForm,
  },
  computed: {
    authStore() {
      return useAuthStore(this.$pinia)
    },
    headingTitle(): string {
      if (this.user.account_type === 'customer') {
        return 'Customer'
      }

      return this.$filters.capitalize(this.user.role || 'User')
    },
    showAccountType() {
      return !!this.user && (this.user.account_type || '').toLowerCase() !== 'customer'
    },
    isCustomer() {
      return !!this.user && (this.user.account_type || '').toLowerCase() === 'customer'
    },
    userId(): { id: string } {
      const id = this.$route.params.id

      return {
        id: typeof id === 'string' ? id : '',
      }
    },
  },
  data() {
    return {
      user: {} as User,
      activePage: 'showDetails' as 'showDetails' | 'update',
      submitting: false,
    }
  },
  async mounted() {
    await this.getUser()
  },
  methods: {
    /**
     * Fetches the details for a single user by their ID from the route parameters.
     */
    async getUser(): Promise<void> {
      try {
        this.user = await this.$api.users.getById(this.userId)
      } catch (error) {
        const itemError = error as ItemNotFoundError

        this.$notifyError(itemError.message)

        if (itemError.reload) {
          this.$router.push({ name: 'users' })
        }
      }
    },
    /**
     * Toggles the user's active status after confirmation.
     */
    async toggleUser(): Promise<void> {
      try {
        const confirmation = await this.$deleteModal(
          this.user.status === 'active' ? 'Suspend' : 'Activate',
          `${this.user.first_name} ${this.user.last_name}`,
        )
        if (!confirmation) return
        this.submitting = true
        const payload = { ...this.user }
        const results = await this.$api.users.edit(payload, true)
        this.user = results.data
        this.$notifySuccess(results.message)
      } catch (error: unknown) {
        const err = error as ItemNotFoundError
        this.$notifyError(err.message)
        if (err.reload) {
          this.$router.push({ name: 'users' })
        }
      } finally {
        this.submitting = false
      }
    },
    /**
     * Switches between the detail and update panels, optionally reloading the user.
     */
    handlePageChange(value: 'showDetails' | 'update', refresh = false): void {
      this.activePage = value
      if (refresh) {
        this.getUser()
      }
    },
  },
})
</script>

<style scoped></style>
