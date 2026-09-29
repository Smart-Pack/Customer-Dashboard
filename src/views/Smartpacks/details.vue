<template>
  <div class="w-full px-4 py-10">
    <div
      v-if="activePage === 'showDetails'"
      class="grid gap-6 lg:grid-cols-[28%_72%] mx-auto max-w-6xl"
    >
      <!-- Summary Card -->
      <header class="main-card p-6">
        <div class="flex flex-col items-center justify-center gap-4">
          <div
            class="flex h-32 w-32 lg:w-36 lg:h-36 items-center justify-center rounded-full border-2 card-base"
          >
            <BackPackIcon class="h-20 w-20 lg:h-24 lg:w-24 primary-text" />
          </div>

          <h2 class="main-heading text-xl lg:text-2xl">SmartPack</h2>
          <h3 class="sub-heading lg:text-lg">{{ smartPack.hardware_model || '—' }}</h3>

          <div class="flex secondary-text justify-start w-full" title="Assigned User">
            <UserIcon class="secondary-text text-left mr-2" />

            <RouterLink
              v-if="smartPack.assigned_to"
              :to="{
                name: 'user-details',
                params: { id: smartPack.assigned_to.id },
              }"
              class="primary-text hover:underline"
            >
              {{ smartPack.assigned_to.full_name }}
            </RouterLink>

            <span v-else>—</span>
          </div>

          <div class="flex secondary-text justify-start w-full" title="Connection Status">
            <span :class="$filters.activeClass(smartPack.is_online)"></span>
            <span class="ml-2">
              {{ smartPack.is_online ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
      </header>

      <!-- Details Card -->
      <section class="main-card grid gap-6 p-6">
        <h3 class="sub-heading text-xl text-left">Details</h3>

        <div
          class="card-base bg-page dark:bg-page-dark grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 lg:text-lg break-words"
        >
          <!-- Left -->
          <div>
            <div>
              <dt class="mt-1 primary-text">IMEI</dt>
              <dd class="mt-1 secondary-text">
                {{ smartPack.imei || '—' }}
              </dd>
            </div>

            <div>
              <dt class="mt-1 primary-text">Firmware Version</dt>
              <dd class="mt-1 secondary-text">
                {{ smartPack.firmware_version || '—' }}
              </dd>
            </div>
          </div>

          <!-- Right -->
          <div>
            <div>
              <dt class="mt-1 primary-text">Last Seen</dt>
              <dd class="mt-1 secondary-text">
                {{ formatLastSeen(smartPack.last_seen) }}
              </dd>
            </div>

            <div>
              <dt class="mt-1 primary-text">Added</dt>
              <dd class="mt-1 secondary-text">
                {{ $filters.dateTime(smartPack.created) || '—' }}
              </dd>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-4 items-center justify-start lg:justify-between flex-wrap p-4">
          <template v-if="authStore.isAdmin">
            <button
              v-if="!smartPack.assigned_to"
              type="button"
              class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
              @click="assignUser"
              :disabled="submitting"
            >
              Assign User
            </button>

            <button
              v-else
              type="button"
              class="px-4 py-2 rounded-full text-sm font-semibold error-btn"
              @click="unassignUser"
              :disabled="submitting"
            >
              Unassign User
            </button>
          </template>

          <button
            type="button"
            :disabled="printingQr"
            class="px-4 py-2 rounded-full text-sm font-semibold form-submit-secondary"
            @click="handlePrintQr(true)"
          >
            Print QR
          </button>
        </div>
      </section>
    </div>

    <!-- Assign User Modal -->
    <AssignUser
      v-if="showAssignTable"
      :submitting="submitting"
      @close="handleShowAssignTable"
      @assign="handleAssign"
    />

    <!-- QR Code helper -->
    <SmartPackQrComponent v-if="printingQr" :item="smartPack" @show-qr="handlePrintQr" />
  </div>
</template>

<script lang="ts">
/**
 * @module views/SmartPacks/Details
 * @description Displays SmartPack details and allows administrators
 * to assign or unassign a customer user, and to print the SmartPack QR code.
 */

import { defineComponent } from 'vue'
import type { SmartPack } from '@/api/modules/smartpacks'
import type { User } from '@/api/modules/users'
import type { ItemNotFoundError } from '@/api/types'

import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import AssignUser from '@/components/Smartpacks/AssignUser.vue'
import SmartPackQrComponent from '@/components/Smartpacks/QrCode.vue'

import { useAuthStore } from '@/stores/modules/auth'

export default defineComponent({
  name: 'SmartPackDetails',

  components: {
    BackPackIcon,
    UserIcon,
    AssignUser,
    SmartPackQrComponent,
  },

  computed: {
    authStore() {
      return useAuthStore(this.$pinia)
    },

    smartPackId(): { id: string } {
      const id = this.$route.params.id

      return {
        id: typeof id === 'string' ? id : '',
      }
    },
  },

  data() {
    return {
      smartPack: {} as SmartPack,
      activePage: 'showDetails' as const,
      showAssignTable: false,
      submitting: false,
      /**
       * True while the hidden QR helper should render/download.
       */
      printingQr: false,
    }
  },

  async mounted() {
    await this.getSmartPack()
  },

  methods: {
    /**
     * Fetches the SmartPack details using the route ID.
     */
    async getSmartPack(): Promise<void> {
      try {
        this.smartPack = await this.$api.smartpacks.getById(this.smartPackId)
      } catch (error) {
        const itemError = error as ItemNotFoundError

        this.$notifyError(itemError.message)

        if (itemError.reload) {
          this.$router.push({ name: 'smartpacks' })
        }
      }
    },

    /**
     * Formats the SmartPack last-seen timestamp.
     */
    formatLastSeen(lastSeen: string | null | undefined): string {
      if (!lastSeen) return '—'

      return this.$filters.dateTime(lastSeen) || '—'
    },

    /**
     * Opens the user assignment modal.
     */
    assignUser(): void {
      this.showAssignTable = true
    },

    /**
     * Assigns the selected user to the SmartPack.
     */
    async handleAssign(user: User): Promise<void> {
      try {
        this.submitting = true

        const message = await this.$api.smartpacks.assign(this.smartPack.id, {
          assigned_to: user.id,
        })

        this.showAssignTable = false

        await this.getSmartPack()

        this.$notifySuccess(message)
      } catch (error) {
        const err = error as ItemNotFoundError

        this.$notifyError(err.message)

        if (err.reload) {
          this.$router.push({ name: 'smartpacks' })
        }
      } finally {
        this.submitting = false
      }
    },

    /**
     * Unassigns the current customer from the SmartPack after confirmation.
     */
    async unassignUser(): Promise<void> {
      try {
        const confirmation = await this.$deleteModal(
          'Unassign',
          `${this.smartPack.hardware_model} SmartPack from ${this.smartPack.assigned_to?.full_name}`,
        )

        if (!confirmation) return

        this.submitting = true

        const message = await this.$api.smartpacks.unassign(this.smartPack.id)

        await this.getSmartPack()

        this.$notifySuccess(message)
      } catch (error) {
        const err = error as ItemNotFoundError

        this.$notifyError(err.message)

        if (err.reload) {
          this.$router.push({ name: 'smartpacks' })
        }
      } finally {
        this.submitting = false
      }
    },

    /**
     * Controls the visibility of the user assignment modal.
     */
    handleShowAssignTable(value: boolean): void {
      this.showAssignTable = value
    },

    /**
     * Toggles the invisible QR helper so it can trigger the download, then hides it again.
     */
    handlePrintQr(value: boolean): void {
      this.printingQr = value
    },
  },
})
</script>

<style scoped></style>
