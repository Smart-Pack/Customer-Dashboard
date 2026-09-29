import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import UserUpdateForm from '@/components/Users/UpdateForm.vue'
import CreationFormLayout, { type Adder } from '@/components/Base/CreationFormLayout.vue'
import { getUserSections } from '@/data/forms/userSections'
import type { User } from '@/api/modules/users'
import { mockUser } from '@/tests/constants'

const mockUsersEdit = vi.fn<Adder>()

const mountForm = (initialValues: User = mockUser) =>
  mount(UserUpdateForm, {
    props: {
      initialValues,
    },
    global: {
      mocks: {
        $api: {
          users: {
            edit: mockUsersEdit,
          },
        },
      },
      stubs: {
        CreationFormLayout: true,
      },
    },
  })

describe('UserUpdateForm', () => {
  describe('rendering', () => {
    it('renders a CreationFormLayout', () => {
      const wrapper = mountForm()

      expect(wrapper.findComponent(CreationFormLayout).exists()).toBe(true)
    })

    it('passes the page heading, description, and resource name through', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('pageHeading')).toBe('Update User')
      expect(layout.props('pageDescription')).toBe(
        'Review and update the user so their profile and role stay accurate.',
      )
      expect(layout.props('name')).toBe('User')
    })

    it('passes the users API edit function as the adder', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('adder')).toBe(mockUsersEdit)
    })

    it('passes the initialValues prop through to the layout', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('initialValues')).toEqual(mockUser)
    })
  })

  describe('sections', () => {
    it('passes the sections returned by getUserSections', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')).toEqual(getUserSections())
    })
  })

  describe('events', () => {
    it('emits close with the value and refresh=true when handlePageChange is triggered', async () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      await layout.vm.$emit('close', 'showDetails')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')?.[0]).toEqual(['showDetails', true])
    })
  })
})
