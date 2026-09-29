import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TableHeader from '@/components/Base/Table/Header.vue'

const headings = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    defaultSort: {
      direction: 'asc' as const,
    },
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
  {
    key: 'profile.role',
    label: 'Role',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
  },
]

const items = [
  {
    id: 1,
    name: 'Charlie',
    email: 'charlie@example.com',
    profile: {
      role: 'Admin',
    },
    status: 'Active',
  },
  {
    id: 2,
    name: 'Alice',
    email: 'alice@example.com',
    profile: {
      role: 'User',
    },
    status: 'Inactive',
  },
  {
    id: 3,
    name: 'Bob',
    email: 'bob@example.com',
    profile: {
      role: 'Manager',
    },
    status: 'Active',
  },
]

const selectionHeadings = [{ key: 'selection', label: '', sortable: false }, ...headings]

const mountHeader = (props: Record<string, unknown> = {}) => {
  return mount(TableHeader, {
    props: {
      headings,
      items,
      loading: false,
      ...props,
    },
    global: {
      stubs: {
        InputField: {
          template: `
            <div>
              <input
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
              />
            </div>
          `,
          props: ['modelValue'],
        },
        SortIcon: true,
        SortUpIcon: true,
        SortDownIcon: true,
        SearchIcon: true,
        ClearIcon: true,
      },
    },
  })
}

describe('TableHeader', () => {
  describe('rendering', () => {
    it('renders all table headings', () => {
      const wrapper = mountHeader()

      const headerCells = wrapper.findAll('th')

      expect(headerCells).toHaveLength(headings.length)
      expect(headerCells.map((cell) => cell.text())).toEqual(['Name', 'Email', 'Role', 'Status'])
    })

    it('renders the search controls when search is enabled', () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 0,
      })

      expect(wrapper.text()).toContain('Enable Search Mode')
    })

    it('does not render search controls when search is disabled', () => {
      const wrapper = mountHeader({
        enableSearch: false,
        currentMode: 0,
      })

      expect(wrapper.text()).not.toContain('Enable Search Mode')
    })

    it('renders active search controls when search mode is enabled', () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 1,
        allItems: items,
      })

      expect(wrapper.text()).toContain('Exit')
      expect(wrapper.text()).toContain('Search results:')
    })
  })

  describe('sorting', () => {
    it('uses the default sort heading', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.currentSortKey).toBe('name')
      expect(wrapper.vm.currentSortDirection).toBe('asc')
    })

    it('sorts ascending by the default column', () => {
      const wrapper = mountHeader()

      const sorted = wrapper.vm.sortedItems

      expect(sorted.map((item) => (item as unknown as { name: string }).name)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ])
    })

    it('toggles the sort direction when the same column is clicked', async () => {
      const wrapper = mountHeader()

      const nameButton = wrapper.findAll('button').find((button) => button.text().includes('Name'))

      expect(nameButton).toBeDefined()

      await nameButton!.trigger('click')

      expect(wrapper.vm.currentSortDirection).toBe('desc')

      expect(
        wrapper.vm.sortedItems.map((item) => (item as unknown as { name: string }).name),
      ).toEqual(['Charlie', 'Bob', 'Alice'])
    })

    it('changes the sort column when another sortable heading is clicked', async () => {
      const wrapper = mountHeader()

      const emailButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Email'))

      expect(emailButton).toBeDefined()

      await emailButton!.trigger('click')

      expect(wrapper.vm.currentSortKey).toBe('email')
      expect(wrapper.vm.currentSortDirection).toBe('desc')

      expect(wrapper.emitted('sort-change')).toBeTruthy()
    })

    it('emits sorted items when sorting changes', async () => {
      const wrapper = mountHeader()

      const emailButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Email'))

      expect(emailButton).toBeDefined()

      await emailButton!.trigger('click')

      const emitted = wrapper.emitted('sort-change')

      expect(emitted).toBeDefined()

      const lastEmission = emitted![emitted!.length - 1]!

      expect(lastEmission[0]).toEqual([items[0], items[2], items[1]])
    })

    it('does not render a sort button for non-sortable columns', () => {
      const wrapper = mountHeader()

      const statusCell = wrapper.findAll('th').find((cell) => cell.text() === 'Status')

      expect(statusCell).toBeDefined()
      expect(statusCell!.find('button').exists()).toBe(false)
    })

    it('returns the correct aria-sort value', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.getAriaSort('name')).toBe('ascending')
      expect(wrapper.vm.getAriaSort('email')).toBe('none')

      wrapper.vm.currentSortDirection = 'desc'

      expect(wrapper.vm.getAriaSort('name')).toBe('descending')
    })

    it('sorts nested fields using dot notation', async () => {
      const wrapper = mountHeader()

      wrapper.vm.currentSortKey = 'profile.role'
      wrapper.vm.currentSortDirection = 'asc'

      expect(wrapper.vm.sortedItems.map((item) => item.id)).toEqual([1, 3, 2])
    })
  })

  describe('field resolution', () => {
    it('resolves a simple field', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.resolveFieldValue(items[0]!, 'name')).toBe('Charlie')
    })

    it('resolves a nested field', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.sortedItems.map((item) => item.id)).toEqual([2, 3, 1])
    })

    it('returns an empty string for a missing field', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.resolveFieldValue(items[0]!, 'profile.missing')).toBe('')
    })
  })

  describe('search', () => {
    it('provides only sortable fields as search options', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.headingFieldOptions).toEqual([
        {
          value: 'name',
          label: 'Name',
        },
        {
          value: 'email',
          label: 'Email',
        },
        {
          value: 'profile.role',
          label: 'Role',
        },
      ])
    })

    it('returns all items when there is no search value', () => {
      const wrapper = mountHeader({
        currentMode: 1,
        allItems: items,
      })

      expect(wrapper.vm.searchResults).toEqual(items)
    })

    it('filters items using the selected search field', () => {
      const wrapper = mountHeader({
        currentMode: 1,
        allItems: items,
      })

      wrapper.vm.currentSearchField = 'name'
      wrapper.vm.searchValue = 'ali'

      expect(wrapper.vm.searchResults).toEqual([items[1]])
    })

    it('performs case-insensitive search', () => {
      const wrapper = mountHeader({
        currentMode: 1,
        allItems: items,
      })

      wrapper.vm.currentSearchField = 'name'
      wrapper.vm.searchValue = 'CHARLIE'

      expect(wrapper.vm.searchResults).toEqual([items[0]])
    })

    it('searches nested fields', () => {
      const wrapper = mountHeader({
        currentMode: 1,
        allItems: items,
      })

      wrapper.vm.currentSearchField = 'profile.role'
      wrapper.vm.searchValue = 'admin'

      expect(wrapper.vm.searchResults).toEqual([items[0]])
    })

    it('enters active search mode when a search value is entered', async () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 1,
        allItems: items,
      })

      wrapper.vm.searchValue = 'Alice'

      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('change-current-mode')).toContainEqual([2])
    })

    it('enters passive search mode when the search value is cleared', async () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 2,
        allItems: items,
      })

      wrapper.vm.searchValue = 'Alice'
      await wrapper.vm.$nextTick()

      wrapper.vm.searchValue = ''
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('change-current-mode')).toEqual([[1]])
    })
  })

  describe('selection', () => {
    it('reports all items as selected when every visible item is selected', () => {
      const wrapper = mountHeader({
        selectionType: 'checkbox',
        selectedIds: [1, 2, 3],
      })

      expect(wrapper.vm.isAllSelected).toBe(true)
    })

    it('reports not all items as selected when some items are not selected', () => {
      const wrapper = mountHeader({
        selectionType: 'checkbox',
        selectedIds: [1, 2],
      })

      expect(wrapper.vm.isAllSelected).toBe(false)
    })

    it('reports false when there are no visible items', () => {
      const wrapper = mountHeader({
        selectionType: 'checkbox',
        selectedIds: [],
        items: [],
      })

      expect(wrapper.vm.isAllSelected).toBe(false)
    })

    it('does not enable select-all for radio selection', () => {
      const wrapper = mountHeader({
        selectionType: 'radio',
        selectedIds: [1, 2, 3],
      })

      expect(wrapper.vm.isAllSelected).toBe(false)
    })

    it('selects all visible item IDs', async () => {
      const wrapper = mountHeader({
        headings: selectionHeadings,
        selectionType: 'checkbox',
        selectedIds: [],
      })

      const checkbox = wrapper.find('input[type="checkbox"]')

      expect(checkbox.exists()).toBe(true)

      await checkbox.setValue(true)

      expect(wrapper.emitted('selection-change')).toContainEqual([[1, 2, 3], true])
    })

    it('clears all visible item IDs', async () => {
      const wrapper = mountHeader({
        headings: selectionHeadings,
        selectionType: 'checkbox',
        selectedIds: [1, 2, 3],
      })

      const checkbox = wrapper.find('input[type="checkbox"]')

      expect(checkbox.exists()).toBe(true)

      await checkbox.setValue(false)

      expect(wrapper.emitted('selection-change')).toContainEqual([[], true])
    })
  })

  describe('search mode', () => {
    it('enters search mode when Enable Search Mode is clicked', async () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 0,
      })

      const button = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Enable Search Mode'))

      expect(button).toBeDefined()

      await button!.trigger('click')

      expect(wrapper.emitted('change-current-mode')).toContainEqual([1])
    })

    it('exits search mode when Exit is clicked', async () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 1,
        allItems: items,
      })

      const button = wrapper.findAll('button').find((button) => button.text() === 'Exit')

      expect(button).toBeDefined()

      await button!.trigger('click')

      expect(wrapper.emitted('change-current-mode')).toContainEqual([0])
    })

    it('clears search value when returning to default mode', async () => {
      const wrapper = mountHeader({
        enableSearch: true,
        currentMode: 0,
      })

      wrapper.vm.searchValue = 'Alice'

      await wrapper.vm.handleSearchMode(0)

      expect(wrapper.vm.searchValue).toBe('')
    })
  })

  describe('loading', () => {
    it('emits sorted items when loading finishes', async () => {
      const wrapper = mountHeader({
        loading: true,
      })

      await wrapper.setProps({
        loading: false,
      })

      expect(wrapper.emitted('sort-change')).toBeTruthy()
      expect(wrapper.emitted('sort-change')![0]![0]).toEqual([items[1], items[2], items[0]])
    })
  })

  describe('edge cases', () => {
    it('does not crash when there are no sortable headings', () => {
      const wrapper = mountHeader({
        headings: [
          {
            key: 'name',
            label: 'Name',
            sortable: false,
          },
        ],
      })

      expect(wrapper.vm.currentSortKey).toBe('')
      expect(wrapper.vm.currentSearchField).toBe('')
      expect(wrapper.vm.sortedItems).toEqual(items)
    })

    it('normalizes strings to lowercase', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.normalizeValue('HELLO')).toBe('hello')
    })

    it('normalizes null and undefined to an empty string', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.normalizeValue(null)).toBe('')
      expect(wrapper.vm.normalizeValue(undefined)).toBe('')
    })

    it('keeps numbers unchanged when normalizing', () => {
      const wrapper = mountHeader()

      expect(wrapper.vm.normalizeValue(123)).toBe(123)
    })
  })
})
