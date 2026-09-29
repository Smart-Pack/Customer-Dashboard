<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="main-card h-[80%] w-[80%] flex flex-col">
      <div class="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
          @click="handleClose"
        >
          Cancel
        </button>

        <button
          type="button"
          class="px-4 py-2 rounded-full text-sm font-semibold form-submit-secondary"
          :disabled="!selectedUser.id || submitting"
          @click="handleAssign"
        >
          Assign
        </button>
      </div>

      <div class="overflow-auto">
        <TablePageLayout
          :getter="$api.users.list"
          :tabs="userTabs"
          name="Users"
          :item-headings="userHeadings"
          nav-class="hidden"
          :enable-search="true"
          :extra-props="extraProps"
          @selection-change="handleSelectionChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AssignUser Component
 *
 * Displays a modal containing a list of active customer users and allows
 * selecting a single user to assign to a SmartPack.
 *
 * The component uses the shared TablePageLayout for user retrieval,
 * pagination, searching, and selection. The selected user is emitted
 * to the parent component when the assignment is submitted.
 *
 * @component
 */

import { ref } from 'vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { User, UserQueryParams } from '@/api/modules/users'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'AssignUser',
})

/**
 * Component props.
 *
 * @property {boolean} submitting
 * Indicates whether an assignment request is currently being processed.
 * Used to prevent duplicate submissions.
 */
defineProps<{
  submitting: boolean
}>()

/**
 * Component events.
 *
 * @event close
 * Emitted when the assignment modal is closed.
 *
 * @event assign
 * Emitted with the selected user when the assignment is submitted.
 */
const emit = defineEmits<{
  close: [value: boolean]
  assign: [user: User]
}>()

/**
 * Currently selected user.
 *
 * A partial User object is used because the selection is initially empty
 * and is populated once the user selects a row from the table.
 */
const selectedUser = ref<Partial<User>>({})

/**
 * Additional properties passed to TablePageLayout.
 *
 * Configures the table to use radio-button selection so that only
 * one user can be selected for assignment.
 */
const extraProps = {
  'selection-type': 'radio',
  'selection-name': 'assignUser',
}

/**
 * User table tabs.
 *
 * The assignment list is restricted to active customer accounts.
 */
const userTabs: Array<{
  id: string
  caption: string
  label: string
  params: UserQueryParams
}> = [
  {
    id: 'all',
    caption: 'Assign User',
    label: 'All',
    params: {
      account_type: 'customer',
      is_active: true,
    },
  },
]

/**
 * User table column definitions.
 *
 * Defines the fields displayed in the user selection table, including
 * sortable fields and date formatting.
 */
const userHeadings = [
  {
    key: 'selection',
    label: 'Select',
    sortable: false,
    dataClass: 'secondary-text font-bold',
  },
  {
    key: 'first_name',
    label: 'First Name',
    sortable: true,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'last_name',
    label: 'Last Name',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
  {
    key: 'phone',
    label: 'Phone',
    sortable: true,
  },
  {
    key: 'created_at',
    label: 'Added',
    sortable: true,
    formatter: (value: unknown) => Filters.dateTime(value as string | null | undefined),
  },
]

/**
 * Closes the assignment modal and clears the current selection.
 *
 * @returns {void}
 */
function handleClose(): void {
  selectedUser.value = {}
  emit('close', false)
}

/**
 * Submits the selected user for assignment.
 *
 * Does nothing when no user has been selected.
 *
 * @returns {void}
 */
function handleAssign(): void {
  if (!selectedUser.value.id) return

  emit('assign', selectedUser.value as User)
}

/**
 * Updates the selected user when the table selection changes.
 *
 * Since the table is configured for radio selection, only the first
 * selected user is used.
 *
 * @param {User[]} users - Currently selected users.
 * @returns {void}
 */
function handleSelectionChange(users: User[]): void {
  selectedUser.value = users.length > 0 ? users[0]! : {}
}
</script>
