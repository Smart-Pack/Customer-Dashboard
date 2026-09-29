<template>
  <CreationFormLayout
    page-heading="Add User"
    page-description="Register a new user so they can access the platform."
    :sections="sections"
    name="User"
    :adder="$api.users.add as unknown as Adder"
    detailsPage="user-details"
  />
</template>

<script setup lang="ts">
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { Adder } from '@/components/Base/CreationFormLayout.vue'
import { getUserSections } from '@/data/forms/userSections'

/**
 * @module components/Users/UserCreationForm
 * @description Renders the “Add User” experience by wiring the shared
 * CreationFormLayout to the central user sections.
 */

const sections = getUserSections()
</script>
