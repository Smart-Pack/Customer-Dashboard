<template>
  <section
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="close"
  >
    <div
      class="main-card max-w-[90vw] w-full lg:max-w-2xl max-h-[90vh] flex flex-col p-4 gap-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
    >
      <!-- Header -->
      <header class="flex items-center justify-between gap-4 flex-shrink-0">
        <h2 id="notifications-modal-title" class="text-lg main-heading text-center flex-1">
          Manage Contact Numbers
        </h2>

        <button
          type="button"
          class="form-submit-secondary p-2 flex-shrink-0"
          aria-label="Close notifications modal"
          :disabled="submitting"
          @click="close"
        >
          <CloseIcon class="h-5 w-5" />
        </button>
      </header>

      <!-- Tabs -->
      <div class="grid grid-cols-2 gap-2 flex-shrink-0">
        <button
          type="button"
          data-testid="sms-tab"
          class="px-4 py-2 rounded-full text-sm font-semibold transition"
          :class="activeTab === 'sms' ? 'form-submit' : 'secondary-text bg-page dark:bg-page-dark'"
          :disabled="submitting"
          @click="activeTab = 'sms'"
        >
          SMS
        </button>

        <button
          type="button"
          data-testid="whatsapp-tab"
          class="px-4 py-2 rounded-full text-sm font-semibold transition"
          :class="
            activeTab === 'whatsapp' ? 'form-submit' : 'secondary-text bg-page dark:bg-page-dark'
          "
          :disabled="submitting"
          @click="activeTab = 'whatsapp'"
        >
          WhatsApp
        </button>
      </div>

      <!-- SMS -->
      <NotificationsSmsModalBody
        v-if="activeTab === 'sms'"
        :sms-phone-number="smsPhoneNumber"
        @close="close"
        @success="emit('success')"
      />

      <!-- WhatsApp -->
      <NotificationsWhatsappModalBody
        v-else
        :whatsapp-phone-number="whatsappPhoneNumber"
        @close="close"
        @success="emit('success')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * @module components/Users/NotificationsModal
 * @description Modal for managing notification contact numbers.
 *
 * Provides SMS and WhatsApp tabs, delegating contact-number
 * management to their respective modal body components.
 */

import { ref } from 'vue'

import CloseIcon from '@/components/Icons/CloseIcon.vue'
import NotificationsSmsModalBody from '@/components/Users/NotificationsSmsModalBody.vue'
import NotificationsWhatsappModalBody from '@/components/Users/NotificationsWhatsappModalBody.vue'

defineOptions({
  name: 'NotificationsModal',
})

defineProps<{
  smsPhoneNumber: string
  whatsappPhoneNumber: string
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const activeTab = ref<'sms' | 'whatsapp'>('sms')
const submitting = ref(false)

/**
 * Closes the modal.
 */
function close(): void {
  emit('close')
}
</script>
