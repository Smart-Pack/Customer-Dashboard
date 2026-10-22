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
          <h3 class="sub-heading lg:text-lg">
            {{ smartPack.hardware_model || '—' }}
          </h3>

          <div class="flex secondary-text justify-start w-full" title="Child">
            <UserIcon class="secondary-text text-left mr-2" />

            <span>
              {{ smartPack.child_name || '—' }}
            </span>
          </div>

          <div class="flex secondary-text justify-start w-full" title="Group">
            <UserGroupIcon class="secondary-text text-left mr-2" />

            <RouterLink
              v-if="smartPack.group"
              :to="{
                name: 'group-details',
                params: { id: smartPack.group.id },
              }"
              class="primary-text hover:underline"
            >
              {{ smartPack.group.name }}
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
          <button
            v-if="!smartPack.group || authStore.isGroupAdmin(smartPack.group.id)"
            type="button"
            :class="
              smartPack.group
                ? 'px-4 py-2 rounded-full text-sm font-semibold error-btn'
                : 'px-4 py-2 rounded-full text-sm font-semibold form-submit'
            "
            @click="handleGroupAction"
            :disabled="submitting"
          >
            {{ smartPack.group ? 'Unassign from Group' : 'Assign to Group' }}
          </button>

          <button
            v-if="!smartPack.group || authStore.isGroupAdmin(smartPack.group.id)"
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
            @click="handlePageChange('assignChild')"
            :disabled="submitting"
          >
            Assign to Child
          </button>

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

    <!-- Assign Child Card -->
    <div v-else class="main-card">
      <header class="flex gap-3 items-center justify-between p-4">
        <h2 class="main-heading text-2xl lg:text-3xl">Assign to Child</h2>

        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
          @click="activePage = 'showDetails'"
        >
          Cancel
        </button>
      </header>

      <AssignChildForm :initial-values="{ ...smartPack }" @close="handlePageChange" />
    </div>
    <!-- Sensor Measurements -->
    <SmartPackSensorMeasurements
      v-if="smartPack.id && activePage === 'showDetails'"
      class="mt-8 mx-auto max-w-6xl"
      :smartpack-id="smartPack.id"
    />
    <!-- Assign Group Modal -->
    <AssignGroup
      v-if="showAssignGroupTable"
      :submitting="submitting"
      @close="handleShowAssignGroupTable"
      @assign="handleAssignGroup"
    />

    <!-- QR Code Helper -->
    <SmartPackQrComponent v-if="printingQr" :item="smartPack" @show-qr="handlePrintQr" />
  </div>
</template>

<script lang="ts">
/**
 * @module views/SmartPacks/Details
 * @description Displays SmartPack details and allows authorized users
 * to assign or unassign groups, assign a child, and print the SmartPack QR code.
 */

import { defineComponent } from 'vue'
import type { SmartPack } from '@/api/modules/smartpacks'
import type { Group } from '@/api/modules/groups'
import type { ItemNotFoundError } from '@/api/types'

import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import SmartPackSensorMeasurements from '@/components/Smartpacks/SensorMeasurements.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import AssignGroup from '@/components/Smartpacks/AssignGroup.vue'
import AssignChildForm from '@/components/Smartpacks/UpdateForm.vue'
import SmartPackQrComponent from '@/components/Smartpacks/QrCode.vue'

import { useAuthStore } from '@/stores/modules/auth'

export default defineComponent({
  name: 'SmartPackDetails',

  components: {
    AssignChildForm,
    BackPackIcon,
    UserIcon,
    UserGroupIcon,
    AssignGroup,
    SmartPackQrComponent,
    SmartPackSensorMeasurements,
  },

  computed: {
    /**
     * Returns the authenticated user's Pinia store.
     *
     * @returns The authentication store.
     */
    authStore() {
      return useAuthStore(this.$pinia)
    },

    /**
     * Extracts the SmartPack ID from the current route.
     *
     * @returns An object containing the SmartPack ID.
     */
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
      activePage: 'showDetails' as 'showDetails' | 'assignChild',
      showAssignGroupTable: false,
      submitting: false,

      /**
       * Indicates whether the hidden QR helper should render and download.
       */
      printingQr: false,
    }
  },

  /**
   * Refreshes the authenticated user's data to ensure the latest permissions
   * are available, then fetches the SmartPack details.
   *
   * User data fetching runs asynchronously without blocking the SmartPack
   * details request. Errors during user data fetching are ignored.
   *
   * @returns A promise that resolves when the SmartPack details are loaded.
   */
  async mounted() {
    this.authStore.fetchUser().catch(() => {})
    await this.getSmartPack()
  },

  methods: {
    /**
     * Fetches the SmartPack details using the ID from the current route.
     *
     * Redirects to the SmartPacks list if the device no longer exists.
     *
     * @returns A promise that resolves when the fetch completes.
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
     * Changes the active page and optionally refreshes the SmartPack details.
     *
     * @param value - The page to display.
     * @param refresh - Whether to reload the SmartPack details.
     * @returns Nothing.
     */
    handlePageChange(value: 'showDetails' | 'assignChild', refresh = false): void {
      this.activePage = value

      if (refresh) {
        this.getSmartPack()
      }
    },

    /**
     * Formats the SmartPack's last-seen timestamp.
     *
     * @param lastSeen - The last-seen timestamp.
     * @returns The formatted date and time, or an em dash when unavailable.
     */
    formatLastSeen(lastSeen: string | null | undefined): string {
      if (!lastSeen) return '—'

      return this.$filters.dateTime(lastSeen) || '—'
    },

    /**
     * Opens the group assignment modal when the SmartPack has no group.
     * Otherwise, starts the process of unassigning the existing group.
     *
     * @returns Nothing.
     */
    handleGroupAction(): void {
      if (this.smartPack.group) {
        this.unassignGroup()
        return
      }

      this.showAssignGroupTable = true
    },

    /**
     * Assigns the selected group to the SmartPack.
     *
     * Refreshes the SmartPack details and displays a success notification
     * when the assignment succeeds.
     *
     * @param group - The group to assign to the SmartPack.
     * @returns A promise that resolves when the assignment completes.
     */
    async handleAssignGroup(group: Group): Promise<void> {
      try {
        this.submitting = true

        const message = await this.$api.smartpacks.assignGroup(this.smartPack.id, {
          group: group.id,
        })

        this.showAssignGroupTable = false

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
     * Unassigns the current group from the SmartPack after confirmation.
     *
     * Refreshes the SmartPack details and displays a success notification
     * when the unassignment succeeds.
     *
     * @returns A promise that resolves when the unassignment completes.
     */
    async unassignGroup(): Promise<void> {
      if (!this.smartPack.group) return

      try {
        const confirmation = await this.$deleteModal('Unassign Group', '', {
          text: `Are you sure you want to remove the SmartPack from the group "${this.smartPack.group.name}"?`,
        })

        if (!confirmation) return

        this.submitting = true

        const message = await this.$api.smartpacks.unassignGroup(this.smartPack.id)

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
     * Updates the visibility of the group assignment modal.
     *
     * @param value - Whether the modal should be visible.
     * @returns Nothing.
     */
    handleShowAssignGroupTable(value: boolean): void {
      this.showAssignGroupTable = value
    },

    /**
     * Toggles the QR helper so it can trigger the download, then hides it.
     *
     * @param value - Whether the QR helper should be visible.
     * @returns Nothing.
     */
    handlePrintQr(value: boolean): void {
      this.printingQr = value
    },
  },
})
</script>

<style scoped></style>
