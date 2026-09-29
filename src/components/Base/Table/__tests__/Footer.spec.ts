import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TableFooter from '@/components/Base/Table/Footer.vue'

const pagination = {
  page: 2,
  page_size: 10,
}

const mountFooter = (props = {}) =>
  mount(TableFooter, {
    props: {
      pagination,
      totalItems: 35,
      totalColumns: 5,
      ...props,
    },
    global: {
      stubs: {
        InputField: {
          props: ['modelValue', 'options', 'name'],
          emits: ['update:modelValue'],
          template: `
            <select
              :name="name"
              :value="modelValue"
              @change="$emit('update:modelValue', Number($event.target.value))"
            >
              <option
                v-for="option in options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          `,
        },
        LeftIcon: true,
        RightIcon: true,
      },
    },
  })

describe('TableFooter', () => {
  describe('rendering', () => {
    it('renders the pagination footer', () => {
      const wrapper = mountFooter()

      expect(wrapper.find('tfoot').exists()).toBe(true)
      expect(wrapper.text()).toContain('Rows per page')
      expect(wrapper.text()).toContain('Current Page')
      expect(wrapper.text()).toContain('of 4')
      expect(wrapper.text()).toContain('Previous')
      expect(wrapper.text()).toContain('Next')
    })

    it('sets the correct colspan', () => {
      const wrapper = mountFooter()

      expect(wrapper.find('td').attributes('colspan')).toBe('5')
    })

    it('renders the correct total number of pages', () => {
      const wrapper = mountFooter({
        totalItems: 35,
        pagination: {
          page: 1,
          page_size: 10,
        },
      })

      expect(wrapper.vm.totalPages).toBe(4)
    })
  })

  describe('totalPages', () => {
    it('returns one page when there are no items', () => {
      const wrapper = mountFooter({
        totalItems: 0,
      })

      expect(wrapper.vm.totalPages).toBe(1)
    })

    it('calculates the total pages using the page size', () => {
      const wrapper = mountFooter({
        totalItems: 26,
        pagination: {
          page: 1,
          page_size: 10,
        },
      })

      expect(wrapper.vm.totalPages).toBe(3)
    })

    it('returns one page when pagination is an empty string', () => {
      const wrapper = mountFooter({
        pagination: '',
        totalItems: 35,
      })

      expect(wrapper.vm.totalPages).toBe(1)
    })
  })

  describe('pageOptions', () => {
    it('generates an option for each page', () => {
      const wrapper = mountFooter({
        totalItems: 35,
        pagination: {
          page: 1,
          page_size: 10,
        },
      })

      expect(wrapper.vm.pageOptions).toEqual([
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
        { value: 4, label: '4' },
      ])
    })

    it('returns an empty array when there are no items', () => {
      const wrapper = mountFooter({
        totalItems: 0,
      })

      expect(wrapper.vm.pageOptions).toEqual([])
    })

    it('returns an empty array when pagination is an empty string', () => {
      const wrapper = mountFooter({
        pagination: '',
      })

      expect(wrapper.vm.pageOptions).toEqual([])
    })
  })

  describe('pageSizeModel', () => {
    it('returns the current page size', () => {
      const wrapper = mountFooter()

      expect(wrapper.vm.pageSizeModel).toBe(10)
    })

    it('defaults to five when pagination is empty', () => {
      const wrapper = mountFooter({
        pagination: '',
      })

      expect(wrapper.vm.pageSizeModel).toBe(5)
    })

    it('emits a page-size change', () => {
      const wrapper = mountFooter()

      wrapper.vm.pageSizeModel = 25

      expect(wrapper.emitted('pagination-change')).toContainEqual([
        {
          page_size: 25,
          page: 1,
        },
      ])
    })
  })

  describe('pageModel', () => {
    it('returns the current page', () => {
      const wrapper = mountFooter()

      expect(wrapper.vm.pageModel).toBe(2)
    })

    it('defaults to page one when pagination is empty', () => {
      const wrapper = mountFooter({
        pagination: '',
      })

      expect(wrapper.vm.pageModel).toBe(1)
    })

    it('emits a page change', () => {
      const wrapper = mountFooter()

      wrapper.vm.pageModel = 3

      expect(wrapper.emitted('pagination-change')).toContainEqual([
        {
          page: 3,
        },
      ])
    })
  })

  describe('pagination controls', () => {
    it('disables Previous on the first page', () => {
      const wrapper = mountFooter({
        pagination: {
          page: 1,
          page_size: 10,
        },
      })

      const buttons = wrapper.findAll('button')

      expect(buttons[0]!.attributes('disabled')).toBeDefined()
      expect(buttons[1]!.attributes('disabled')).toBeUndefined()
    })

    it('disables Next on the last page', () => {
      const wrapper = mountFooter({
        pagination: {
          page: 4,
          page_size: 10,
        },
        totalItems: 35,
      })

      const buttons = wrapper.findAll('button')

      expect(buttons[0]!.attributes('disabled')).toBeUndefined()
      expect(buttons[1]!.attributes('disabled')).toBeDefined()
    })

    it('emits the previous page when Previous is clicked', async () => {
      const wrapper = mountFooter({
        pagination: {
          page: 2,
          page_size: 10,
        },
      })

      await wrapper.findAll('button')[0]!.trigger('click')

      expect(wrapper.emitted('pagination-change')).toContainEqual([
        {
          page: 1,
        },
      ])
    })

    it('emits the next page when Next is clicked', async () => {
      const wrapper = mountFooter({
        pagination: {
          page: 2,
          page_size: 10,
        },
      })

      await wrapper.findAll('button')[1]!.trigger('click')

      expect(wrapper.emitted('pagination-change')).toContainEqual([
        {
          page: 3,
        },
      ])
    })
  })

  describe('handlePageChange', () => {
    it('emits pagination-change with the provided value', () => {
      const wrapper = mountFooter()

      wrapper.vm.handlePageChange({
        page: 3,
        page_size: 25,
      })

      expect(wrapper.emitted('pagination-change')).toContainEqual([
        {
          page: 3,
          page_size: 25,
        },
      ])
    })
  })
})
