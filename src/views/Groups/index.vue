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
import { ref } from 'vue'
import GroupsTable from '@/components/Groups/Table.vue'
import GroupCreationForm from '@/components/Groups/CreationForm.vue'

defineOptions({
  name: 'GroupsView',
})

/**
 * @module views/Groups/GroupsView
 * @description Controls which group-focused sub-page is visible (list or creation form)
 * while wrapping the content in a consistent card shell for the Groups section.
 */

/**
 * Controls which sub-page is currently active: 'showGroups' or 'addGroup'.
 *
 * @type {import('vue').Ref<'showGroups' | 'addGroup'>}
 */
const activePage = ref<'showGroups' | 'addGroup'>('showGroups')
</script>

<style></style>
