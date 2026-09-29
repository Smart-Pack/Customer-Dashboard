import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import TablePageLayout, {
  type GetterResponse,
  type Getter,
} from '@/components/Base/TablePageLayout.vue'

const itemHeadings = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' },
]

const tabs = [
  { id: 'all', caption: 'All Partners', label: 'All', params: {} },
  { id: 'active', caption: 'Active Partners', label: 'Active', params: { status: 'active' } },
]

const results = [
  { id: 1, name: 'Alpha', status: 'active' },
  { id: 2, name: 'Beta', status: 'inactive' },
]

const makeGetter = (response: GetterResponse = { count: 2, results }) =>
  vi.fn<Getter>().mockResolvedValue(response)

const mountLayout = (props = {}, getter = makeGetter()) =>
  mount(TablePageLayout, {
    props: {
      tabs,
      name: 'Partners',
      itemHeadings,
      getter,
      ...props,
    },
    global: {
      mocks: {
        $notifyError: vi.fn<() => Promise<void>>(),
      },
      stubs: {
        BaseTable: true,
      },
    },
  })

describe('TablePageLayout', () => {
  describe('rendering', () => {
    it('renders the page description when provided', () => {
      const wrapper = mountLayout({ pageDescription: 'Manage your partners here.' })

      expect(wrapper.text()).toContain('Manage your partners here.')
    })

    it('does not render a description when none is provided', () => {
      const wrapper = mountLayout()

      expect(wrapper.find('p').exists()).toBe(false)
    })

    it('renders a button for each tab', () => {
      const wrapper = mountLayout()

      const buttons = wrapper.findAll('button')

      expect(buttons).toHaveLength(tabs.length)
      expect(buttons[0]!.text()).toBe('All')
      expect(buttons[1]!.text()).toBe('Active')
    })

    it('applies the default grid class when navClass is not provided', () => {
      const wrapper = mountLayout()

      expect(wrapper.find('nav').classes()).toContain('grid-cols-3')
    })

    it('applies a custom nav class when provided', () => {
      const wrapper = mountLayout({ navClass: 'grid-cols-4' })

      expect(wrapper.find('nav').classes()).toContain('grid-cols-4')
      expect(wrapper.find('nav').classes()).not.toContain('grid-cols-3')
    })
  })

  describe('mounted', () => {
    it('fetches items on mount', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)

      await flushPromises()

      expect(getter).toHaveBeenCalledWith({ page: 1, page_size: 5 })
      expect(wrapper.vm.items).toEqual(results)
      expect(wrapper.vm.totalItems).toBe(2)
      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.vm.error).toBe(false)
    })

    it('sets error state and notifies when the getter fails', async () => {
      const getter = vi.fn<Getter>().mockRejectedValue(new Error('Network error'))
      const wrapper = mountLayout({}, getter)

      await flushPromises()

      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('handles a plain array response (no count/results envelope)', async () => {
      const getter = makeGetter(results)
      const wrapper = mountLayout({}, getter)

      await flushPromises()

      expect(wrapper.vm.items).toEqual(results)
      expect(wrapper.vm.allItems).toEqual(results)
    })
  })

  describe('activeCaption', () => {
    it("returns the active tab's caption", () => {
      const wrapper = mountLayout()

      expect(wrapper.vm.activeCaption).toBe('All Partners')
    })

    it('falls back to "None" when the tab has no caption', () => {
      const wrapper = mountLayout({
        tabs: [{ id: 'all', label: 'All', params: {} }],
      })

      expect(wrapper.vm.activeCaption).toBe('None')
    })
  })

  describe('activeParams', () => {
    it("returns the active tab's params", () => {
      const wrapper = mountLayout()

      expect(wrapper.vm.activeParams).toEqual({})
    })

    it('returns the params for a non-default active tab', async () => {
      const wrapper = mountLayout()

      wrapper.vm.activeTab = 1
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.activeParams).toEqual({ status: 'active' })
    })
  })

  describe('handleSetActiveTab', () => {
    it('switches the active tab and resets pagination', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      await wrapper.vm.handleSetActiveTab(1)
      await flushPromises()

      expect(wrapper.vm.activeTab).toBe(1)
      expect(wrapper.vm.pageParams).toEqual({ page: 1, page_size: 5 })
      expect(getter).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 5,
        status: 'active',
      })
    })

    it('resets search mode and allItems when switching tabs', async () => {
      const wrapper = mountLayout()
      await flushPromises()

      wrapper.vm.currentMode = 2
      wrapper.vm.allItems = results

      await wrapper.vm.handleSetActiveTab(1)
      await flushPromises()

      expect(wrapper.vm.currentMode).toBe(0)
      expect(wrapper.vm.allItems).toEqual([])
    })
  })

  describe('handlePaginationChange', () => {
    it('updates pageParams and refetches in default mode', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      await wrapper.vm.handlePaginationChange({ page: 2 })

      expect(wrapper.vm.pageParams).toEqual({ page: 2, page_size: 5 })
      expect(getter).toHaveBeenLastCalledWith({ page: 2, page_size: 5 })
    })

    it('does nothing when enableClientPagination is true', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({ enableClientPagination: true }, getter)
      await flushPromises()
      getter.mockClear()

      await wrapper.vm.handlePaginationChange({ page: 2 })

      expect(getter).not.toHaveBeenCalled()
      expect(wrapper.vm.pageParams).toEqual({ page: 1, page_size: 5 })
    })

    it('fetches items in search-prep mode when allItems is empty', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      wrapper.vm.currentMode = 1
      wrapper.vm.allItems = []
      getter.mockClear()

      await wrapper.vm.handlePaginationChange({})

      expect(getter).toHaveBeenCalledTimes(1)
    })

    it('does not refetch in search-prep mode when allItems already has data', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      wrapper.vm.currentMode = 1
      wrapper.vm.allItems = results
      getter.mockClear()

      await wrapper.vm.handlePaginationChange({})

      expect(getter).not.toHaveBeenCalled()
    })

    it('does not fetch in active-search mode (2)', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      wrapper.vm.currentMode = 2
      getter.mockClear()

      await wrapper.vm.handlePaginationChange({ page: 3 })

      expect(getter).not.toHaveBeenCalled()
    })
  })

  describe('handleSearchMode', () => {
    it('sets currentMode and fetches all items when entering search-prep mode', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()
      getter.mockClear()

      await wrapper.vm.handleSearchMode(1)

      expect(wrapper.vm.currentMode).toBe(1)
      expect(getter).toHaveBeenCalledTimes(1)
    })

    it('resets to page 1 and refetches when exiting to default mode', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      wrapper.vm.currentMode = 2
      wrapper.vm.pageParams = { page: 3, page_size: 5 }
      getter.mockClear()

      await wrapper.vm.handleSearchMode(0)

      expect(wrapper.vm.currentMode).toBe(0)
      expect(wrapper.vm.pageParams).toEqual({ page: 1, page_size: 5 })
      expect(getter).toHaveBeenCalledTimes(1)
    })

    it('does not trigger a fetch when enableClientPagination is true', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({ enableClientPagination: true }, getter)
      await flushPromises()
      getter.mockClear()

      await wrapper.vm.handleSearchMode(1)

      expect(wrapper.vm.currentMode).toBe(1)
      expect(getter).not.toHaveBeenCalled()
    })

    it('does not fetch when entering active-search mode (2)', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()
      getter.mockClear()

      await wrapper.vm.handleSearchMode(2)

      expect(wrapper.vm.currentMode).toBe(2)
      expect(getter).not.toHaveBeenCalled()
    })
  })

  describe('resetAndFetch', () => {
    it('resets the active tab and page params, then refetches', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()

      wrapper.vm.activeTab = 1
      wrapper.vm.pageParams = { page: 4, page_size: 25 }
      getter.mockClear()

      wrapper.vm.resetAndFetch()
      await flushPromises()

      expect(wrapper.vm.activeTab).toBe(0)
      expect(wrapper.vm.pageParams).toEqual({ page: 1, page_size: 5 })
      expect(getter).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleSelectionChange', () => {
    it('proxies the selection-change event', () => {
      const wrapper = mountLayout()

      wrapper.vm.handleSelectionChange([results[0]!])

      expect(wrapper.emitted('selection-change')).toContainEqual([[results[0]!]])
    })
  })

  describe('handleRefresh', () => {
    it('emits refreshed and refetches items', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({}, getter)
      await flushPromises()
      getter.mockClear()

      await wrapper.vm.handleRefresh()
      await flushPromises()

      expect(wrapper.emitted('refreshed')).toHaveLength(1)
      expect(getter).toHaveBeenCalledTimes(1)
    })
  })

  describe('watchers', () => {
    it('resets and refetches when the getter prop changes', async () => {
      const wrapper = mountLayout()
      await flushPromises()

      wrapper.vm.activeTab = 1

      const newGetter = makeGetter()
      await wrapper.setProps({ getter: newGetter })
      await flushPromises()

      expect(wrapper.vm.activeTab).toBe(0)
      expect(newGetter).toHaveBeenCalledTimes(1)
    })

    it('resets and refetches when refreshKey changes', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({ refreshKey: 'a' }, getter)
      await flushPromises()

      wrapper.vm.activeTab = 1
      getter.mockClear()

      await wrapper.setProps({ refreshKey: 'b' })
      await flushPromises()

      expect(wrapper.vm.activeTab).toBe(0)
      expect(getter).toHaveBeenCalledTimes(1)
    })

    it('does not refetch when refreshKey is set to the same value', async () => {
      const getter = makeGetter()
      const wrapper = mountLayout({ refreshKey: 'a' }, getter)
      await flushPromises()
      getter.mockClear()

      await wrapper.setProps({ refreshKey: 'a' })
      await flushPromises()

      expect(getter).not.toHaveBeenCalled()
    })
  })
})
