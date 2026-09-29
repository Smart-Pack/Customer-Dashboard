<template>
  <div class="main-card w-full">
    <header class="flex items-center justify-between px-4 py-8">
      <h2 class="main-heading text-xl lg:text-2xl">SmartPacks</h2>
    </header>

    <SmartPacksTable />
  </div>
</template>

<script setup lang="ts">
import SmartPacksTable from '@/components/Smartpacks/Table.vue'

defineOptions({
  name: 'SmartPacksView',
})

/**
 * @module views/SmartPacks/SmartPacksView
 * @description Displays the SmartPack management table within a
 * consistent card shell for the SmartPacks section.
 */
</script>

<style></style>
