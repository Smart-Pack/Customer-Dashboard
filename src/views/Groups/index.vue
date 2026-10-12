<template>
  <div class="main-card w-full">
    <header class="flex gap-3 items-center justify-between px-4 py-8">
      <h2 class="main-heading text-xl lg:text-2xl">Groups</h2>

      <button
        type="button"
        class="px-4 py-2 rounded-full text-sm font-semibold"
        :class="activePage === 'showGroups' ? 'form-submit' : 'hidden'"
        @click="activePage = 'addGroup'"
      >
        Add Group
      </button>

      <button
        type="button"
        class="px-4 py-2 rounded-full text-sm font-semibold"
        :class="activePage === 'addGroup' ? 'form-submit' : 'hidden'"
        @click="activePage = 'showGroups'"
      >
        Cancel
      </button>
    </header>

    <GroupsTable v-if="activePage === 'showGroups'" />
    <GroupCreationForm v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import GroupsTable from '@/components/Groups/Table.vue'
import GroupCreationForm from '@/components/Groups/CreationForm.vue'
import { verifyInvite, joinInvite } from '@/api/modules/groupMembers'
import { useGlobals } from '@/composables/useGlobals'

defineOptions({
  name: 'GroupsView',
})

/**
 * @module views/Groups/index.vue
 * @description Controls the Groups list and creation form, and handles
 * group invitations received through the URL query parameters.
 */

/**
 * Controls which sub-page is currently active: 'showGroups' or 'addGroup'.
 *
 * @type {import('vue').Ref<'showGroups' | 'addGroup'>}
 */
const activePage = ref<'showGroups' | 'addGroup'>('showGroups')

const route = useRoute()
const { $notifyError, $notifySuccess, $deleteModal, $router } = useGlobals()

/**
 * Verifies a group invitation and prompts the user to join the group.
 *
 * Reads the invitation token from the URL query parameters. If verification
 * succeeds, displays a confirmation dialog containing the group name.
 * Upon confirmation, accepts the invitation and navigates to the Groups page.
 *
 * @returns {Promise<void>} Resolves when invitation handling is complete.
 */
const handleGroupInvitation = async (): Promise<void> => {
  const token = route.query.token

  if (typeof token !== 'string' || !token.trim()) {
    return
  }

  try {
    const invitation = await verifyInvite({ token })

    if (invitation.is_expired) {
      $notifyError('This group invitation has expired.')
      return
    }

    const confirmed = await $deleteModal('Join Group', '', {
      text: `Would you like to join the group "${invitation.group.name}"?`,
    })

    if (!confirmed) {
      return
    }

    await joinInvite({ token })

    $notifySuccess(`You have successfully joined ${invitation.group.name}.`)

    await $router.push({
      name: 'group-details',
      params: { id: invitation.group.id },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to process the group invitation. Please try again.'

    $notifyError(message)
  }
}

onMounted(() => {
  void handleGroupInvitation()
})
</script>

<style></style>
