<template>
  <CreationFormLayout
    page-heading="Add Group"
    page-description="Create a group to organize members and manage their assigned SmartPacks."
    :sections="sections"
    name="Group"
    :adder="$api.groups.add as unknown as Adder"
    detailsPage="group-details"
  />
</template>

<script setup lang="ts">
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import type { Adder } from '@/components/Base/CreationFormLayout.vue'
import { getGroupSections } from '@/data/forms/groupSections'

/**
 * @module components/Groups/CreationForm
 * @description Renders the "Add Group" experience by connecting the shared
 * CreationFormLayout to the centralized group form sections.
 */

/**
 * Group creation form sections and field configuration.
 */
const sections = getGroupSections()
</script>
