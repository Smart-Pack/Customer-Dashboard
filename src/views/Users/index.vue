<template>
  <div class="main-card w-full">
    <header class="flex gap-3 items-center justify-between px-4 py-8">
      <h2 class="main-heading text-xl lg:text-2xl">Users</h2>

      <button
        v-if="authStore.isAdmin"
        type="button"
        class="px-4 py-2 rounded-full text-sm font-semibold"
        :class="activePage === 'showUsers' ? 'form-submit' : 'hidden'"
        @click="activePage = 'addUser'"
      >
        Add User
      </button>

      <button
        type="button"
        class="px-4 py-2 rounded-full text-sm font-semibold"
        :class="activePage === 'addUser' ? 'form-submit' : 'hidden'"
        @click="activePage = 'showUsers'"
      >
        Cancel
      </button>
    </header>

    <UsersTable v-if="activePage === 'showUsers'" />
    <UserCreationForm v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/modules/auth'
import UsersTable from '@/components/Users/Table.vue'
import UserCreationForm from '@/components/Users/CreationForm.vue'

defineOptions({
  name: 'UsersView',
})

/**
 * @module views/Users/UsersView
 * @description Controls which user-focused sub-page is visible (list vs creation form)
 * while wrapping the content in a consistent card shell for the Users section.
 */

/**
 * Controls which sub-page is currently active: 'showUsers' or 'addUser'.
 * @type {string}
 */
const activePage = ref<'showUsers' | 'addUser'>('showUsers')

const authStore = useAuthStore()
</script>

<style></style>
