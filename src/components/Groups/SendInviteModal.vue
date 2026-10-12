<template>
  <section class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <form
      class="main-card max-w-[90vw] w-full lg:max-w-2xl max-h-[90vh] flex flex-col p-4 gap-4"
      @submit.prevent="submit"
    >
      <!-- Title -->
      <h2 class="text-lg main-heading text-center flex-shrink-0">Invite Group Member</h2>

      <!-- Body -->
      <div class="card-base py-4 px-6 text-sm secondary-text space-y-5 overflow-y-auto flex-1">
        <p class="text-center opacity-70">
          Send an invitation to join this group. The invited user will receive an email.
        </p>

        <!-- Email -->
        <div class="space-y-2">
          <label for="email" class="secondary-text font-semibold text-left block pl-2 text-sm">
            Email Address
          </label>

          <InputField
            name="email"
            type="email"
            error-label="Email Address"
            :rules="emailRules"
            placeholder="user@example.com"
          />
        </div>

        <!-- Role -->
        <div class="space-y-2">
          <label for="role" class="secondary-text font-semibold text-left block pl-2 text-sm">
            Group Role
          </label>

          <InputField
            name="role"
            variant="select"
            :options="roleOptions"
            error-label="Group Role"
            placeholder="Select a role"
            :rules="roleRules"
          />
        </div>
      </div>

      <!-- Buttons -->
      <div class="grid grid-cols-2 items-center gap-4 secondary-text flex-shrink-0">
        <button
          type="button"
          class="form-submit-secondary p-2 text-sm lg:!max-w-28"
          :disabled="submitting"
          @click="close"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="form-submit py-2 px-6 text-sm lg:!max-w-52 lg:justify-self-end overflow-x-hidden"
          :disabled="submitting"
        >
          <span>{{ submitButtonText }}</span>
          <div v-if="submitting" class="ml-2 submit-spinner"></div>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
/**
 * @module components/Groups/InviteGroupMemberModal
 * @description Modal for inviting a user to join a group by email and assigning a group role.
 */

import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import axios from 'axios'

import InputField from '@/components/Base/InputField.vue'
import { sendInvite, type SendGroupInvitePayload } from '@/api/modules/groupMembers'
import { useGlobals } from '@/composables/useGlobals'

defineOptions({
  name: 'InviteGroupMemberModal',
})

type InviteFormValues = SendGroupInvitePayload

const props = defineProps<{
  groupId: number
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { $notifySuccess, $notifyError } = useGlobals()

const submitting = ref(false)

const roleOptions = [
  { label: 'Select a Role', value: '' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Member', value: 'member' },
]

const emailRules = 'required|email'
const roleRules = 'required'

const { handleSubmit, setFieldError } = useForm<InviteFormValues>({
  initialValues: {
    email: '',
    role: 'member',
  },
})

/**
 * Submits the invitation request.
 */
const submit = handleSubmit(async (formValues) => {
  try {
    submitting.value = true

    const payload: SendGroupInvitePayload = {
      email: formValues.email.trim(),
      role: formValues.role,
    }

    const result = await sendInvite(props.groupId, payload)

    $notifySuccess(result)
    emit('success')
  } catch (e: unknown) {
    if (axios.isAxiosError<Record<string, string[]>>(e)) {
      const data = e.response?.data

      if (data) {
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length) {
            setFieldError(field as keyof InviteFormValues, messages[0]!)
          }
        })

        const detail = (data as { detail?: string }).detail

        if (detail) {
          $notifyError(detail)
          return
        }
      }
    }

    const message = e instanceof Error ? e.message : 'Failed to send the group invitation.'

    $notifyError(message)
  } finally {
    submitting.value = false
  }
})

/**
 * Closes the invitation modal.
 */
const close = () => {
  emit('close')
}

const submitButtonText = computed(() =>
  submitting.value ? 'Sending Invitation...' : 'Send Invitation',
)
</script>
