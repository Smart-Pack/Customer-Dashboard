<template>
  <span
    ref="root"
    class="relative inline-flex items-center"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <button
      type="button"
      class="inline-flex items-center"
      :aria-label="label"
      :aria-expanded="visible"
      @click.stop="open = !open"
      @keydown.esc="open = false"
    >
      <InfoIcon class="h-4 w-4 cursor-help primary-text" />
    </button>

    <div
      v-show="visible"
      role="tooltip"
      class="absolute bottom-full left-0 mb-2 w-56 card-base p-2 text-xs z-10 border-4"
    >
      <p class="font-medium primary-text">
        <slot>{{ text }}</slot>
      </p>
    </div>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import InfoIcon from '@/components/Icons/InfoIcon.vue'

withDefaults(defineProps<{ text?: string; label?: string }>(), {
  text: '',
  label: 'More information',
})

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const hovering = ref(false)
const visible = computed(() => open.value || hovering.value)

function onDocumentClick(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
