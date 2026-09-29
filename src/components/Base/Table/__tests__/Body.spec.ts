import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import Body from '@/components/Base/Table/Body.vue'

type BodyVm = {
  checkCondition: (
    action: {
      name: string
      route?: string
      type?: 'popup'
      condition?: {
        key: string
        match: unknown
      }
    },
    item: (typeof items)[number],
  ) => boolean

  visibleActions: (
    field: {
      key: string
      action: Array<{
        name: string
        route?: string
        condition?: {
          key: string
          match: unknown
        }
      }>
    },
    item: (typeof items)[number],
  ) => Array<{
    name: string
    route?: string
    condition?: {
      key: string
      match: unknown
    }
  }>
}

const notifyError = vi.fn<(message: string) => Promise<unknown>>()

const routerPush = vi.fn<(location: { name: string; params: { id: string | number } }) => unknown>()

const globalStubs = {
  global: {
    stubs: {
      DropdownIcon: true,
      'router-link': {
        template: '<a><slot /></a>',
      },
    },
    mocks: {
      $filters: {
        statusClass: (value: unknown, match: unknown) =>
          value === match ? 'active-class' : 'inactive-class',
      },
      $notifyError: notifyError,
      $router: {
        push: routerPush,
      },
    },
  },
}

const headings = [
  {
    key: 'name',
    label: 'Name',
  },
  {
    key: 'email',
    label: 'Email',
  },
  {
    key: 'profile.role',
    label: 'Role',
  },
  {
    key: 'status',
    label: 'Status',
    dataClass: {
      fmt: 'statusClass' as const,
      match: true,
    },
  },
]

const items = [
  {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    profile: {
      role: 'Admin',
    },
    status: true,
  },
  {
    id: 2,
    name: 'Bob',
    email: 'bob@example.com',
    profile: {
      role: 'User',
    },
    status: false,
  },
]

const selectionHeadings = [
  {
    key: 'selection',
    label: '',
    sortable: false,
  },
  ...headings,
]

const mountBody = (props: Record<string, unknown> = {}) =>
  mount(Body, {
    props: {
      headings,
      items,
      sortedItems: items,
      loading: false,
      error: false,
      ...props,
    },
    ...globalStubs,
  })

describe('Body', () => {
  describe('Loading and empty states', () => {
    it('renders the loading state', () => {
      const wrapper = mountBody({
        loading: true,
        name: 'Users',
      })

      expect(wrapper.text()).toContain('Loading Users...')
      expect(wrapper.find('tbody').exists()).toBe(true)
    })

    it('renders the default loading message when no name is provided', () => {
      const wrapper = mountBody({
        loading: true,
      })

      expect(wrapper.text()).toContain('Loading...')
    })

    it('renders an empty body when there are no items', () => {
      const wrapper = mountBody({
        name: 'Users',
        sortedItems: [],
      })

      const rows = wrapper.findAll('tbody tr')

      expect(rows).toHaveLength(1)
      expect(rows[0]!.text()).toContain('No recently added Users')
    })
  })

  describe('Cell rendering', () => {
    it('renders table rows when items are available', () => {
      const wrapper = mountBody()

      const rows = wrapper.findAll('tbody tr')

      expect(rows).toHaveLength(2)
      expect(rows[0]!.text()).toContain('Alice')
      expect(rows[1]!.text()).toContain('Bob')
    })

    it('renders nested field values', () => {
      const wrapper = mountBody()

      const rows = wrapper.findAll('tbody tr')

      expect(rows[0]!.text()).toContain('Admin')
      expect(rows[1]!.text()).toContain('User')
    })

    it('renders formatted cell values', () => {
      const formatter = vi.fn<(value: unknown) => string>((value) => `Formatted: ${String(value)}`)

      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            formatter,
          },
        ],
      })

      expect(wrapper.text()).toContain('Formatted: Alice')
      expect(wrapper.text()).toContain('Formatted: Bob')
      expect(formatter).toHaveBeenCalled()
    })

    it('supports formatter objects with arguments', () => {
      const formatter = vi.fn<(value: unknown, item: unknown, prefix: unknown) => string>(
        (value, _item, prefix) => `${String(prefix)} ${String(value)}`,
      )

      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            formatter: {
              func: formatter,
              args: ['User:'],
            },
          },
        ],
      })

      expect(wrapper.text()).toContain('User: Alice')
      expect(formatter).toHaveBeenCalledWith('Alice', expect.objectContaining({ id: 1 }), 'User:')
    })

    it('applies a string data class', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            dataClass: 'font-bold',
          },
        ],
      })

      const cellContent = wrapper.find('tbody tr td span')

      expect(cellContent.classes()).toContain('font-bold')
    })

    it('applies status classes using the global filter', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'status',
            label: 'Status',
            dataClass: {
              fmt: 'statusClass',
              match: true,
            },
          },
        ],
        sortedItems: [
          {
            id: 1,
            status: true,
          },
          {
            id: 2,
            status: false,
          },
        ],
      })

      const statusCells = wrapper.findAll('tbody tr td span')

      expect(statusCells[0]!.classes()).toContain('active-class')
      expect(statusCells[1]!.classes()).toContain('inactive-class')
    })
  })

  describe('Selection', () => {
    it('renders a checkbox selection control', () => {
      const wrapper = mountBody({
        selectionType: 'checkbox',
        selectedIds: [],
        headings: selectionHeadings,
      })

      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
    })

    it('renders a radio selection control', () => {
      const wrapper = mountBody({
        selectionType: 'radio',
        selectedIds: [],
        headings: selectionHeadings,
      })

      expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
    })

    it('marks selected checkbox items as checked', () => {
      const wrapper = mountBody({
        selectionType: 'checkbox',
        selectedIds: [1],
        headings: selectionHeadings,
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect((checkboxes[0]!.element as HTMLInputElement).checked).toBe(true)

      expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(false)
    })

    it('emits selection-change when a checkbox is toggled', async () => {
      const wrapper = mountBody({
        selectionType: 'checkbox',
        selectedIds: [],
        headings: selectionHeadings,
      })

      const checkbox = wrapper.find('input[type="checkbox"]')

      await checkbox.setValue(true)

      const emitted = wrapper.emitted('selection-change')

      expect(emitted).toBeDefined()
      expect(emitted![0]![0]).toBe(1)
    })

    it('emits selection-change when a selected checkbox is unchecked', async () => {
      const wrapper = mountBody({
        selectionType: 'checkbox',
        selectedIds: [2],
        headings: selectionHeadings,
      })

      const checkboxes = wrapper.findAll('input[type="checkbox"]')

      expect(checkboxes).toHaveLength(2)
      expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(true)

      await checkboxes[1]!.trigger('change')

      const emitted = wrapper.emitted('selection-change')

      expect(emitted).toBeDefined()
      expect(emitted![0]![0]).toBe(2)
    })

    it('emits the selected item for radio selection', async () => {
      const wrapper = mountBody({
        selectionType: 'radio',
        selectedIds: [],
        headings: selectionHeadings,
      })

      const radio = wrapper.find('input[type="radio"]')

      await radio.setValue(true)

      const emitted = wrapper.emitted('selection-change')

      expect(emitted).toBeDefined()
      expect(emitted![0]![0]).toBe(1)
    })
  })

  describe('Links and buttons', () => {
    it('renders an external link when a field has a click configuration', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            click: {
              getLink: (item: (typeof items)[number]) => `https://example.com/users/${item.id}`,
            },
          },
        ],
      })

      const link = wrapper.find('a')

      expect(link.exists()).toBe(true)
      expect(link.attributes('href')).toBe('https://example.com/users/1')
    })

    it('does not expose an unsafe external URL', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'email',
            label: 'Email',
            click: {
              getLink: () => 'javascript:alert("xss")',
            },
          },
        ],
      })

      const externalLink = wrapper.find('a[target="_blank"]')

      expect(externalLink.exists()).toBe(true)
      expect(externalLink.attributes('href')).toBeUndefined()
    })

    it('renders a button for fields with button configuration', () => {
      const fn = vi.fn<(item: (typeof items)[number]) => unknown>()

      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            button: {
              fn,
            },
          },
        ],
      })

      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('calls a field button handler when clicked', async () => {
      const fn = vi.fn<(item: (typeof items)[number]) => unknown>()

      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            button: {
              fn,
            },
          },
        ],
      })

      await wrapper.find('button').trigger('click')

      expect(fn).toHaveBeenCalledWith(items[0])
    })

    it('notifies the user when a button handler fails', async () => {
      const fn = vi
        .fn<(item: (typeof items)[number]) => Promise<unknown>>()
        .mockRejectedValue(new Error('Action failed'))

      const wrapper = mountBody({
        headings: [
          {
            key: 'name',
            label: 'Name',
            button: {
              fn,
            },
          },
        ],
      })

      await wrapper.find('button').trigger('click')

      expect(notifyError).toHaveBeenCalledWith('Action failed')
    })
  })

  describe('Actions', () => {
    it('renders a popup action', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'actions',
            label: 'Actions',
            action: {
              name: 'View details',
              type: 'popup',
            },
          },
        ],
      })

      const button = wrapper.find('button')

      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('View details')
    })

    it('renders a route action', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'actions',
            label: 'Actions',
            action: {
              name: 'View',
              route: 'user-details',
            },
          },
        ],
      })

      const link = wrapper.find('a')

      expect(link.exists()).toBe(true)
      expect(link.text()).toContain('View')
    })

    it('renders a dropdown for multiple actions', () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'actions',
            label: 'Actions',
            action: [
              {
                name: 'View',
                route: 'user-details',
              },
              {
                name: 'Edit',
                route: 'edit-user',
              },
            ],
          },
        ],
      })

      const button = wrapper.find('button')

      expect(button.exists()).toBe(true)
    })

    it('hides actions whose conditions do not match', async () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'actions',
            label: 'Actions',
            action: [
              {
                name: 'Edit',
                route: 'UserEdit',
                condition: {
                  key: 'status',
                  match: false,
                },
              },
            ],
          },
        ],
      })

      const dropdown = wrapper.find('button')

      expect(dropdown.exists()).toBe(true)

      await dropdown.trigger('click')

      const actionButtons = dropdown.findAll('button')

      expect(actionButtons).toHaveLength(0)
    })

    it('renders actions whose conditions match', async () => {
      const wrapper = mountBody({
        headings: [
          {
            key: 'actions',
            label: 'Actions',
            action: [
              {
                name: 'Edit',
                route: 'UserEdit',
                condition: {
                  key: 'status',
                  match: true,
                },
              },
            ],
          },
        ],
      })

      const dropdown = wrapper.find('button')

      expect(dropdown.exists()).toBe(true)

      await dropdown.trigger('click')

      expect(wrapper.text()).toContain('Edit')
    })
  })

  describe('Action conditions and helpers', () => {
    it('returns true when an action condition matches', () => {
      const wrapper = mountBody()

      const vm = wrapper.vm as unknown as BodyVm

      const result = vm.checkCondition(
        {
          name: 'View',
          route: 'user-details',
          condition: {
            key: 'status',
            match: true,
          },
        },
        items[0]!,
      )

      expect(result).toBe(true)
    })

    it('returns false when an action condition does not match', () => {
      const wrapper = mountBody()

      const vm = wrapper.vm as unknown as BodyVm

      const result = vm.checkCondition(
        {
          name: 'Edit',
          condition: {
            key: 'status',
            match: false,
          },
        },
        items[0]!,
      )

      expect(result).toBe(false)
    })

    it('checks action conditions using nested fields', () => {
      const wrapper = mountBody()

      const vm = wrapper.vm as unknown as BodyVm

      const result = vm.checkCondition(
        {
          name: 'View',
          route: 'user-details',
          condition: {
            key: 'profile.role',
            match: 'Admin',
          },
        },
        items[0]!,
      )

      expect(result).toBe(true)
    })

    it('returns actions whose conditions match', () => {
      const wrapper = mountBody()

      const field = {
        key: 'actions',
        action: [
          {
            name: 'Edit',
            route: 'UserEdit',
            condition: {
              key: 'status',
              match: true,
            },
          },
          {
            name: 'Delete',
            route: 'UserDelete',
            condition: {
              key: 'status',
              match: false,
            },
          },
        ],
      }

      const vm = wrapper.vm as unknown as BodyVm

      const result = vm.visibleActions(field, items[0]!)

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('Edit')
    })
  })

  describe('Value resolution', () => {
    it('returns an empty value for a missing field', () => {
      const wrapper = mountBody()

      const result = (
        wrapper.vm as unknown as {
          resolveFieldValue: (record: unknown, key: string) => unknown
        }
      ).resolveFieldValue(items[0], 'does.not.exist')

      expect(result).toBe('')
    })

    it('resolves nested values through resolveFieldValue', () => {
      const wrapper = mountBody()

      const result = (
        wrapper.vm as unknown as {
          resolveFieldValue: (record: unknown, key: string) => unknown
        }
      ).resolveFieldValue(items[0], 'profile.role')

      expect(result).toBe('Admin')
    })

    it('returns an empty value when resolving a null record', () => {
      const wrapper = mountBody()

      const result = (
        wrapper.vm as unknown as {
          resolveFieldValue: (record: unknown, key: string) => unknown
        }
      ).resolveFieldValue(null, 'profile.role')

      expect(result).toBe('')
    })
  })
})
