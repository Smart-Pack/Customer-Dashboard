<template>
  <div class="main-card w-full">
    <header class="flex items-center justify-between px-4 py-8">
      <h2 class="main-heading text-xl lg:text-2xl">SmartPacks</h2>

      <button
        type="button"
        :disabled="showClaimModal"
        class="form-submit rounded-full px-4 py-2 text-sm font-semibold"
        @click="showClaimModal = true"
      >
        Claim SmartPack
      </button>
    </header>

    <SmartPacksTable :refresh-key="refreshKey" />

    <ClaimSmartPackModal
      v-if="showClaimModal"
      @close="showClaimModal = false"
      @claimed="handleClaimed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import ClaimSmartPackModal from '@/components/Smartpacks/ClaimModal.vue'
import SmartPacksTable from '@/components/Smartpacks/Table.vue'

defineOptions({
  name: 'SmartPacksView',
})

/**
 * @module views/SmartPacks/SmartPacksView
 * @description Displays the SmartPack management table and provides
 * a modal for claiming an unassigned SmartPack.
 */

const showClaimModal = ref(false)
const refreshKey = ref(0)

const handleClaimed = () => {
  showClaimModal.value = false
  refreshKey.value++
}
</script>
