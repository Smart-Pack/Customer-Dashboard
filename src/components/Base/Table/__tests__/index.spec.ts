import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BaseTable from '@/components/Base/Table/index.vue'

const headings = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' },
]

const items = [
  { id: 1, name: 'Alpha', status: 'active' },
  { id: 2, name: 'Beta', status: 'inactive' },
  { id: 3, name: 'Gamma', status: 'active' },
]

const pagination = {
  page: 1,
  page_size: 10,
}

const mountTable = (props = {}) =>
  mount(BaseTable, {
    props: {
      caption: 'Test Table',
      error: false,
      loading: false,
      headings,
      items,
      pagination,
      totalItems: items.length,
      ...props,
    },
    global: {
      stubs: {
        TableHeader: true,
        TableBody: true,
        TableFooter: true,
      },
    },
  })

describe('BaseTable', () => {
  describe('rendering', () => {
    it('renders the caption when provided', () => {
      const wrapper = mountTable()

      expect(wrapper.find('caption').text()).toBe('Test Table')
    })

    it('does not render the caption when set to "None"', () => {
      const wrapper = mountTable({ caption: 'None' })

      expect(wrapper.find('caption').exists()).toBe(false)
    })

    it('renders the footer when pagination is provided', () => {
      const wrapper = mountTable()

      expect(wrapper.findComponent({ name: 'TableFooter' }).exists()).toBe(true)
    })

    it('hides the footer when pagination is an empty string', () => {
      const wrapper = mountTable({ pagination: '' })

      expect(wrapper.findComponent({ name: 'TableFooter' }).exists()).toBe(false)
    })
  })

  describe('activePagination', () => {
    it('returns the pagination prop in default mode', () => {
      const wrapper = mountTable({ currentMode: 0 })

      expect(wrapper.vm.activePagination).toEqual(pagination)
    })

    it('returns the local searchPageParams in search mode', () => {
      const wrapper = mountTable({ currentMode: 1 })

      expect(wrapper.vm.activePagination).toEqual({
        page: 1,
        page_size: pagination.page_size,
      })
    })

    it('returns the local searchPageParams when enableClientPagination is true, even in default mode', () => {
      const wrapper = mountTable({ currentMode: 0, enableClientPagination: true })

      expect(wrapper.vm.activePagination).toEqual({
        page: 1,
        page_size: pagination.page_size,
      })
    })
  })

  describe('activeTotalItems', () => {
    it('returns the totalItems prop in default mode', () => {
      const wrapper = mountTable({ currentMode: 0, totalItems: 35 })

      expect(wrapper.vm.activeTotalItems).toBe(35)
    })

    it('returns the sortedItems length in search mode', () => {
      const wrapper = mountTable({ currentMode: 2 })

      wrapper.vm.handleSortChange(items)

      expect(wrapper.vm.activeTotalItems).toBe(items.length)
    })
  })

  describe('activeSortedItems', () => {
    it('returns sortedItems directly in default mode', () => {
      const wrapper = mountTable({ currentMode: 0 })

      wrapper.vm.handleSortChange(items)

      expect(wrapper.vm.activeSortedItems).toEqual(items)
    })

    it('returns a paginated slice in search mode', () => {
      const wrapper = mountTable({
        currentMode: 2,
        pagination: { page: 1, page_size: 2 },
      })

      wrapper.vm.handleSortChange(items)
      wrapper.vm.handlePageChange({ page: 2 })

      expect(wrapper.vm.activeSortedItems).toEqual([items[2]])
    })
  })

  describe('handlePageChange', () => {
    it('emits pagination-change with the provided value', () => {
      const wrapper = mountTable()

      wrapper.vm.handlePageChange({ page: 2 })

      expect(wrapper.emitted('pagination-change')).toContainEqual([{ page: 2 }])
    })

    it('updates the local searchPageParams in search mode', () => {
      const wrapper = mountTable({ currentMode: 1 })

      wrapper.vm.handlePageChange({ page: 3 })

      expect(wrapper.vm.activePagination).toEqual({
        page: 3,
        page_size: pagination.page_size,
      })
    })

    it('does not update local searchPageParams in default mode without client pagination', () => {
      const wrapper = mountTable({ currentMode: 0 })

      wrapper.vm.handlePageChange({ page: 3 })

      expect(wrapper.vm.activePagination).toEqual(pagination)
    })

    it('updates local searchPageParams in default mode when enableClientPagination is true', () => {
      const wrapper = mountTable({ currentMode: 0, enableClientPagination: true })

      wrapper.vm.handlePageChange({ page: 3 })

      expect(wrapper.vm.activePagination).toEqual({
        page: 3,
        page_size: pagination.page_size,
      })
    })
  })

  describe('handleSortChange', () => {
    it('sets sortedItems', () => {
      const wrapper = mountTable()

      wrapper.vm.handleSortChange(items)

      expect(wrapper.vm.activeSortedItems).toEqual(items)
    })

    it('resets the page to 1 in search mode', () => {
      const wrapper = mountTable({ currentMode: 2 })

      wrapper.vm.handlePageChange({ page: 3 })
      wrapper.vm.handleSortChange(items)

      expect(wrapper.vm.activePagination).toEqual(expect.objectContaining({ page: 1 }))
    })

    it('does not reset the page in default mode without client pagination', () => {
      const wrapper = mountTable({ currentMode: 0 })

      wrapper.vm.handleSortChange(items)

      expect(wrapper.vm.activePagination).toEqual(pagination)
    })
  })

  describe('handleSearchMode', () => {
    it('emits change-search-mode with the new mode', () => {
      const wrapper = mountTable()

      wrapper.vm.handleSearchMode(1)

      expect(wrapper.emitted('change-search-mode')).toContainEqual([1])
    })

    it('resets searchPageParams when entering a non-default mode', () => {
      const wrapper = mountTable({ currentMode: 1 })

      wrapper.vm.handlePageChange({ page: 3 })
      wrapper.vm.handleSearchMode(1)

      expect(wrapper.vm.activePagination).toEqual({
        page: 1,
        page_size: pagination.page_size,
      })
    })

    it('does not reset searchPageParams when returning to default mode without client pagination', () => {
      const wrapper = mountTable({ currentMode: 0 })

      wrapper.vm.handleSearchMode(0)

      expect(wrapper.vm.activePagination).toEqual(pagination)
    })
  })

  describe('handleSelectionChange', () => {
    it('adds an id to the selection', () => {
      const wrapper = mountTable()

      wrapper.vm.handleSelectionChange(1)

      expect(wrapper.emitted('selection-change')![0]).toEqual([[items[0]]])
    })

    it('removes an id already in the selection', () => {
      const wrapper = mountTable()

      wrapper.vm.handleSelectionChange(1)
      wrapper.vm.handleSelectionChange(1)

      expect(wrapper.emitted('selection-change')![1]).toEqual([[]])
    })

    it('replaces the selection with all ids when selectAll is true', () => {
      const wrapper = mountTable()

      wrapper.vm.handleSelectionChange([1, 2, 3], true)

      expect(wrapper.emitted('selection-change')![0]).toEqual([items])
    })

    it('keeps only a single id selected when selectionType is radio', () => {
      const wrapper = mountTable({ selectionType: 'radio' })

      wrapper.vm.handleSelectionChange(1)
      wrapper.vm.handleSelectionChange(2)

      expect(wrapper.emitted('selection-change')![1]).toEqual([[items[1]]])
    })
  })
})
