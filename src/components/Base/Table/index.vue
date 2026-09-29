<template>
  <table class="w-full">
    <!-- Table Title -->
    <caption
      v-if="caption !== 'None'"
      class="caption-top sub-heading p-4 font-bold text-start lg:text-center"
    >
      {{
        caption
      }}
    </caption>

    <TableHeader
      :headings="headings"
      :items="items"
      :all-items="allItems"
      :loading="loading"
      :selection-type="selectionType"
      :selection-name="selectionName"
      :selected-ids="selectedIds"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      :enable-search="enableSearch"
      :current-mode="currentMode"
      @change-current-mode="handleSearchMode"
      :name="name"
    />

    <TableBody
      :name="name"
      :error="error"
      :loading="loading"
      :headings="headings"
      :sorted-items="activeSortedItems"
      :selection-type="selectionType"
      :selection-name="selectionName"
      :selected-ids="selectedIds"
      :pagination="activePagination"
      @pagination-change="handlePageChange"
      @selection-change="handleSelectionChange"
      @open-popup="$emit('openPopup', $event)"
      @refresh="$emit('refresh')"
      :current-mode="currentMode"
    />

    <!-- Pagination of Table -->
    <TableFooter
      v-if="pagination !== ''"
      :pagination="activePagination"
      :total-items="activeTotalItems"
      :total-columns="headings.length"
      @pagination-change="handlePageChange"
    />
  </table>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import TableHeader from './Header.vue'
import TableBody from './Body.vue'
import TableFooter from './Footer.vue'
import type { TableItem, PaginationParams, PaginationChange, Pagination, TableField } from './types'

/**
 * @module components/Base/Table
 * @description
 * A powerful and reusable table component designed for displaying collections of data.
 * It is composed of three main sub-components:
 * - `TableHeader`: Handles column rendering and client-side sorting logic.
 * - `TableBody`: Renders the data rows, loading states, and empty/error messages.
 * - `TableFooter`: Provides pagination controls.
 *
 * This component supports client-side sorting, pagination, loading/empty states,
 * and dynamic row rendering via formatters/dynamic classes, while proxying the
 * `sort-change` and `pagination-change` events from the header/body to the consumer.
 * @displayName BaseTable
 */
export default defineComponent({
  name: 'BaseTable',

  components: {
    TableHeader,
    TableBody,
    TableFooter,
  },

  data(): {
    /**
     * The set of IDs currently selected via the checkbox/radio controls.
     * @type {Array<number>}
     */
    selectedIds: Array<string | number>

    /**
     * The corresponding items that match the selected IDs.
     * @type {Array<Object>}
     */
    selectedItems: TableItem[]

    /**
     * Tracks the header-sorted result emitted from the `TableHeader` so the body can render in order.
     * @type {Array<Object>}
     */
    sortedItems: TableItem[]

    /**
     * Local pagination params used when search mode paginates the cached data.
     * @type {Object}
     */
    searchPageParams: PaginationParams
  } {
    return {
      /**
       * The set of IDs currently selected via the checkbox/radio controls.
       * @type {Array<number>}
       */
      selectedIds: [],

      /**
       * The corresponding items that match the selected IDs.
       * @type {Array<Object>}
       */
      selectedItems: [],

      /**
       * Tracks the header-sorted result emitted from the `TableHeader` so the body can render in order.
       * @type {Array<Object>}
       */
      sortedItems: [],

      /**
       * Local pagination params used when search mode paginates the cached data.
       * @type {Object}
       */
      searchPageParams: {
        page: 1,
        page_size: (this.pagination as PaginationParams).page_size,
      },
    }
  },

  props: {
    /**
     * The main title of the table, displayed as a `<caption>` for accessibility and context.
     * @type {String}
     * @required
     */
    caption: {
      type: String,
      required: true,
    },

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

    /**
     * The total number of items available across all pages. Required for calculating total pages.
     * @type {Number}
     * @default 0
     */
    totalItems: {
      type: Number,
      required: false,
      default: 0,
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
     * @property {string|Object} [dataClass] - CSS classes for the data cells. Can be a string for static classes, or an object for dynamic classes (e.g., `{ fmt: 'statusClass', match: true }`).
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
    items: {
      type: Array as PropType<TableItem[]>,
      required: true,
    },

    // All items where search occurs
    /**
     * Optional array containing every item. Used when search mode operates locally.
     * @type {Array<Object>}
     */

    /**
     * Cached dataset fetched for search mode; used to derive searchResults/sortedItems.
     * @type {Array<Object>}
     */
    allItems: {
      type: Array as PropType<TableItem[]>,
      default: () => [],
    },

    /**
     * Controls the selection mode of the table ('checkbox' or 'radio').
     * When provided, a `selection` column should be present to render inputs.
     */
    selectionType: {
      type: String,
      default: null,
    },

    /**
     * The `name` attribute applied to selection inputs to keep radio groups linked.
     */
    selectionName: {
      type: String,
      default: null,
    },

    /**
     * Enables the search mode UI and behavior.
     * @type {boolean}
     */
    enableSearch: {
      type: Boolean,
      required: false,
    },

    /**
     * Controls whether the table is in default pagination (0), search prep (1), or active search (2).
     * @type {number}
     */
    currentMode: {
      type: Number,
      required: false,
      default: 0,
    },

    /**
     * Enables client-side pagination fallbacks when the backend can't paginate (search mode relies on local slices).
     * @type {Boolean}
     */
    enableClientPagination: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    /**
     * Provides the pagination block (server vs. search-mode) used by the footer.
     * @returns {Object}
     */
    activePagination(): Pagination {
      return this.currentMode === 0 && !this.enableClientPagination
        ? this.pagination
        : this.searchPageParams
    },

    /**
     * Calculates the total number of rows currently available (default mode uses API total, search mode uses filtered length).
     * @returns {number}
     */
    activeTotalItems(): number {
      return this.currentMode === 0 && !this.enableClientPagination
        ? this.totalItems
        : this.sortedItems.length
    },

    /**
     * Returns the currently sorted slice of rows depending on the mode (sliced search-mode pagination).
     * @returns {Array<Object>}
     */
    activeSortedItems(): TableItem[] {
      if (this.currentMode === 0 && !this.enableClientPagination) {
        return this.sortedItems
      }

      const pageSize = this.searchPageParams.page_size
      const start = (this.searchPageParams.page - 1) * pageSize

      return this.sortedItems.slice(start, start + pageSize)
    },
  },

  methods: {
    /**
     * Emits a 'pagination-change' event with the new pagination parameters.
     * In search mode this also updates the local pagination state.
     * @param {Object} value - The new pagination parameters (e.g., `{ page: 2 }` or `{ page_size: 10 }`).
     */
    handlePageChange(value: PaginationChange): void {
      // Handles pagination for search mode (1/2) while parent handles pagination for default mode
      if (this.currentMode !== 0 || this.enableClientPagination) {
        // enableClientPagination treats default mode like search mode for local pagination state
        this.searchPageParams = { ...this.searchPageParams, ...value }
      }

      this.$emit('pagination-change', value)
    },

    /**
     * Captures sorted data from the header and resets search pagination to page 1.
     * @param {Array<Object>} value - The sorted rows.
     */
    handleSortChange(value: TableItem[]): void {
      this.sortedItems = value

      // Reset the search-mode pagination to the first page after resorting.
      if (this.currentMode !== 0 || this.enableClientPagination) {
        // When enableClientPagination is on we mimic search-mode pagination even in default mode.
        this.searchPageParams = {
          ...this.searchPageParams,
          page: 1,
        }
      }
    },

    /**
     * Notifies parent/layout about the current search mode state.
     * @param {number} newMode - Mode identifier (0 default, 1 search preparation, 2 active search).
     */
    handleSearchMode(newMode: number): void {
      // Handles pagination for search mode (1/2) while parent handles pagination for default mode
      if (newMode !== 0 || this.enableClientPagination) {
        // allow enabling client pagination to reuse the search-mode pager even without entering mode 1/2
        this.searchPageParams = {
          page: 1,
          page_size: (this.pagination as PaginationParams).page_size,
        }
      }

      this.$emit('change-search-mode', newMode)
    },

    /**
     * Updates the selected ID list, allowing radio/checkbox controls and the header checkbox to keep state.
     * @param {(number|number[])} id - The selected ID or array of IDs when triggered by the header checkbox.
     * @param {boolean} selectAll - When true, the caller is selecting/deselecting all rows.
     */
    handleSelectionChange(id: string | number | Array<string | number>, selectAll = false): void {
      if (selectAll) {
        this.selectedIds = Array.isArray(id) ? id : [id]
      } else if (this.selectionType === 'radio') {
        if (!Array.isArray(id)) {
          this.selectedIds = [id]
        }
      } else {
        if (Array.isArray(id)) return

        this.selectedIds = this.selectedIds.includes(id)
          ? this.selectedIds.filter((value) => value !== id)
          : [...this.selectedIds, id]
      }

      this.selectedItems = this.items.filter((item) => this.selectedIds.includes(item.id))

      this.$emit('selection-change', this.selectedItems)
    },
  },
})
</script>
