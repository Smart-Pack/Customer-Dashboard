import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AssignGroup from '@/components/Smartpacks/AssignGroup.vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { Group } from '@/api/modules/groups'

const mockGroup: Group = {
  id: 1,
  name: 'Test Group',
  total_users: 3,
  total_smartpacks: 2,
  created: '2026-09-23T14:30:00Z',
} as Group

const mountAssignGroup = (props: { submitting: boolean } = { submitting: false }) =>
  mount(AssignGroup, {
    props,
    global: {
      mocks: {
        $api: {
          groups: {
            list: () => Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
          },
        },
      },
      stubs: {
        TablePageLayout: true,
      },
    },
  })

const selectGroup = async (wrapper: ReturnType<typeof mountAssignGroup>, groups: Group[]) => {
  const layout = wrapper.findComponent(TablePageLayout)
  layout.vm.$emit('selection-change', groups)
  await wrapper.vm.$nextTick()
}

describe('AssignGroup', () => {
  describe('rendering', () => {
    it('renders a TablePageLayout', () => {
      const wrapper = mountAssignGroup()

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(true)
    })

    it('passes the groups API getter, name, and navigation class through', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('getter')).toBeDefined()
      expect(layout.props('name')).toBe('Groups')
      expect(layout.props('navClass')).toBe('hidden')
      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes radio selection extra props', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('extraProps')).toEqual({
        'selection-type': 'radio',
        'selection-name': 'assignGroup',
      })
    })

    it('renders the Cancel and Assign Group buttons', () => {
      const wrapper = mountAssignGroup()
      const buttons = wrapper.findAll('button')

      expect(buttons).toHaveLength(2)
      expect(buttons[0]?.text()).toBe('Cancel')
      expect(buttons[1]?.text()).toBe('Assign Group')
    })
  })

  describe('groupTabs', () => {
    it('passes a single tab restricted to groups with admin access', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        caption: string
        label: string
        params: Record<string, unknown>
      }>

      expect(tabs).toHaveLength(1)
      expect(tabs[0]?.id).toBe('admin-access')
      expect(tabs[0]?.caption).toBe('Assign Group')
      expect(tabs[0]?.label).toBe('Groups')
      expect(tabs[0]?.params).toEqual({ has_admin_access: true })
    })
  })

  describe('groupHeadings', () => {
    it('passes five column headings led by a selection column', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string }>

      expect(headings).toHaveLength(5)
      expect(headings.map((heading) => heading.key)).toEqual([
        'selection',
        'name',
        'total_users',
        'total_smartpacks',
        'created',
      ])
    })

    it('marks the selection column as non-sortable', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        sortable: boolean
      }>

      const selection = headings.find((heading) => heading.key === 'selection')

      expect(selection?.sortable).toBe(false)
    })

    it('makes the group name, user count, and SmartPack count sortable', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        sortable: boolean
      }>

      expect(headings.find((heading) => heading.key === 'name')?.sortable).toBe(true)
      expect(headings.find((heading) => heading.key === 'total_users')?.sortable).toBe(true)
      expect(headings.find((heading) => heading.key === 'total_smartpacks')?.sortable).toBe(true)
    })

    it('formats the created date using Filters.dateTime', () => {
      const wrapper = mountAssignGroup()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const created = headings.find((heading) => heading.key === 'created')

      expect(created?.formatter?.('2026-09-23T14:30:00Z')).toEqual(expect.any(String))
      expect(created?.formatter?.(null)).toBe('')
    })
  })

  describe('assign button state', () => {
    it('is disabled when no group is selected', () => {
      const wrapper = mountAssignGroup()
      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })

    it('is enabled once a group is selected', async () => {
      const wrapper = mountAssignGroup()

      await selectGroup(wrapper, [mockGroup])

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeUndefined()
    })

    it('is disabled while submitting, even with a group selected', async () => {
      const wrapper = mountAssignGroup({ submitting: true })

      await selectGroup(wrapper, [mockGroup])

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('selection-change handling', () => {
    it('selects the first emitted group', async () => {
      const wrapper = mountAssignGroup()
      const secondGroup = {
        ...mockGroup,
        id: 2,
        name: 'Second Group',
      }

      await selectGroup(wrapper, [mockGroup, secondGroup])
      await wrapper.find('button.form-submit-secondary').trigger('click')

      expect(wrapper.emitted('assign')?.[0]).toEqual([mockGroup])
    })

    it('resets the selection when emitted with no groups', async () => {
      const wrapper = mountAssignGroup()

      await selectGroup(wrapper, [mockGroup])
      await selectGroup(wrapper, [])

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('handleClose', () => {
    it('emits close with false', async () => {
      const wrapper = mountAssignGroup()

      await wrapper.find('button.form-submit').trigger('click')

      expect(wrapper.emitted('close')?.[0]).toEqual([false])
    })

    it('resets the selected group and disables the Assign Group button', async () => {
      const wrapper = mountAssignGroup()

      await selectGroup(wrapper, [mockGroup])
      await wrapper.find('button.form-submit').trigger('click')

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('handleAssign', () => {
    it('does not emit assign when no group is selected', async () => {
      const wrapper = mountAssignGroup()

      await wrapper.find('button.form-submit-secondary').trigger('click')

      expect(wrapper.emitted('assign')).toBeUndefined()
    })

    it('emits assign with the selected group', async () => {
      const wrapper = mountAssignGroup()

      await selectGroup(wrapper, [mockGroup])
      await wrapper.find('button.form-submit-secondary').trigger('click')

      expect(wrapper.emitted('assign')).toEqual([[mockGroup]])
    })
  })
})
