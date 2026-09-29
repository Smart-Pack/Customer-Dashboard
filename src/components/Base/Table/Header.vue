<template>
  <thead>
    <!-- Search Bar -->
    <tr v-if="enableSearch">
      <td :colspan="headings.length">
        <div v-if="currentMode === 0 && items.length > 0" class="flex p-4 secondary-text">
          <button
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold form-submit"
            @click="handleSearchMode(1)"
          >
            Enable Search Mode
          </button>
        </div>

        <div v-else-if="currentMode !== 0" class="grid secondary-text p-4 gap-4">
          <div class="grid grid-cols-2 gap-8">
            <InputField
              v-model="searchValue"
              name="search"
              type="text"
              errorLabel="Search Field"
              placeholder="Enter value to search"
              :icon="SearchIcon"
              :icon-right="ClearIcon"
              :icon-right-clear="true"
              :disabled="loading"
              :sync-external-value="true"
            />

            <InputField
              v-model.trim="currentSearchField"
              name="searchOptions"
              variant="select"
              :options="headingFieldOptions"
            />
          </div>

          <div class="flex gap-16 lg:gap-4 items-center lg:justify-between">
            <button
              type="button"
              class="px-4 py-2 rounded-full text-sm font-semibold form-submit-secondary"
              :disabled="loading"
              @click="handleSearchMode(0)"
            >
              Exit
            </button>

            <span class="secondary-text">
              Search results: {{ sortedItems.length }} {{ name }}
            </span>
          </div>
        </div>
      </td>
    </tr>

    <!-- Column Headings -->
    <tr class="primary-bg p-3 font-semibold text-sm text-left">
      <th
        v-for="heading in headings"
        :key="heading.key"
        class="p-3 text-left whitespace-nowrap lg:whitespace-normal"
      >
        <template v-if="selectionType === 'checkbox' && heading.key === 'selection'">
          <label class="flex items-center justify-center">
            <input
              type="checkbox"
              class="form-checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
          </label>
        </template>

        <button
          v-else-if="heading.sortable && items.length > 0"
          type="button"
          class="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!items.length"
          @click="toggleSort(heading.key)"
          :aria-sort="getAriaSort(heading.key)"
        >
          <span>{{ heading.label }}</span>

          <SortIcon
            class="w-6 h-6"
            :class="{
              hidden: heading.key === currentSortKey,
            }"
          />

          <SortUpIcon
            class="w-6 h-6"
            :class="{
              hidden: heading.key !== currentSortKey || currentSortDirection !== 'asc',
            }"
          />

          <SortDownIcon
            class="w-6 h-6"
            :class="{
              hidden: heading.key !== currentSortKey || currentSortDirection !== 'desc',
            }"
          />
        </button>

        <span v-else>{{ heading.label }}</span>
      </th>
    </tr>
  </thead>
</template>

<script lang="ts">
import { defineComponent, markRaw, type Component } from 'vue'

import SortIcon from '@/components/Icons/SortIcon.vue'
import SortUpIcon from '@/components/Icons/SortUpIcon.vue'
import SortDownIcon from '@/components/Icons/SortDownIcon.vue'
import SearchIcon from '@/components/Icons/SearchIcon.vue'
import ClearIcon from '@/components/Icons/ClearIcon.vue'
import InputField from '@/components/Base/InputField.vue'
import type { TableItem } from './types'

/**
 * Defines the configuration for a table column.
 *
 * @interface TableHeading
 */
interface TableHeading {
  /** Unique key used to identify and access the column. */
  key: string

  /** Text displayed in the table header. */
  label: string

  /** Whether the column can be sorted. */
  sortable?: boolean

  /** Defines the default sorting configuration. */
  defaultSort?: {
    /** Initial sort direction. */
    direction?: 'asc' | 'desc'
  }
}

/**
 * Defines the available search-field options.
 *
 * @interface SearchFieldOption
 */
interface SearchFieldOption {
  /** Field key used when searching. */
  value: string

  /** Human-readable field label. */
  label: string
}

/**
 * Header component for the BaseTable.
 *
 * Responsible for:
 * - Rendering table column headings.
 * - Providing column sorting controls.
 * - Providing optional search controls.
 * - Providing a select-all checkbox.
 * - Resolving nested object values using dot notation.
 *
 * @displayName TableHeader
 */
export default defineComponent({
  name: 'TableHeader',

  components: {
    SortIcon,
    SortDownIcon,
    SortUpIcon,
    InputField,
  },

  props: {
    /**
     * Configuration for the table columns.
     *
     * @type {TableHeading[]}
     */
    headings: {
      type: Array as () => TableHeading[],
      required: true,
    },

    /**
     * Current set of table rows.
     *
     * This normally represents the currently loaded server-side page.
     *
     * @type {TableItem[]}
     */
    items: {
      type: Array as () => TableItem[],
      required: true,
    },

    /**
     * Cached dataset used when search mode is active.
     *
     * @type {TableItem[]}
     */
    allItems: {
      type: Array as () => TableItem[],
      default: () => [],
    },

    /**
     * Indicates whether table data is currently loading.
     *
     * @type {boolean}
     */
    loading: {
      type: Boolean,
      required: true,
    },

    /**
     * Controls the type of selection input displayed by the table.
     *
     * Supported values are `checkbox` and `radio`.
     *
     * @type {string|null}
     */
    selectionType: {
      type: String,
      default: null,
    },

    /**
     * Name applied to radio selection inputs.
     *
     * @type {string|null}
     */
    selectionName: {
      type: String,
      default: null,
    },

    /**
     * IDs of currently selected rows.
     *
     * @type {(string|number)[]}
     */
    selectedIds: {
      type: Array as () => Array<string | number>,
      default: () => [],
    },

    /**
     * Enables the table search controls.
     *
     * @type {boolean}
     */
    enableSearch: {
      type: Boolean,
      default: false,
    },

    /**
     * Current search mode.
     *
     * `0` = default mode,
     * `1` = search mode,
     * `2` = active search.
     *
     * @type {number}
     */
    currentMode: {
      type: Number,
      default: 0,
    },

    /**
     * Display name used when showing the search result count.
     *
     * @type {string}
     */
    name: {
      type: String,
      default: '',
    },
  },

  emits: {
    /**
     * Emits the sorted rows.
     *
     * @param {TableItem[]} items - Sorted table rows.
     */
    'sort-change': (items: TableItem[]) => Array.isArray(items),

    /**
     * Emits a request to change the current search mode.
     *
     * @param {number} mode - Requested search mode.
     */
    'change-current-mode': (mode: number) => Number.isInteger(mode),

    /**
     * Emits the selected row IDs.
     *
     * @param {(string|number)[]} ids - Selected row IDs.
     * @param {boolean} selectAll - Whether the selection came from select-all.
     */
    'selection-change': (ids: Array<string | number>, selectAll: boolean) =>
      Array.isArray(ids) && typeof selectAll === 'boolean',
  },

  data() {
    /**
     * Determines the initial sorting column.
     */
    const defaultHeading = this.headings.find((heading) => heading.defaultSort)

    const sortHeading = defaultHeading || this.headings.find((heading) => heading.sortable)

    return {
      /**
       * Current column used for sorting.
       *
       * @type {string}
       */
      currentSortKey: sortHeading?.key || '',

      /**
       * Current sort direction.
       *
       * @type {'asc'|'desc'}
       */
      currentSortDirection: sortHeading?.defaultSort?.direction || ('desc' as 'asc' | 'desc'),

      /**
       * Current search input value.
       *
       * @type {string}
       */
      searchValue: '',

      /**
       * Search input leading icon.
       */
      SearchIcon: markRaw(SearchIcon) as Component,

      /**
       * Search input trailing clear icon.
       */
      ClearIcon: markRaw(ClearIcon) as Component,

      /**
       * Current field selected for searching.
       *
       * @type {string}
       */
      currentSearchField: sortHeading?.key || '',
    }
  },

  computed: {
    /**
     * Returns the currently filtered and sorted table rows.
     *
     * @returns {TableItem[]}
     */
    sortedItems(): TableItem[] {
      const rows = this.currentMode !== 0 ? [...this.searchResults] : [...this.items]

      if (rows.length < 2 || !this.currentSortKey) {
        return rows
      }

      const direction = this.currentSortDirection === 'asc' ? 1 : -1

      return rows.sort((a, b) => {
        const aValue = this.normalizeValue(this.resolveFieldValue(a, this.currentSortKey))

        const bValue = this.normalizeValue(this.resolveFieldValue(b, this.currentSortKey))

        if (aValue === bValue) return 0
        if (aValue === '') return 1 * direction
        if (bValue === '') return -1 * direction

        return aValue > bValue ? direction : -direction
      })
    },

    /**
     * Determines whether all currently displayed rows are selected.
     *
     * @returns {boolean}
     */
    isAllSelected(): boolean {
      if (!this.selectionType || this.selectionType === 'radio') {
        return false
      }

      const allIds = this.items.map((item) => item.id)

      return allIds.length > 0 && allIds.every((id) => this.selectedIds.includes(id))
    },

    /**
     * Creates the options used by the search-field selector.
     *
     * Only sortable fields are available for searching.
     *
     * @returns {SearchFieldOption[]}
     */
    headingFieldOptions(): SearchFieldOption[] {
      return this.headings
        .filter((field) => field.sortable)
        .map((field) => ({
          value: field.key,
          label: field.label,
        }))
    },

    /**
     * Filters the cached dataset according to the selected field
     * and search value.
     *
     * @returns {TableItem[]}
     */
    searchResults(): TableItem[] {
      if (!this.searchValue) {
        return this.allItems
      }

      return this.allItems.filter((item) =>
        String(this.resolveFieldValue(item, this.currentSearchField))
          .toLowerCase()
          .includes(this.searchValue.toLowerCase()),
      )
    },
  },

  methods: {
    /**
     * Resolves a value from a table row using dot notation.
     *
     * Example:
     *
     * `resolveFieldValue(user, 'profile.name')`
     *
     * @param {TableItem} record - Table row.
     * @param {string} key - Property path.
     * @returns {unknown} Resolved value.
     */
    resolveFieldValue(item: TableItem | null | undefined, field: string): unknown {
      if (!item) {
        return ''
      }

      return (
        field.split('.').reduce((value: unknown, key: string) => {
          if (value && typeof value === 'object' && key in value) {
            return (value as Record<string, unknown>)[key]
          }

          return undefined
        }, item) ?? ''
      )
    },

    /**
     * Normalizes a value before sorting.
     *
     * Strings are converted to lowercase to provide case-insensitive sorting.
     *
     * @param {unknown} value - Value to normalize.
     * @returns {string|number|boolean} Normalized value.
     */
    normalizeValue(value: unknown): string | number | boolean {
      if (value == null) return ''

      if (typeof value === 'string') {
        return value.toLowerCase()
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value
      }

      return String(value).toLowerCase()
    },

    /**
     * Toggles the current sort direction or changes the sort column.
     *
     * @param {string} key - Column key.
     */
    toggleSort(key: string): void {
      if (!key) return

      if (this.currentSortKey === key) {
        this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.currentSortKey = key
        this.currentSortDirection = 'desc'
      }

      this.$emit('sort-change', this.sortedItems)
    },

    /**
     * Returns the ARIA sort state for a column.
     *
     * @param {string} key - Column key.
     * @returns {'none'|'ascending'|'descending'}
     */
    getAriaSort(key: string): 'none' | 'ascending' | 'descending' {
      if (this.currentSortKey !== key) {
        return 'none'
      }

      return this.currentSortDirection === 'asc' ? 'ascending' : 'descending'
    },

    /**
     * Selects or deselects all currently displayed rows.
     *
     * @param {Event} event - Checkbox change event.
     */
    toggleSelectAll(event: Event): void {
      const target = event.target as HTMLInputElement
      const allIds = this.items.map((item) => item.id)

      this.$emit('selection-change', target.checked ? allIds : [], true)
    },

    /**
     * Changes the current search mode.
     *
     * @param {number} newMode - Target search mode.
     */
    handleSearchMode(newMode: number): void {
      if (this.currentMode === 0 && this.searchValue) {
        this.searchValue = ''
      }

      this.$emit('change-current-mode', newMode)
    },
  },

  watch: {
    /**
     * Emits the initial sorted dataset after loading completes.
     *
     * @param {boolean} newValue - New loading state.
     * @param {boolean} oldValue - Previous loading state.
     */
    loading(newValue: boolean, oldValue: boolean): void {
      if (newValue === false && oldValue !== false) {
        this.$emit('sort-change', this.sortedItems)
      }
    },

    /**
     * Updates search mode and emits filtered/sorted results when
     * the search input changes.
     *
     * @param {string} newValue - New search value.
     */
    searchValue(newValue: string): void {
      if (newValue) {
        if (this.currentMode !== 2) {
          this.handleSearchMode(2)
        }
      } else {
        if (this.currentMode !== 0 && this.currentMode !== 1) {
          this.handleSearchMode(1)
        }
      }

      this.$emit('sort-change', this.sortedItems)
    },

    /**
     * Re-runs sorting when the selected search field changes.
     *
     * @param {string} newValue - New search field.
     */
    currentSearchField(newValue: string): void {
      if (newValue) {
        this.$emit('sort-change', this.sortedItems)
      }
    },
  },
})
</script>

<style scoped></style>
