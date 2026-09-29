import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mockUser } from '@/tests/constants'

import AssignUser from '@/components/Smartpacks/AssignUser.vue'
import TablePageLayout from '@/components/Base/TablePageLayout.vue'
import type { User } from '@/api/modules/users'

const mountAssignUser = (props: { submitting: boolean } = { submitting: false }) =>
  mount(AssignUser, {
    props,
    global: {
      mocks: {
        $api: {
          users: {
            list: () => Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
          },
        },
      },
      stubs: {
        TablePageLayout: true,
      },
    },
  })

const selectUser = async (wrapper: ReturnType<typeof mountAssignUser>, users: User[]) => {
  const layout = wrapper.findComponent(TablePageLayout)
  layout.vm.$emit('selection-change', users)
  await wrapper.vm.$nextTick()
}

describe('AssignUser', () => {
  describe('rendering', () => {
    it('renders a TablePageLayout', () => {
      const wrapper = mountAssignUser()

      expect(wrapper.findComponent(TablePageLayout).exists()).toBe(true)
    })

    it('passes the users API getter, name, and nav class through', () => {
      const wrapper = mountAssignUser()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('name')).toBe('Users')
      expect(layout.props('navClass')).toBe('hidden')
      expect(layout.props('enableSearch')).toBe(true)
    })

    it('passes radio selection extra props', () => {
      const wrapper = mountAssignUser()
      const layout = wrapper.findComponent(TablePageLayout)

      expect(layout.props('extraProps')).toEqual({
        'selection-type': 'radio',
        'selection-name': 'assignUser',
      })
    })
  })

  describe('userTabs', () => {
    it('passes a single all tab scoped to active customers', () => {
      const wrapper = mountAssignUser()
      const layout = wrapper.findComponent(TablePageLayout)
      const tabs = layout.props('tabs') as Array<{
        id: string
        label: string
        params: Record<string, unknown>
      }>

      expect(tabs).toHaveLength(1)
      expect(tabs[0]?.id).toBe('all')
      expect(tabs[0]?.label).toBe('All')
      expect(tabs[0]?.params).toEqual({ account_type: 'customer', is_active: true })
    })
  })

  describe('userHeadings', () => {
    it('passes six column headings led by a selection column', () => {
      const wrapper = mountAssignUser()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{ key: string }>

      expect(headings).toHaveLength(6)
      expect(headings.map((heading) => heading.key)).toEqual([
        'selection',
        'first_name',
        'last_name',
        'email',
        'phone',
        'created_at',
      ])
    })

    it('formats created_at using Filters.dateTime', () => {
      const wrapper = mountAssignUser()
      const layout = wrapper.findComponent(TablePageLayout)
      const headings = layout.props('itemHeadings') as Array<{
        key: string
        formatter?: (value: unknown) => unknown
      }>

      const createdAt = headings.find((heading) => heading.key === 'created_at')

      expect(createdAt?.formatter?.('2026-09-23T14:30:00Z')).toEqual(expect.any(String))
      expect(createdAt?.formatter?.(null)).toBe('')
    })
  })

  describe('assign button state', () => {
    it('is disabled when no user is selected', () => {
      const wrapper = mountAssignUser()
      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })

    it('is enabled once a user is selected', async () => {
      const wrapper = mountAssignUser()

      await selectUser(wrapper, [mockUser])

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeUndefined()
    })

    it('is disabled while submitting, even with a user selected', async () => {
      const wrapper = mountAssignUser({ submitting: true })

      await selectUser(wrapper, [mockUser])

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('selection-change handling', () => {
    it('sets the selected user to the first emitted user', async () => {
      const wrapper = mountAssignUser()

      await selectUser(wrapper, [mockUser])

      const assignButton = wrapper.find('button.form-submit-secondary')
      await assignButton.trigger('click')

      expect(wrapper.emitted('assign')?.[0]).toEqual([mockUser])
    })

    it('resets to an empty selection when emitted with no users', async () => {
      const wrapper = mountAssignUser()

      await selectUser(wrapper, [mockUser])
      await selectUser(wrapper, [])

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('handleClose', () => {
    it('emits close with false', async () => {
      const wrapper = mountAssignUser()

      await wrapper.find('button.form-submit').trigger('click')

      expect(wrapper.emitted('close')?.[0]).toEqual([false])
    })

    it('resets the selected user, disabling the assign button', async () => {
      const wrapper = mountAssignUser()

      await selectUser(wrapper, [mockUser])
      await wrapper.find('button.form-submit').trigger('click')

      const assignButton = wrapper.find('button.form-submit-secondary')

      expect(assignButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('handleAssign', () => {
    it('does not emit assign when no user is selected', async () => {
      const wrapper = mountAssignUser()

      const assignButton = wrapper.find('button.form-submit-secondary')
      await assignButton.trigger('click')

      expect(wrapper.emitted('assign')).toBeUndefined()
    })

    it('emits assign with the selected user', async () => {
      const wrapper = mountAssignUser()

      await selectUser(wrapper, [mockUser])

      const assignButton = wrapper.find('button.form-submit-secondary')
      await assignButton.trigger('click')

      expect(wrapper.emitted('assign')).toEqual([[mockUser]])
    })
  })
})
