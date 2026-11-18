<template>
  <span
    ref="root"
    class="relative inline-flex items-center"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <button
      type="button"
      class="inline-flex items-center"
      aria-haspopup="true"
      :aria-label="label"
      :aria-expanded="visible"
      @click.stop="toggleTooltip"
      @keydown.esc.prevent="dismissTooltip"
    >
      <InfoIcon class="h-4 w-4 cursor-help primary-text" />
    </button>

    <div
      v-show="visible"
      role="tooltip"
      class="absolute bottom-full z-20 mb-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 card-base p-2 text-xs shadow-lg"
      :class="tooltipPosition"
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

const props = withDefaults(
  defineProps<{
    text?: string
    label?: string
    placement?: 'left' | 'right' | 'auto'
  }>(),
  {
    text: '',
    label: 'More information',
    placement: 'auto',
  },
)

const root = ref<HTMLElement | null>(null)

const open = ref(false)
const hovering = ref(false)
const focused = ref(false)
const isMobile = ref(false)

/**
 * Incremented whenever the viewport changes.
 *
 * This ensures automatic desktop positioning is recalculated
 * even when the viewport remains within the same breakpoint.
 */
const viewportVersion = ref(0)

const visible = computed(() => open.value || hovering.value || focused.value)

/**
 * Determines the tooltip's horizontal alignment.
 *
 * Mobile:
 * Centers the tooltip relative to its root element.
 *
 * Desktop:
 * Automatically aligns left or right depending on available space.
 *
 * Explicit placement:
 * Respects the supplied left or right alignment.
 */
const tooltipPosition = computed(() => {
  // Track viewport changes so desktop positioning is recalculated.
  void viewportVersion.value

  if (props.placement === 'left') {
    return 'left-0'
  }

  if (props.placement === 'right') {
    return 'right-0'
  }

  if (isMobile.value) {
    return 'left-1/2 -translate-x-1/2'
  }

  const rect = root.value?.getBoundingClientRect()

  if (!rect) {
    return 'left-0'
  }

  const tooltipWidth = 224
  const viewportPadding = 16
  const spaceRight = window.innerWidth - rect.left - viewportPadding

  return spaceRight < tooltipWidth ? 'right-0' : 'left-0'
})

/**
 * Opens or closes the tooltip using the trigger button.
 */
function toggleTooltip(): void {
  if (open.value) {
    dismissTooltip()
    return
  }

  open.value = true
}

/**
 * Dismisses the tooltip regardless of its visibility source.
 *
 * Used by Escape and outside clicks.
 */
function dismissTooltip(): void {
  open.value = false
  hovering.value = false
  focused.value = false
}

/**
 * Updates the viewport state and triggers positioning recalculation.
 */
function updateViewport(): void {
  isMobile.value = window.matchMedia('(max-width: 767px)').matches
  viewportVersion.value += 1
}

/**
 * Closes the tooltip when clicking outside its container.
 */
function onDocumentClick(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    dismissTooltip()
  }
}

onMounted(() => {
  updateViewport()

  window.addEventListener('resize', updateViewport)
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  document.removeEventListener('click', onDocumentClick)
})
</script>
