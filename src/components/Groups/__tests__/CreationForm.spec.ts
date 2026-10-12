import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { groups } from '@/api/modules'
import CreationForm from '@/components/Groups/CreationForm.vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import { getGroupSections } from '@/data/forms/groupSections'
import UserGroupIcon from '@/components/Icons/UserGroupIcon.vue'

describe('GroupCreationForm', () => {
  const mockAddGroup = vi.fn<typeof groups.add>()

  const mountCreationForm = () =>
    mount(CreationForm, {
      global: {
        mocks: {
          $api: {
            groups: {
              add: mockAddGroup,
            },
          },
        },
        stubs: {
          CreationFormLayout: true,
        },
      },
    })

  describe('rendering', () => {
    it('renders a CreationFormLayout', () => {
      const wrapper = mountCreationForm()

      expect(wrapper.findComponent(CreationFormLayout).exists()).toBe(true)
    })

    it('passes the page heading', () => {
      const wrapper = mountCreationForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('pageHeading')).toBe('Add Group')
    })

    it('passes the page description', () => {
      const wrapper = mountCreationForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('pageDescription')).toBe(
        'Create a group to organize members and manage their assigned SmartPacks.',
      )
    })

    it('passes the form name', () => {
      const wrapper = mountCreationForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('name')).toBe('Group')
    })

    it('passes the group details route', () => {
      const wrapper = mountCreationForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('detailsPage')).toBe('group-details')
    })

    it('passes the group creation API function as the adder', () => {
      const wrapper = mountCreationForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('adder')).toBe(mockAddGroup)
    })

    it('passes the configured group form sections', () => {
      const wrapper = mountCreationForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')).toEqual(getGroupSections())
    })
  })

  describe('group form sections', () => {
    it('returns one section titled Group Details', () => {
      const sections = getGroupSections()

      expect(sections).toHaveLength(1)
      expect(sections[0]?.title).toBe('Group Details')
    })

    it('defines a single Group Name field', () => {
      const sections = getGroupSections()
      const fields = sections[0]?.fields

      expect(fields).toHaveLength(1)
      expect(fields?.[0]?.name).toBe('name')
      expect(fields?.[0]?.label).toBe('Group Name')
    })

    it('configures the group name field as a required text input', () => {
      const sections = getGroupSections()
      const field = sections[0]?.fields[0]

      expect(field?.specificType).toBe('text')
      expect(field?.rules).toBe('required|min:3|max:100')
    })

    it('provides the group name placeholder', () => {
      const sections = getGroupSections()
      const field = sections[0]?.fields[0]

      expect(field?.placeholder).toBe('Enter group name')
    })

    it('sets autofocus on the group name field', () => {
      const sections = getGroupSections()
      const field = sections[0]?.fields[0]

      expect(field?.autofocus).toBe(true)
    })

    it('uses the UserGroupIcon for the group name field', () => {
      const sections = getGroupSections()
      const field = sections[0]?.fields[0]

      expect(field?.icon).toBe(UserGroupIcon)
    })
  })
})
