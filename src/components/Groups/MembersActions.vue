<template>
  <div class="flex justify-start gap-2">
    <!-- Change Role -->
    <button
      v-if="authStore.userId !== item.user.id && item.role !== 'owner'"
      type="button"
      class="form-submit py-1 px-2 hover:text-white text-sm"
      @click="showRoleModal = true"
    >
      Change Role
    </button>

    <!-- Delete Member -->
    <button
      v-if="authStore.userId !== item.user.id && item.role !== 'owner'"
      type="button"
      class="form-submit-secondary px-2 py-1 text-sm hover:text-white"
      :disabled="submitting"
      @click="deleteMember"
    >
      Delete
    </button>

    <!-- Update Role Modal -->
    <UpdateRoleModal
      v-if="showRoleModal"
      :group-member="item"
      @close="showRoleModal = false"
      @success="handleRoleUpdateSuccess"
      @refresh="handleRefresh"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @module components/Groups/MembersActions
 * @description Actions for updating a group member's role or removing them from a group.
 */

import { ref } from 'vue'

import { removeGroupMember } from '@/api/modules/groupMembers'
import type { GroupMember } from '@/api/modules/groups'
import UpdateRoleModal from './UpdateRoleModal.vue'
import { useGlobals } from '@/composables/useGlobals'
import { useAuthStore } from '@/stores/modules/auth'

defineOptions({
  name: 'MembersActions',
})

const props = defineProps<{
  item: GroupMember
}>()

const emit = defineEmits<{
  refresh: []
}>()

const authStore = useAuthStore()
const { $deleteModal, $notifySuccess, $notifyError } = useGlobals()

const showRoleModal = ref(false)
const submitting = ref(false)

/**
 * Handles successful role updates.
 */
const handleRoleUpdateSuccess = () => {
  showRoleModal.value = false
  emit('refresh')
}

/**
 * Handles refresh requests from the role update modal.
 */
const handleRefresh = () => {
  showRoleModal.value = false
  emit('refresh')
}

/**
 * Confirms and removes the group member.
 */
const deleteMember = async () => {
  try {
    const confirmation = await $deleteModal('Remove Group Member', '', {
      text: `Are you sure you want to remove ${props.item.user.full_name} from this group?`,
    })

    if (!confirmation) return

    submitting.value = true

    const message = await removeGroupMember(props.item.id)

    $notifySuccess(message)
    emit('refresh')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove the group member.'

    $notifyError(message)
  } finally {
    submitting.value = false
  }
}
</script>
