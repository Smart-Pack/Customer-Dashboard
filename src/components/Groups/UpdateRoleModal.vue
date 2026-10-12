<template>
  <section class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <form
      class="main-card max-w-[90vw] w-full lg:max-w-2xl max-h-[90vh] flex flex-col p-4 gap-4"
      @submit.prevent="submit"
    >
      <!-- Title -->
      <h2 class="text-lg main-heading text-center flex-shrink-0">Update Group Member Role</h2>

      <!-- Body -->
      <div class="card-base py-4 px-6 text-sm secondary-text space-y-5 overflow-y-auto flex-1">
        <p class="text-center opacity-70">
          Update the group role assigned to {{ groupMember.user.full_name }}.
        </p>

        <!-- Member -->
        <div class="space-y-2">
          <label class="secondary-text font-semibold text-left block pl-2 text-sm">
            Group Member
          </label>

          <p class="px-3 py-2 rounded-lg border border-current/20">
            {{ groupMember.user.full_name }}
          </p>
        </div>

        <!-- Role -->
        <div class="space-y-2">
          <label for="role" class="secondary-text font-semibold text-left block pl-2 text-sm">
            Group Role
          </label>

          <InputField
            v-model="item.role"
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
 * @module components/Groups/UpdateRoleModal
 * @description Modal for updating a group member's role.
 */

import { reactive, ref, computed } from 'vue'
import axios from 'axios'
import { useForm } from 'vee-validate'

import InputField from '@/components/Base/InputField.vue'
import { edit, type UpdateGroupMemberPayload } from '@/api/modules/groupMembers'
import type { GroupMember } from '@/api/modules/groups'
import { useGlobals } from '@/composables/useGlobals'

defineOptions({
  name: 'UpdateRoleModal',
})

type UpdateRoleFormValues = UpdateGroupMemberPayload

const props = defineProps<{
  groupMember: GroupMember
}>()

const emit = defineEmits<{
  close: []
  success: []
  refresh: []
}>()

const { $notifySuccess, $notifyError } = useGlobals()

const submitting = ref(false)

const roleOptions = [
  { label: 'Select a Role', value: '' },
  { label: 'Administrator', value: 'admin' },
  { label: 'Member', value: 'member' },
]

const roleRules = 'required'
const item = reactive<UpdateRoleFormValues>({
  role: props.groupMember.role,
})

// Initialize the form with VeeValidate.
const { handleSubmit, setFieldError } = useForm<UpdateRoleFormValues>({
  initialValues: {
    role: props.groupMember.role,
  },
})

/**
 * Submits the group member role update request.
 */
const submit = handleSubmit(async (formValues) => {
  try {
    submitting.value = true

    const payload: UpdateGroupMemberPayload = {
      role: formValues.role,
    }

    const result = await edit(props.groupMember.id, payload)

    $notifySuccess(result.message)
    emit('success')
  } catch (e: unknown) {
    const error = e as { message?: string; reload?: boolean }

    if (error.reload) {
      emit('refresh')
      $notifyError(error.message ?? "Failed to update the group member's role.")
      return
    }

    if (axios.isAxiosError<Record<string, string[]>>(e)) {
      const data = e.response?.data

      if (data) {
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length) {
            setFieldError(field as keyof UpdateRoleFormValues, messages[0]!)
          }
        })

        const detail = (data as { detail?: string }).detail

        if (detail) {
          $notifyError(detail)
          return
        }
      }
    }

    const message = e instanceof Error ? e.message : "Failed to update the group member's role."

    $notifyError(message)
  } finally {
    submitting.value = false
  }
})

/**
 * Closes the role update modal.
 */
const close = () => {
  emit('close')
}

const submitButtonText = computed(() => (submitting.value ? 'Updating Role...' : 'Update Role'))
</script>
