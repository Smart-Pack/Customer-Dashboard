<template>
  <div class="w-full px-4 py-10">
    <!-- Group Details -->
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
            <UserGroupIcon class="h-24 w-24 lg:w-28 lg:h-28 primary-text" />
          </div>

          <h2 class="main-heading text-xl lg:text-2xl">
            {{ group.name || 'Group' }}
          </h2>

          <!-- Total Users -->
          <div class="flex secondary-text justify-start w-full" title="Total Users">
            <UserIcon class="secondary-text text-left" />
            <span>
              {{ group.members?.length ?? 0 }}
              {{ group.members?.length === 1 ? 'User' : 'Users' }}
            </span>
          </div>

          <!-- Total SmartPacks -->
          <div class="flex secondary-text justify-start w-full" title="Total SmartPacks">
            <BackPackIcon class="secondary-text text-left" />
            <span>
              {{ group.smartpacks?.length ?? 0 }}
              {{ group.smartpacks?.length === 1 ? 'SmartPack' : 'SmartPacks' }}
            </span>
          </div>
        </div>
      </header>

      <!-- Group Details Card -->
      <section class="main-card grid gap-6 p-6">
        <h3 class="sub-heading text-xl text-left">Details</h3>

        <div
          class="card-base bg-page dark:bg-page-dark grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 lg:text-lg"
        >
          <div>
            <!-- Group Name -->
            <div>
              <dt class="mt-1 primary-text">Group Name</dt>
              <dd class="mt-1 secondary-text break-words">
                {{ group.name }}
              </dd>
            </div>

            <!-- Group Owner -->
            <div>
              <dt class="mt-1 primary-text">Owner</dt>
              <dd class="mt-1 secondary-text break-words">
                {{ owner?.user.full_name || 'No owner assigned' }}
              </dd>
            </div>
          </div>

          <div>
            <!-- Created -->
            <div>
              <dt class="mt-1 primary-text">Created</dt>
              <dd class="mt-1 secondary-text">
                {{ group.created ? $filters.dateTime(group.created) : '—' }}
              </dd>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-4 items-center justify-start lg:justify-between flex-wrap p-4">
          <!-- Update Group -->
          <button
            v-if="authStore.isGroupAdmin(group.id)"
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
            @click="handlePageChange('update')"
            :disabled="submitting"
          >
            Update
          </button>

          <!-- Send Invite -->
          <button
            v-if="authStore.isGroupAdmin(group.id)"
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
            @click="showInviteModal = true"
            :disabled="submitting"
          >
            Send Invite
          </button>
          <!-- Delete Group: Owner Only -->
          <button
            v-if="authStore.isGroupOwner(group.id)"
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold error-btn"
            @click="deleteGroup"
            :disabled="submitting"
          >
            Delete
          </button>
          <!-- Leave Group: Members Only -->
          <button
            v-if="!authStore.isGroupOwner(group.id)"
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold error-btn"
            @click="leaveGroup"
            :disabled="submitting"
          >
            Leave Group
          </button>
        </div>
      </section>
    </div>

    <!-- Update Card -->
    <div v-else class="main-card mx-auto max-w-6xl">
      <header class="flex gap-3 items-center justify-between p-4">
        <h2 class="main-heading text-2xl lg:text-3xl">Group</h2>

        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
          @click="activePage = 'showDetails'"
          :disabled="submitting"
        >
          Cancel
        </button>
      </header>

      <GroupUpdateForm :initial-values="{ ...group }" @close="handlePageChange" />
    </div>
    <GroupAssets
      v-if="group.id && activePage === 'showDetails'"
      class="mt-8"
      :group-id="group.id"
      :group-name="group.name"
      :refresh-key="group.updated"
    />
    <!-- Send Group Invitation Modal -->
    <SendInviteModal
      v-if="showInviteModal && group.id"
      :group-id="group.id"
      @close="showInviteModal = false"
      @success="handleInviteSuccess"
    />
  </div>
</template>

<script lang="ts">
/**
 * @module views/Groups/details
 * @description Displays group metadata, including its owner, members, and SmartPacks, in a two-pane layout and swaps in the edit form when updating the group.
 */
import { defineComponent } from 'vue'
import type { GroupDetail } from '@/api/modules/groups'
import type { ItemNotFoundError } from '@/api/types'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'
import UserIcon from '@/components/Icons/UserIcon.vue'
import BackPackIcon from '@/components/Icons/BackPackIcon.vue'
import GroupUpdateForm from '@/components/Groups/UpdateForm.vue'
import GroupAssets from '@/components/Groups/Assets.vue'
import SendInviteModal from '@/components/Groups/SendInviteModal.vue'
import { useAuthStore } from '@/stores/modules/auth'

export default defineComponent({
  name: 'GroupDetails',

  components: {
    UserGroupIcon,
    UserIcon,
    BackPackIcon,
    GroupUpdateForm,
    GroupAssets,
    SendInviteModal,
  },

  computed: {
    authStore() {
      return useAuthStore(this.$pinia)
    },

    groupId(): { id: string } {
      const id = this.$route.params.id

      return {
        id: typeof id === 'string' ? id : '',
      }
    },

    owner() {
      return this.group.members?.find((member) => member.role === 'owner')
    },
  },

  data() {
    return {
      group: {} as GroupDetail,
      activePage: 'showDetails' as 'showDetails' | 'update',
      submitting: false,
      showInviteModal: false,
    }
  },

  async mounted() {
    await this.getGroup()
  },

  methods: {
    /**
     * Fetches the details for a single group using its route parameter ID.
     */
    async getGroup(): Promise<void> {
      try {
        this.group = await this.$api.groups.getById(this.groupId)
      } catch (error) {
        const itemError = error as ItemNotFoundError

        this.$notifyError(itemError.message)

        if (itemError.reload) {
          this.$router.push({ name: 'groups' })
        }
      }
    },

    /**
     * Deletes the group after confirmation.
     */
    async deleteGroup(): Promise<void> {
      try {
        const confirmation = await this.$deleteModal('Delete Group', `"${this.group.name}"?`)

        if (!confirmation) return

        this.submitting = true

        const message = await this.$api.groups.remove(this.group.id)

        this.$notifySuccess(message)
        this.$router.push({ name: 'groups' })
      } catch (error: unknown) {
        const itemError = error as ItemNotFoundError

        this.$notifyError(itemError.message)

        if (itemError.reload) {
          this.$router.push({ name: 'groups' })
        }
      } finally {
        this.submitting = false
      }
    },
    /**
     * Leaves the group after confirmation.
     */
    async leaveGroup(): Promise<void> {
      try {
        const confirmation = await this.$deleteModal('Leave Group', `"${this.group.name}"?`)

        if (!confirmation) return

        const currentUserId = this.authStore.userId
        const membership = this.group.members.find((member) => member.user.id === currentUserId)

        if (!membership) {
          this.$notifyError('You are not a member of this group.')
          return
        }

        this.submitting = true

        const message = await this.$api.groupMembers.leaveGroup(membership.id)

        this.$notifySuccess(message)
        this.$router.push({ name: 'groups' })
      } catch (error: unknown) {
        const itemError = error as ItemNotFoundError

        this.$notifyError(itemError.message)

        if (itemError.reload) {
          this.$router.push({ name: 'groups' })
        }
      } finally {
        this.submitting = false
      }
    },

    /**
     * Switches between the group details and update panels, optionally reloading the group.
     *
     * @param value - The page to display.
     * @param refresh - Whether to reload the group details.
     */
    handlePageChange(value: 'showDetails' | 'update', refresh = false): void {
      this.activePage = value

      if (refresh) {
        this.getGroup()
      }
    },
    /**
     * Closes the invitation modal and refreshes the group details after an invitation is sent.
     */
    async handleInviteSuccess(): Promise<void> {
      this.showInviteModal = false
      await this.getGroup()
    },
  },
})
</script>

<style scoped></style>
