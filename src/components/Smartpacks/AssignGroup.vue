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
          :disabled="!selectedGroup.id || submitting"
          @click="handleAssign"
        >
          Assign Group
        </button>
      </div>

      <div class="overflow-auto">
        <TablePageLayout
          :getter="$api.groups.list"
          :tabs="groupTabs"
          name="Groups"
          :item-headings="groupHeadings"
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
 * AssignGroup Component
 *
 * Displays a modal containing groups where the authenticated user has
 * owner or admin access and allows selecting a single group to assign
 * to a SmartPack.
 *
 * The component uses the shared TablePageLayout for group retrieval,
 * pagination, searching, and selection. The selected group is emitted
 * to the parent component when the assignment is submitted.
 *
 * @component
 */

import { ref } from 'vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { Group, GroupQueryParams } from '@/api/modules/groups'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'AssignGroup',
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
 * Emitted with the selected group when the assignment is submitted.
 */
const emit = defineEmits<{
  close: [value: boolean]
  assign: [group: Group]
}>()

/**
 * Currently selected group.
 *
 * A partial Group object is used because the selection is initially empty
 * and is populated once the user selects a row from the table.
 */
const selectedGroup = ref<Partial<Group>>({})

/**
 * Additional properties passed to TablePageLayout.
 *
 * Configures the table to use radio-button selection so that only
 * one group can be selected for assignment.
 */
const extraProps = {
  'selection-type': 'radio',
  'selection-name': 'assignGroup',
}

/**
 * Group table tabs.
 *
 * The group list is restricted to groups where the authenticated user
 * has owner or admin access.
 */
const groupTabs: Array<{
  id: string
  caption: string
  label: string
  params: GroupQueryParams
}> = [
  {
    id: 'admin-access',
    caption: 'Assign Group',
    label: 'Groups',
    params: {
      has_admin_access: true,
    },
  },
]

/**
 * Group table column definitions.
 *
 * Defines the fields displayed in the group selection table, including
 * sortable fields and date formatting.
 */
const groupHeadings = [
  {
    key: 'selection',
    label: 'Select',
    sortable: false,
    dataClass: 'secondary-text font-bold',
  },
  {
    key: 'name',
    label: 'Group Name',
    sortable: true,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'total_users',
    label: 'Users',
    sortable: true,
  },
  {
    key: 'total_smartpacks',
    label: 'SmartPacks',
    sortable: true,
  },
  {
    key: 'created',
    label: 'Created',
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
  selectedGroup.value = {}
  emit('close', false)
}

/**
 * Submits the selected group for assignment.
 *
 * Does nothing when no group has been selected.
 *
 * @returns {void}
 */
function handleAssign(): void {
  if (!selectedGroup.value.id) return

  emit('assign', selectedGroup.value as Group)
}

/**
 * Updates the selected group when the table selection changes.
 *
 * Since the table is configured for radio selection, only the first
 * selected group is used.
 *
 * @param {Group[]} groups - Currently selected groups.
 * @returns {void}
 */
function handleSelectionChange(groups: Group[]): void {
  selectedGroup.value = groups.length > 0 ? groups[0]! : {}
}
</script>
