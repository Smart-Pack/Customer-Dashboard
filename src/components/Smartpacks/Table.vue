<template>
  <TablePageLayout
    :getter="$api.smartpacks.list"
    page-description="Manage registered SmartPacks, monitor their connectivity, and keep track of customer assignments."
    :tabs="smartPackTabs"
    name="SmartPacks"
    :item-headings="smartPackHeadings"
    :enable-search="true"
    nav-class="grid-cols-3 lg:text-base"
  />
</template>

<script setup lang="ts">
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { SmartPackAssignedUser, SmartPackQueryParams } from '@/api/modules/smartpacks'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'SmartPacksTable',
})

const smartPackTabs: Array<{
  id: string
  caption: string
  label: string
  params: SmartPackQueryParams
}> = [
  {
    id: 'all',
    caption: 'All SmartPacks',
    label: 'All',
    params: {},
  },
  {
    id: 'assigned',
    caption: 'Assigned SmartPacks',
    label: 'Assigned',
    params: {
      is_assigned: true,
    },
  },
  {
    id: 'unassigned',
    caption: 'Unassigned SmartPacks',
    label: 'Unassigned',
    params: {
      is_assigned: false,
    },
  },
]

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
