<template>
  <div class="main-card w-full">
    <header class="flex gap-3 items-center justify-between p-4">
      <h3 class="sub-heading text-xl text-left">Assets</h3>

      <!-- Show SmartPacks -->
      <button
        v-if="activePage === 'users'"
        type="button"
        class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
        @click="activePage = 'smartpacks'"
      >
        Show SmartPacks
      </button>

      <!-- Show Users -->
      <button
        v-else
        type="button"
        class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
        @click="activePage = 'users'"
      >
        Show Users
      </button>
    </header>

    <!-- Group Users -->
    <TablePageLayout
      v-if="activePage === 'users' && groupId !== 0"
      :getter="$api.groupMembers.list"
      :page-description="usersDescription"
      :tabs="userTabs"
      name="Users"
      :item-headings="userHeadings"
      :enable-search="true"
      :refresh-key="refreshKey"
      nav-class="grid-cols-3 lg:text-base"
    />

    <!-- Group SmartPacks -->
    <TablePageLayout
      v-else-if="activePage === 'smartpacks' && groupId !== 0"
      :getter="$api.smartpacks.list"
      :page-description="smartPacksDescription"
      :tabs="smartPackTabs"
      name="SmartPacks"
      :item-headings="smartPackHeadings"
      :enable-search="true"
      :refresh-key="refreshKey"
      nav-class="grid-cols-1 lg:text-base"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * @module components/Groups/Assets
 * @description Displays a group's members and SmartPacks, allowing users to switch between the two tables.
 */
import { computed } from 'vue'

import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { GroupMemberQueryParams } from '@/api/modules/groupMembers'
import type { SmartPackQueryParams } from '@/api/modules/smartpacks'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'GroupAssets',
})

const props = withDefaults(
  defineProps<{
    groupId: number
    groupName: string
    refreshKey?: string | number | null
  }>(),
  {
    groupId: 0,
    groupName: '',
    refreshKey: null,
  },
)

/**
 * Controls which asset table is currently visible.
 * The group members table is shown by default.
 */
const activePage = defineModel<'users' | 'smartpacks'>('activePage', {
  default: 'users',
})

const usersDescription = computed(
  () => `Members of ${props.groupName}, including their contact details and group roles.`,
)

const smartPacksDescription = computed(
  () => `SmartPacks assigned to ${props.groupName}, with their connectivity and firmware details.`,
)

/**
 * Tabs for the group members table.
 *
 * Every tab filters by the current group ID.
 * The All tab includes every role; Admins and Members filter by role.
 */
const userTabs = computed<
  Array<{
    id: string
    caption: string
    label: string
    params: GroupMemberQueryParams
  }>
>(() => [
  {
    id: 'all',
    caption: 'All Group Members',
    label: 'All',
    params: {
      group: props.groupId,
    },
  },
  {
    id: 'admins',
    caption: 'Group Admins',
    label: 'Admins',
    params: {
      group: props.groupId,
      has_admin_access: true,
    },
  },
  {
    id: 'members',
    caption: 'Regular Group Members',
    label: 'Members',
    params: {
      group: props.groupId,
      role: 'member',
    },
  },
])

/**
 * Tabs for the group SmartPacks table.
 *
 * The group filter ensures that only SmartPacks associated with
 * the current group are displayed.
 */
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
    caption: 'All Group SmartPacks',
    label: 'All',
    params: {
      group: props.groupId,
    },
  },
])

/**
 * Column configuration for the group members table.
 *
 * The API returns user details nested inside the `user` object.
 * This uses nested keys, assuming TablePageLayout supports dot notation.
 */
const userHeadings = [
  {
    key: 'user.full_name',
    label: 'Full Name',
    sortable: false,
    dataClass: 'primary-text font-bold',
  },
  {
    key: 'user.email',
    label: 'Email',
    sortable: false,
  },
  {
    key: 'user.phone',
    label: 'Phone',
    sortable: false,
  },
  {
    key: 'role',
    label: 'Group Role',
    sortable: true,
    formatter: (value: unknown) => Filters.capitalize(String(value ?? '')),
  },
  {
    key: 'created',
    label: 'Date Added',
    sortable: true,
    formatter: (value: unknown) => Filters.dateTime(value as string | null | undefined),
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    action: {
      name: 'View',
      route: 'user-details',
      idKey: 'user.id',
    },
  },
]

/**
 * Column configuration for the group SmartPacks table.
 */
const smartPackHeadings = [
  {
    key: 'imei',
    label: 'IMEI',
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
    key: 'child_name',
    label: 'Child',
    sortable: true,
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
