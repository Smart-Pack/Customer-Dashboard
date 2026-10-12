import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import GroupUpdateForm from '@/components/Groups/UpdateForm.vue'
import CreationFormLayout from '@/components/Base/CreationFormLayout.vue'
import { getGroupSections } from '@/data/forms/groupSections'
import type { GroupDetail } from '@/api/modules/groups'
import { mockGroupDetail } from '@/tests/constants'
import { groups } from '@/api/modules'

const mockGroupsEdit = vi.fn<typeof groups.edit>()

const mountGroupUpdateForm = (initialValues: GroupDetail = mockGroupDetail) => {
  return mount(GroupUpdateForm, {
    props: {
      initialValues,
    },
    global: {
      mocks: {
        $api: {
          groups: {
            edit: mockGroupsEdit,
          },
        },
      },
      stubs: {
        CreationFormLayout: true,
      },
    },
  })
}

describe('GroupUpdateForm', () => {
  describe('rendering', () => {
    it('renders a CreationFormLayout', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).exists()).toBe(true)
    })

    it('passes the page heading', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).props('pageHeading')).toBe('Update Group')
    })

    it('passes the page description', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).props('pageDescription')).toBe(
        'Review and update the group details to keep its information accurate.',
      )
    })

    it('passes the form name', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).props('name')).toBe('Group')
    })

    it('passes the group edit API function as the adder', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).props('adder')).toBe(mockGroupsEdit)
    })

    it('passes the initial group values to the form layout', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).props('initialValues')).toEqual(
        mockGroupDetail,
      )
    })

    it('passes the configured group form sections', () => {
      const wrapper = mountGroupUpdateForm()

      expect(wrapper.findComponent(CreationFormLayout).props('sections')).toEqual(
        getGroupSections(),
      )
    })
  })

  describe('initial values', () => {
    it('passes different initial group values when provided', () => {
      const group: GroupDetail = {
        ...mockGroupDetail,
        id: 2,
        name: 'Another Group',
      }

      const wrapper = mountGroupUpdateForm(group)

      expect(wrapper.findComponent(CreationFormLayout).props('initialValues')).toEqual(group)
    })
  })

  describe('close event', () => {
    it('emits close with the requested page and refresh flag', async () => {
      const wrapper = mountGroupUpdateForm()
      const layout = wrapper.findComponent(CreationFormLayout)
      const page = 'group-details'

      layout.vm.$emit('close', page)

      expect(wrapper.emitted('close')).toEqual([[page, true]])
    })

    it('emits close with true as the refresh flag for a null page value', () => {
      const wrapper = mountGroupUpdateForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      layout.vm.$emit('close', null)

      expect(wrapper.emitted('close')).toEqual([[null, true]])
    })
  })
})
