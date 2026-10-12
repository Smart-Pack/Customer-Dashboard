import { markRaw } from 'vue'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'

/**
 * @module forms/groupSections
 * @description Exports a function that returns a standardized configuration
 * for rendering Group creation and update forms. Centralizing the form
 * configuration ensures consistent field definitions and layout.
 */

/**
 * Returns the sections and fields for the Group forms.
 *
 * @returns A configuration array for use with `CreationFormLayout`.
 */
export function getGroupSections() {
  return [
    {
      title: 'Group Details',
      fields: [
        {
          name: 'name',
          label: 'Group Name',
          placeholder: 'Enter group name',
          specificType: 'text',
          icon: markRaw(UserGroupIcon),
          rules: 'required|min:3|max:100',
          autofocus: true,
        },
      ],
    },
  ]
}
