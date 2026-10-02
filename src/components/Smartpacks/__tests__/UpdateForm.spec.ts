import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SmartPackUpdateForm from '@/components/Smartpacks/UpdateForm.vue'
import CreationFormLayout, { type Adder } from '@/components/Base/CreationFormLayout.vue'
import type { SmartPack } from '@/api/modules/smartpacks'
import { mockSmartPack } from '@/tests/constants'

const mockSmartPacksEdit = vi.fn<Adder>()

const mountForm = (initialValues: SmartPack = mockSmartPack) =>
  mount(SmartPackUpdateForm, {
    props: {
      initialValues,
    },
    global: {
      mocks: {
        $api: {
          smartpacks: {
            edit: mockSmartPacksEdit,
          },
        },
      },
      stubs: {
        CreationFormLayout: true,
      },
    },
  })

describe('SmartPackUpdateForm', () => {
  describe('rendering', () => {
    it('renders a CreationFormLayout', () => {
      const wrapper = mountForm()

      expect(wrapper.findComponent(CreationFormLayout).exists()).toBe(true)
    })

    it('passes the page description and resource name through', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('pageHeading')).toBe('')
      expect(layout.props('pageDescription')).toBe('Enter the child name to assign this SmartPack.')
      expect(layout.props('name')).toBe('SmartPack')
    })

    it('passes the SmartPacks API edit function as the adder', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('adder')).toBe(mockSmartPacksEdit)
    })

    it('passes the initial SmartPack values to the layout', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('initialValues')).toEqual({
        id: mockSmartPack.id,
        child_name: mockSmartPack.child_name,
      })
    })
  })

  describe('sections', () => {
    it('configures the child name field', () => {
      const wrapper = mountForm()
      const layout = wrapper.findComponent(CreationFormLayout)

      expect(layout.props('sections')).toEqual([
        {
          title: '',
          fields: [
            {
              name: 'child_name',
              label: 'Child Name',
              errorName: 'Child name',
              placeholder: 'Enter Child Name',
              specificType: 'fname',
              rules: 'max:100',
              icon: expect.anything(),
            },
          ],
        },
      ])
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
