<template>
  <div class="main-card w-full">
    <header class="flex gap-3 items-center justify-between p-4">
      <h3 class="sub-heading text-xl text-left">Assets</h3>
    </header>

    <TablePageLayout
      v-if="userId !== 0"
      :getter="$api.smartpacks.list"
      :page-description="smartPacksDescription"
      :tabs="smartPackTabs"
      name="SmartPacks"
      :item-headings="smartPackHeadings"
      :enable-search="true"
      nav-class="grid-cols-1 lg:text-base"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @module components/Users/UserAssets
 * @description Lists the SmartPacks assigned to a given user inside a card shell.
 */
import { computed } from 'vue'

import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { SmartPackAssignedUser, SmartPackQueryParams } from '@/api/modules/smartpacks'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'UserAssets',
})

const props = withDefaults(
  defineProps<{
    userId: number
    userName: string
  }>(),
  {
    userId: 0,
    userName: '',
  },
)

const smartPacksDescription = computed(
  () => `SmartPacks assigned to ${props.userName}, with their connectivity and firmware details.`,
)

const smartPackTabs = computed<
  Array<{
    id: string
    caption: string
    label: string
    params: SmartPackQueryParams
  }>
>(() => [
  {
    id: 'all',
    caption: 'All SmartPacks',
    label: 'All',
    params: { assigned_to: props.userId },
  },
])

const smartPackHeadings = [
  {
    key: 'imei',
    label: 'IMEI',
    sortable: true,
  },
  {
    key: 'hardware_model',
    label: 'Hardware Model',
    sortable: true,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'firmware_version',
    label: 'Firmware',
    sortable: true,
  },
  {
    key: 'is_online',
    label: 'Status',
    sortable: true,
    formatter: (value: unknown) => (value ? 'Online' : 'Offline'),
    dataClass: {
      fmt: (value: unknown) => Filters.activeClass(Boolean(value)),
    },
  },
  {
    key: 'assigned_to',
    label: 'Assigned To',
    sortable: true,
    formatter: (value: unknown) => {
      const assignedUser = value as SmartPackAssignedUser | null

      return assignedUser ? assignedUser.full_name : 'Unassigned'
    },
  },
  {
    key: 'created',
    label: 'Added',
    sortable: true,
    formatter: (value: unknown) => Filters.dateTime(value as string | null | undefined),
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    action: {
      name: 'View',
      route: 'smartpack-details',
    },
  },
]
</script>
