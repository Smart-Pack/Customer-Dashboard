import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import GroupsView from '@/views/Groups/index.vue'
import GroupsTable from '@/components/Groups/Table.vue'
import GroupCreationForm from '@/components/Groups/CreationForm.vue'

const mountGroupsView = () =>
  mount(GroupsView, {
    global: {
      stubs: {
        GroupsTable: true,
        GroupCreationForm: true,
      },
    },
  })

describe('GroupsView', () => {
  describe('rendering', () => {
    it('renders the Groups heading', () => {
      const wrapper = mountGroupsView()

      expect(wrapper.find('h2').text()).toBe('Groups')
    })

    it('renders the GroupsTable by default', () => {
      const wrapper = mountGroupsView()

      expect(wrapper.findComponent(GroupsTable).exists()).toBe(true)
      expect(wrapper.findComponent(GroupCreationForm).exists()).toBe(false)
    })

    it('renders the Add Group button by default', () => {
      const wrapper = mountGroupsView()
      const addButton = wrapper.findAll('button')[0]

      expect(addButton?.text()).toBe('Add Group')
      expect(addButton?.classes()).toContain('form-submit')
      expect(addButton?.classes()).not.toContain('hidden')
    })

    it('hides the Cancel button by default', () => {
      const wrapper = mountGroupsView()
      const cancelButton = wrapper.findAll('button')[1]

      expect(cancelButton?.text()).toBe('Cancel')
      expect(cancelButton?.classes()).toContain('hidden')
    })
  })

  describe('navigation to group creation', () => {
    it('shows the group creation form when Add Group is clicked', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')

      expect(wrapper.findComponent(GroupCreationForm).exists()).toBe(true)
      expect(wrapper.findComponent(GroupsTable).exists()).toBe(false)
    })

    it('hides the Add Group button and shows the Cancel button', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')

      const buttons = wrapper.findAll('button')
      const addButton = buttons[0]
      const cancelButton = buttons[1]

      expect(addButton?.classes()).toContain('hidden')
      expect(cancelButton?.classes()).toContain('form-submit')
      expect(cancelButton?.classes()).not.toContain('hidden')
    })
  })

  describe('navigation back to groups list', () => {
    it('shows the groups table when Cancel is clicked', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')
      await wrapper.findAll('button')[1]!.trigger('click')

      expect(wrapper.findComponent(GroupsTable).exists()).toBe(true)
      expect(wrapper.findComponent(GroupCreationForm).exists()).toBe(false)
    })

    it('shows the Add Group button and hides the Cancel button', async () => {
      const wrapper = mountGroupsView()

      await wrapper.findAll('button')[0]!.trigger('click')
      await wrapper.findAll('button')[1]!.trigger('click')

      const buttons = wrapper.findAll('button')
      const addButton = buttons[0]
      const cancelButton = buttons[1]

      expect(addButton?.classes()).toContain('form-submit')
      expect(addButton?.classes()).not.toContain('hidden')
      expect(cancelButton?.classes()).toContain('hidden')
    })
  })
})
