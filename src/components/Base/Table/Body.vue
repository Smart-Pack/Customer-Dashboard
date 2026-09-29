<template>
  <!-- Loading State -->
  <tbody v-if="loading">
    <tr class="table-body hover:bg-transparent">
      <td :colspan="headings.length" class="p-6">
        <span
          class="inline-flex w-full items-center justify-center p-2 lg:p-4 loading-animation font-bold text-lg"
        >
          {{ name ? `Loading ${name}...` : 'Loading...' }}
        </span>
      </td>
    </tr>
  </tbody>

  <!-- Data Rows -->
  <tbody v-else-if="sortedItems.length">
    <tr v-for="item in sortedItems" :key="item.id ?? item._id" class="table-body">
      <td
        v-for="field in headings"
        :key="`${item.id}-${field.key}`"
        :ref="`${item.id}-${field.key}`"
        class="p-3 text-left"
      >
        <template v-if="selectionType && field.key === 'selection'">
          <label class="flex items-center justify-center">
            <input
              v-if="selectionType === 'radio'"
              type="radio"
              :name="selectionName"
              :value="item.id"
              :checked="isSelected(item)"
              @change="toggleSelection(item)"
              class="form-radio"
            />
            <input
              v-else
              type="checkbox"
              :value="item.id"
              :checked="isSelected(item)"
              @change="toggleSelection(item)"
              class="form-checkbox"
            />
          </label>
        </template>

        <!-- Action Cell -->
        <template v-else-if="field.key === 'actions'">
          <!-- View cell -->
          <button
            v-if="field.action && !Array.isArray(field.action) && field.action.type === 'popup'"
            type="button"
            class="form-submit px-2 py-1 text-sm hover:text-white"
            @click="$emit('openPopup', item)"
          >
            {{ field.action.name }}
          </button>

          <router-link
            v-else-if="field.action && !Array.isArray(field.action) && 'route' in field.action"
            :to="{
              name: field.action.route,
              params: { id: item.id },
            }"
            class="form-submit py-1 px-2 hover:text-white text-sm"
          >
            {{ field.action.name }}
          </router-link>

          <!-- Multiple Action Dropdown -->
          <button
            v-else-if="Array.isArray(field.action)"
            type="button"
            class="relative form-submit items-center py-1 px-2"
            @click="toggleDropdown(item.id)"
          >
            <DropdownIcon class="w-6 h-6" />

            <!-- Dropdown Menu -->
            <div
              class="absolute top-[105%] z-50 right-0 card-base !rounded-none min-w-40 secondary-text text-sm"
              :class="currentDropdown === item.id ? 'block' : 'hidden'"
            >
              <button
                v-for="action in visibleActions(field, item)"
                :key="`${item.id}-${action.name}`"
                :data-testid="`table-action-${action.name.toLowerCase().replace(/\s+/g, '-')}`"
                class="px-4 py-2 hover:text-primary dark:hover:text-primary-dark w-full"
                @click="dropdownAction(action, item)"
              >
                {{ action.name }}
              </button>
            </div>
          </button>
        </template>

        <template v-else>
          <a
            v-if="field.click"
            :href="handleCellLink(field, item)"
            target="_blank"
            rel="noopener noreferrer"
            :class="dataClasses(field, item)"
          >
            {{ formatCell(item, field) || '-' }}
          </a>

          <button
            v-else-if="field.button"
            type="button"
            :class="[
              'bg-transparent border-0 p-0 m-0 text-inherit text-left cursor-pointer',
              dataClasses(field, item),
              field.button.class || '',
            ]"
            @click="handleCellClick(field, item)"
          >
            {{ formatCell(item, field) ? formatCell(item, field) : '-' }}
          </button>

          <component
            v-else-if="field.component"
            :is="field.component"
            :item="item"
            :field="field"
            :value="formatCell(item, field)"
            :class="dataClasses(field, item)"
            @refresh="$emit('refresh')"
          />

          <span v-else class="text-sm" :class="dataClasses(field, item)">
            {{ formatCell(item, field) ? formatCell(item, field) : '-' }}
          </span>
        </template>
      </td>
    </tr>
  </tbody>

  <!-- Empty/Error State -->
  <tbody v-else>
    <tr class="table-body">
      <td class="primary-text lg:text-center text-lg p-6" :colspan="headings.length">
        {{ errorMessage }}
      </td>
    </tr>
  </tbody>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import DropdownIcon from '@/components/Icons/DropdownIcon.vue'
import { safeExternalHref } from '@/utils/urlSecurity'
import type {
  TableItem,
  TableField,
  Pagination,
  PaginationChange,
  ActionCondition,
  TableAction,
} from './types'

/**
 * Represents pagination parameters.
 */

/**
 * @memberof module:components/Base/Table
 * @description The body component for the BaseTable. It renders the data rows,
 * handles loading/empty/error messaging, and manages per-row dropdown actions
 * (including route navigation, condition-based buttons, and pagination updates).
 * @displayName TableBody
 */
export default defineComponent({
  name: 'TableBody',

  components: {
    DropdownIcon,
  },

  data() {
    return {
      currentDropdown: '' as string | number,
    }
  },

  computed: {
    /**
     * Provides a contextual message for empty/errored states depending on the mode.
     * @returns {string}
     */
    errorMessage(): string {
      if (this.error) {
        return `Unable to fetch ${this.name}`
      } else if (this.currentMode !== 0) {
        return `No search results found for ${this.name}`
      } else {
        return `No recently added ${this.name}`
      }
    },
  },

  props: {
    /**
     * A descriptive name for the items in the table (e.g., "Partners", "Users").
     * This is used in loading and empty/error state messages.
     * @type {String}
     * @default ''
     */
    name: {
      type: String,
      required: false,
      default: '',
    },

    /**
     * A flag indicating if there was an error fetching the data.
     * This is used to display an appropriate message in the table body.
     * @type {Boolean}
     * @default false
     */
    error: {
      type: Boolean,
      required: true,
      default: false,
    },

    /**
     * A flag to indicate that the table data is currently being loaded.
     * When true, a loading skeleton is displayed.
     * @type {Boolean}
     * @required
     */
    loading: {
      type: Boolean,
      required: true,
    },

    /**
     * The core configuration object for the table's columns. This is an array of objects,
     * where each object defines a column.
     *
     * @type {Array<Object>}
     * @property {string} key - The key to access the data in the item object (supports dot notation, e.g., 'plan.name').
     * @property {string} label - The text to display in the column header.
     * @property {boolean} [sortable=false] - Whether the column can be sorted by the user.
     * @property {Object} [defaultSort] - Sets the default sort column and direction. e.g., `{ direction: 'desc' }`.
     * @property {string|Object} [dataClass] - CSS classes for the data cells. Can be a string for static classes, or an object for dynamic classes (e.g., `{ fmt: 'statusClass', match: true }`). When `fmt` is a function, it receives `(rawValue, item)`.
     * @property {Function|Object} [formatter] - A function or object to format the cell's value. If an object, it should be `{ func: Function, args: any[] }`.
     * @property {Object} [action] - Defines an action button for the column. e.g., `{ name: 'View', route: 'partner-details' }`.
     * @required
     */
    headings: {
      type: Array as PropType<TableField[]>,
      required: true,
    },

    /**
     * An array of data objects to be rendered as rows in the table.
     * Each object should have properties corresponding to the `key`s in the `headings` array.
     * @type {Array<Object>}
     * @required
     */
    sortedItems: {
      type: Array as PropType<TableItem[]>,
      required: true,
    },

    /**
     * 'checkbox' or 'radio'. When set, renders selection controls in the `selection` column.
     * @type {String|null}
     */
    selectionType: {
      type: String,
      default: null,
    },

    /**
     * The `name` attribute applied to the selection inputs, ensuring radio groups stay linked.
     * @type {String|null}
     */
    selectionName: {
      type: String,
      default: null,
    },

    /**
     * The IDs currently selected (kept in sync with the parent table).
     * @type {Array<number>}
     */
    selectedIds: {
      type: Array as PropType<Array<string | number>>,
      default: () => [],
    },

    /**
     * An object containing pagination parameters, typically from an API response.
     * If an empty string is passed, the pagination footer is hidden.
     * @type {Object|String}
     * @property {number} page - The current page number.
     * @property {number} page_size - The number of items per page.
     * @default ''
     */
    pagination: {
      type: [Object, String] as PropType<Pagination>,
      required: false,
      default: '',
    },

    currentMode: {
      type: Number,
      required: false,
      default: 0,
    },
  },

  emits: {
    /**
     * Emitted when a table row selection changes.
     */
    'selection-change': (id: string | number) => typeof id === 'string' || typeof id === 'number',

    /**
     * Emitted when a popup action is selected.
     */
    openPopup: (item: TableItem) => item !== null && typeof item === 'object',

    /**
     * Emitted when a child component requests a table refresh.
     */
    refresh: () => true,

    /**
     * Emitted when a pagination-related action requires the parent
     * table to refresh its data.
     */
    'pagination-change': (value: PaginationChange) => typeof value === 'object' && value !== null,
  },

  methods: {
    /**
     * Retrieves a nested value from an object using a dot-notation string.
     * @param {Object} record - The object to retrieve the value from.
     * @param {String} key - The dot-notation key (e.g., 'plan.name').
     * @returns {*} The resolved value or an empty string if not found.
     */
    resolveFieldValue(record: TableItem | null | undefined, key: string): unknown {
      if (!record || !key) return ''

      return (
        key.split('.').reduce<unknown>((value, segment) => {
          if (value == null) return ''

          if (typeof value === 'object' && segment in (value as Record<string, unknown>)) {
            return (value as Record<string, unknown>)[segment]
          }

          return ''
        }, record) ?? ''
      )
    },

    checkCondition({ condition }: { condition?: ActionCondition }, item: TableItem): boolean {
      if (condition === undefined) {
        return true
      }

      const rawValue = this.resolveFieldValue(item, condition.key)

      return rawValue === condition.match
    },

    /**
     * Returns the subset of actions that satisfy the configured condition for a row.
     * @param {Object} field - The heading definition that holds the `action` array.
     * @param {Object} item - The current row item.
     * @returns {Array<Object>} Only the actions whose `condition` matches the row values.
     */
    visibleActions(field: TableField, item: TableItem): TableAction[] {
      if (!Array.isArray(field.action)) {
        return []
      }

      return field.action.filter((action) => this.checkCondition(action, item))
    },

    toggleDropdown(itemId: string | number): void {
      this.currentDropdown = this.currentDropdown === itemId ? '' : itemId

      if (this.currentDropdown !== '') {
        window.addEventListener('click', this.handleOutsideClick)
      } else {
        window.removeEventListener('click', this.handleOutsideClick)
      }
    },

    handleOutsideClick(event: MouseEvent): void {
      const key = `${this.currentDropdown}-actions`

      let activeCell = this.$refs[key]

      if (!activeCell) {
        return
      }

      if (Array.isArray(activeCell)) {
        activeCell = activeCell[0]
      }

      if (!activeCell) {
        return
      }

      if (
        activeCell instanceof HTMLElement &&
        event.target instanceof Node &&
        activeCell.contains(event.target)
      ) {
        return
      }

      window.removeEventListener('click', this.handleOutsideClick)
      this.currentDropdown = ''
    },

    /**
     * Formats a cell's value using a formatter function or object if provided in the heading definition.
     * @param {Object} item - The row item.
     * @param {Object} field - The heading definition for the cell.
     * @returns {String} The formatted cell value.
     */
    formatCell(item: TableItem, field: TableField): unknown {
      const rawValue = this.resolveFieldValue(item, field.key)

      if (!field.formatter) {
        return rawValue
      }

      if (typeof field.formatter === 'function') {
        return field.formatter(rawValue, item)
      }

      if (typeof field.formatter === 'object' && field.formatter.func) {
        const args: [unknown, TableItem, ...unknown[]] = field.formatter.args
          ? [rawValue, item, ...field.formatter.args]
          : [rawValue, item]

        return field.formatter.func(...args)
      }

      return rawValue
    },

    /**
     * Returns custom CSS classes for a data cell based on the heading definition and item value.
     * Supports dynamic class assignment via a `dataClass` object with a `fmt` (formatter) and `match` property.
     * @param {Object} field - The heading definition for the cell.
     * @param {Object} item - The row item.
     * @returns {String} The CSS classes to apply.
     */
    dataClasses(field: TableField, item: TableItem): string {
      if (typeof field.dataClass === 'string') {
        return field.dataClass
      }

      if (typeof field.dataClass === 'object' && field.dataClass.fmt) {
        const rawValue = this.resolveFieldValue(item, field.key)

        switch (field.dataClass.fmt) {
          case 'statusClass':
            return this.$filters.statusClass(rawValue, field.dataClass.match)

          default:
            return typeof field.dataClass.fmt === 'function'
              ? field.dataClass.fmt(rawValue, item)
              : ''
        }
      }

      return ''
    },

    /**
     * Action definitions can point to either a route or a handler.
     *
     * Example:
     * [
     *   { name: 'View', route: 'router-details' }, // opens the named route
     *   {
     *     name: 'Move to Transit',
     *     fn: this.updateRouter,                     // calls a method instead of navigating
     *     condition: { key: 'location', match: 'Manufacturer' }, // only show when the record’s `location` is “Manufacturer”
     *   },
     * ]
     */
    async dropdownAction(action: TableAction, item: TableItem): Promise<void> {
      if ('route' in action && action.route !== undefined) {
        this.$router.push({
          name: action.route,
          params: { id: item.id },
        })
      } else if ('fn' in action && action.fn !== undefined) {
        if (await action.fn(item)) {
          const change: PaginationChange =
            typeof this.pagination === 'object' ? { page: this.pagination.page } : {}

          this.$emit('pagination-change', change)
        }
      }
    },

    /**
     * Determines if the given item is part of the current selection.
     * @param {Object} item - The row item.
     * @returns {boolean}
     */
    isSelected(item: TableItem): boolean {
      return item.id !== undefined && this.selectedIds.includes(item.id)
    },

    /**
     * Emits a selection-change event with the clicked item's ID, allowing the parent table to track the selection.
     * @param {Object} item - The row item.
     */
    toggleSelection(item: TableItem): void {
      const id = item.id

      if (id === undefined) {
        return
      }

      this.$emit('selection-change', id)
    },

    /**
     * Resolves a hyperlink URL for a table cell.
     *
     * Uses a field-level `getLink` function to compute the URL from row data.
     * Returns null if no resolver exists or if the result is invalid.
     *
     * @param {Object} field - Field configuration object.
     * @param {Object} field.click - Click configuration.
     * @param {Function} field.click.getLink - Function that returns a URL string.
     * @param {Object} item - Row data object.
     * @returns {string|null} Resolved URL or null if unavailable.
     */
    handleCellLink(field: TableField, item: TableItem): string | undefined {
      if (!field?.click?.getLink) return undefined

      return safeExternalHref(field.click.getLink(item)) ?? undefined
    },

    async handleCellClick(field: TableField, item: TableItem): Promise<void> {
      if (!field.button) {
        return
      }

      try {
        await field.button.fn(item)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unable to run this action.'

        this.$notifyError(message)
      }
    },
  },

  beforeUnmount() {
    window.removeEventListener('click', this.handleOutsideClick)
  },
})
</script>

<style scoped></style>
