<template>
  <TablePageLayout
    :getter="$api.users.list"
    page-description="Manage the users currently enrolled, add new teammates, keep their profiles current, and make sure everyone has the right access for their role."
    :tabs="userTabs"
    name="Users"
    :item-headings="userHeadings"
    :enable-search="true"
    nav-class="grid-cols-4 lg:text-base"
  />
</template>

<script setup lang="ts">
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { UserQueryParams } from '@/api/modules/users'
import Filters from '@/helpers/filters'

defineOptions({
  name: 'UsersTable',
})
const userTabs: Array<{
  id: string
  caption: string
  label: string
  params: UserQueryParams
}> = [
  {
    id: 'all',
    caption: 'All Users',
    label: 'All',
    params: {},
  },
  {
    id: 'customers',
    caption: 'All Customers',
    label: 'Customers',
    params: { account_type: 'customer' },
  },
  {
    id: 'internal',
    caption: 'All Internal Users',
    label: 'Internal',
    params: { account_type: 'internal' },
  },
  {
    id: 'inactive',
    caption: 'All Suspended Users',
    label: 'Suspended',
    params: { is_active: false },
  },
]

const userHeadings = [
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
    key: 'account_type',
    label: 'User Type',
    sortable: true,
    formatter: (value: unknown) => Filters.capitalize(value as string),
  },
  {
    key: 'role',
    label: 'Role',
    sortable: true,
    formatter: (value: unknown) => Filters.capitalize(value as string),
  },
  {
    key: 'created_at',
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
      route: 'user-details',
    },
  },
]
</script>
