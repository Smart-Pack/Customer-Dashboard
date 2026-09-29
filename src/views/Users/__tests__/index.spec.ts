import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UsersView from '@/views/Users/index.vue'
import UsersTable from '@/components/Users/Table.vue'
import UserCreationForm from '@/components/Users/CreationForm.vue'

const mockAuthStore = {
  isAdmin: true,
}

vi.mock('@/stores/modules/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const mountView = () =>
  mount(UsersView, {
    global: {
      stubs: {
        UsersTable: true,
        UserCreationForm: true,
      },
    },
  })

describe('UsersView', () => {
  beforeEach(() => {
    mockAuthStore.isAdmin = true
  })

  describe('rendering', () => {
    it('renders the Users heading', () => {
      const wrapper = mountView()

      expect(wrapper.find('h2').text()).toBe('Users')
    })

    it('shows UsersTable by default', () => {
      const wrapper = mountView()

      expect(wrapper.findComponent(UsersTable).exists()).toBe(true)
      expect(wrapper.findComponent(UserCreationForm).exists()).toBe(false)
    })

    it('shows the Add User button and hides Cancel by default', () => {
      const wrapper = mountView()

      const buttons = wrapper.findAll('button')
      const addButton = buttons.find((button) => button.text() === 'Add User')
      const cancelButton = buttons.find((button) => button.text() === 'Cancel')

      expect(addButton?.classes()).toContain('form-submit')
      expect(addButton?.classes()).not.toContain('hidden')
      expect(cancelButton?.classes()).toContain('hidden')
      expect(cancelButton?.classes()).not.toContain('form-submit')
    })
  })

  describe('admin actions', () => {
    it('shows Add User for an admin', () => {
      mockAuthStore.isAdmin = true

      const wrapper = mountView()

      const addButton = wrapper.findAll('button').find((button) => button.text() === 'Add User')

      expect(addButton?.exists()).toBe(true)
    })

    it('hides Add User for a non-admin', () => {
      mockAuthStore.isAdmin = false

      const wrapper = mountView()

      const addButton = wrapper.findAll('button').find((button) => button.text() === 'Add User')

      expect(addButton).toBeUndefined()
    })
  })

  describe('navigation', () => {
    it('switches to UserCreationForm when Add User is clicked', async () => {
      const wrapper = mountView()

      const addButton = wrapper.findAll('button').find((button) => button.text() === 'Add User')
      await addButton!.trigger('click')

      expect(wrapper.findComponent(UserCreationForm).exists()).toBe(true)
      expect(wrapper.findComponent(UsersTable).exists()).toBe(false)
    })

    it('swaps button visibility after switching to addUser', async () => {
      const wrapper = mountView()

      const addButton = wrapper.findAll('button').find((button) => button.text() === 'Add User')
      await addButton!.trigger('click')

      const buttons = wrapper.findAll('button')
      const addButtonAfter = buttons.find((button) => button.text() === 'Add User')
      const cancelButtonAfter = buttons.find((button) => button.text() === 'Cancel')

      expect(addButtonAfter?.classes()).toContain('hidden')
      expect(cancelButtonAfter?.classes()).toContain('form-submit')
      expect(cancelButtonAfter?.classes()).not.toContain('hidden')
    })

    it('switches back to UsersTable when Cancel is clicked', async () => {
      const wrapper = mountView()

      const addButton = wrapper.findAll('button').find((button) => button.text() === 'Add User')
      await addButton!.trigger('click')

      const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Cancel')
      await cancelButton!.trigger('click')

      expect(wrapper.findComponent(UsersTable).exists()).toBe(true)
      expect(wrapper.findComponent(UserCreationForm).exists()).toBe(false)
    })

    it('restores Add User / Cancel button visibility after returning to showUsers', async () => {
      const wrapper = mountView()

      const addButton = wrapper.findAll('button').find((button) => button.text() === 'Add User')
      await addButton!.trigger('click')

      const cancelButton = wrapper.findAll('button').find((button) => button.text() === 'Cancel')
      await cancelButton!.trigger('click')

      const buttons = wrapper.findAll('button')
      const addButtonAfter = buttons.find((button) => button.text() === 'Add User')
      const cancelButtonAfter = buttons.find((button) => button.text() === 'Cancel')

      expect(addButtonAfter?.classes()).toContain('form-submit')
      expect(addButtonAfter?.classes()).not.toContain('hidden')
      expect(cancelButtonAfter?.classes()).toContain('hidden')
    })
  })
})
