<template>
  <section class="w-full mt-2">
    <p v-if="pageDescription" class="secondary-text p-4 text-sm lg:text-base">
      {{ pageDescription }}
    </p>
    <nav :class="navClasses">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.id"
        type="button"
        class="col-span-1 py-2 text-xs lg:text-sm"
        :class="activeTabId === tab.id ? 'nav-tab-active' : 'hover:nav-tab-active'"
        @click="handleSetActiveTab(index)"
      >
        {{ tab.label }}
      </button>
    </nav>
    <div class="overflow-x-auto">
      <BaseTable
        :caption="activeCaption"
        :loading="loading"
        :headings="itemHeadings"
        :items="items"
        :all-items="allItems"
        :name="name"
        :error="error"
        :pagination="pageParams"
        :total-items="totalItems"
        @pagination-change="handlePaginationChange"
        :enable-search="enableSearch"
        :current-mode="currentMode"
        :enable-client-pagination="enableClientPagination"
        @change-search-mode="handleSearchMode"
        @selection-change="handleSelectionChange"
        @open-popup="$emit('openPopup', $event)"
        @refresh="handleRefresh"
        v-bind="extraProps"
      />
    </div>
  </section>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import BaseTable from '@/components/Base/Table/index.vue'
import type {
  TableItem,
  TableField,
  PaginationParams,
  PaginationChange,
} from '@/components/Base/Table/types'

/**
 * Represents a single tab definition used to filter the table.
 */
interface TabItem {
  id: string
  caption?: string
  label: string
  params?: object
}

/**
 * Represents the response shape returned by `getter`. Either a paginated
 * envelope with a `count` and `results`, or a plain array of items.
 */
export type GetterResponse = { count: number; results: TableItem[] } | TableItem[]

/**
 * Represents the function used to fetch table data, given the combined
 * page and tab query parameters.
 */
export type Getter = (params: Record<string, unknown>) => Promise<GetterResponse>

/**
 * @module components/Base/TablePageLayout
 * @description A reusable layout component for tabbed, paginated tables. It manages
 * tab rendering (with a customizable Tailwind-friendly grid class), data fetching,
 * and pagination, while delegating the actual table rendering to `BaseTable`.
 * @displayName TablePageLayout
 */
export default defineComponent({
  name: 'TablePageLayout',

  components: { BaseTable },

  data(): {
    items: TableItem[]
    allItems: TableItem[]
    error: boolean
    loading: boolean
    activeTab: number
    pageParams: PaginationParams
    totalItems: number
    currentMode: number
  } {
    return {
      /**
       * An array of item objects to display in the table.
       * @type {Array<object>}
       */
      items: [],

      /**
       * Cached dataset fetched when the user enters search mode.
       * @type {Array<Object>}
       */
      allItems: [],

      /**
       * Indicates if an error occurred while fetching items.
       * @type {boolean}
       */
      error: false,

      /**
       * Indicates if the items data is currently being loaded.
       * @type {boolean}
       */
      loading: true,

      /**
       * The index of the currently active tab.
       * @type {number}
       */
      activeTab: 0,

      /**
       * Parameters for API requests, including pagination.
       * @type {object}
       */
      pageParams: { page: 1, page_size: 5 },

      /**
       * The total count of items available, used for pagination.
       * @type {number}
       */
      totalItems: 0,

      /**
       * Tracks the current mode: 0 = default pagination, 1 = search mode preparing data, 2 = active search results.
       * @type {number}
       */
      currentMode: 0,
    }
  },

  async mounted() {
    await this.getItems()
  },

  props: {
    /**
     * A description of the page to be displayed above the tabs.
     * @type {String}
     * @required
     */
    pageDescription: { type: String, required: false, default: '' },

    /**
     * An array of objects defining the tabs for filtering the table.
     * @type {Array<Object>}
     * @property {string} id - A unique identifier for the tab.
     * @property {string} caption - The caption to display above the table when this tab is active.
     * @property {string} label - The text to display on the tab button.
     * @property {Object} params - The API query parameters to apply when this tab is active.
     * @required
     */
    tabs: {
      type: Array as PropType<TabItem[]>,
      required: true,
    },

    /**
     * A descriptive name for the items in the table (e.g., "Partners", "Users").
     * @type {String}
     * @required
     */
    name: { type: String, required: true },

    navClass: { type: String, required: false, default: '' },

    /**
     * The heading configuration object to be passed to the `BaseTable` component.
     * @type {Array<Object>}
     * @required
     */
    itemHeadings: {
      type: Array as PropType<TableField[]>,
      required: true,
    },

    /**
     * When true, exposes the search-mode controls in the table header.
     * @type {boolean}
     * @default false
     */
    enableSearch: { type: Boolean, default: false },

    /**
     * The function from the API service that should be called to fetch the data.
     * This function will be passed the combined page and tab parameters.
     * @type {Function}
     * @required
     */
    getter: {
      type: Function as PropType<Getter>,
      required: true,
    },

    /**
     * Watch this value (number/timestamp) to force the layout to reset and refetch.
     * @type {String|Number|null}
     */
    refreshKey: {
      type: [String, Number] as PropType<string | number | null>,
      default: null,
    },

    /**
     * Additional props forwarded to `BaseTable` for less-common controls (selection, custom rendering).
     * @type {Object}
     */
    extraProps: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },

    /**
     * When true the layout bypasses server pagination and relies on the `BaseTable` client pagination mode instead.
     * This keeps search-mode pagination controls active even when the API does not page.
     * @type {Boolean}
     */
    enableClientPagination: { type: Boolean, default: false },
  },

  computed: {
    /**
     * Caption displayed based on the currently selected tab.
     * @returns {string}
     */
    activeCaption(): string {
      const tab = this.tabs[this.activeTab]
      return tab?.caption || 'None'
    },
    activeTabId(): string | undefined {
      return this.tabs[this.activeTab]?.id
    },
    /**
     * Parameters associated with the active tab (used for API queries).
     * @returns {Object}
     */
    activeParams(): object {
      const tab = this.tabs[this.activeTab]
      return tab?.params || {}
    },

    /**
     * Calculates the tailwind grid classes used for tab buttons.
     * @returns {string}
     */
    navClasses(): string {
      return ['grid gap-2 nav-tab text-center', this.navClass || 'grid-cols-3'].join(' ')
    },
  },

  methods: {
    /**
     * Fetches items data from the API based on current `tableParams`.
     * Updates the `items` array, `totalPartners`, `loading` state, and `error` state.
     * Displays an error notification if the API call fails.
     */
    async getItems(): Promise<void> {
      try {
        this.error = false
        this.loading = true
        // Default mode get pagination value, search mode get all values
        // When enableClientPagination is true we treat every request as search-mode (no server paging).
        const params =
          this.enableClientPagination || this.currentMode !== 0
            ? { ...this.activeParams }
            : { ...this.pageParams, ...this.activeParams }

        const response = await this.getter(params)

        if (!Array.isArray(response) && response.count !== undefined) {
          this.totalItems = response.count
          // Default mode
          if (this.currentMode === 0) {
            this.items = response.results
            // Search mode
          } else {
            this.allItems = response.results
          }
        } else {
          this.items = response as TableItem[]
          this.allItems = response as TableItem[]
        }
      } catch (e: unknown) {
        this.error = true
        const message = e instanceof Error ? e.message : 'Unable to fetch data.'
        this.$notifyError(message)
      } finally {
        this.loading = false
      }
    },

    /**
     * Handles tab switching for item status filtering.
     * Updates `tableParams` and re-fetches items.
     * @param {string} tab - The name of the tab to activate ('all', 'active', 'suspended').
     */
    async handleSetActiveTab(index: number): Promise<void> {
      this.activeTab = index
      this.pageParams = { page: 1, page_size: this.pageParams.page_size }
      // Reset Search Mode
      this.allItems = []
      this.currentMode = 0
      this.getItems()
    },

    /**
     * Handles changes in pagination parameters (page number or page size).
     * Updates `pageParams` (default mode) or prepares cached data (search mode) and refetches as needed.
     * @param {object} next - An object containing the updated pagination parameters.
     */
    async handlePaginationChange(next: PaginationChange): Promise<void> {
      if (this.enableClientPagination) return // client pagination handles paging locally when this flag is on
      // reload with new params if needed only when default mode
      if (this.currentMode === 0) {
        this.pageParams = { ...this.pageParams, ...next }
        // Only refresh during pagination change when in default mode
        await this.getItems()
      } else if (this.currentMode === 1) {
        // Enter passive search mode (prepare data to search
        if (this.allItems.length === 0) {
          await this.getItems()
        }
      }
      // For search mode ie newMode 2/1, TableIndex will handle its own pagination
    },

    /**
     * Toggles the overall search mode state and synchronizes pagination when entering/exiting search.
     * @param {number} newMode - 0 = default, 1 = search prep, 2 = active search results.
     */
    async handleSearchMode(newMode: number): Promise<void> {
      this.currentMode = newMode
      if (this.enableClientPagination) return // client pagination stays in control; no need to refresh server pagination
      if (newMode === 1) {
        await this.handlePaginationChange({})
      } else if (newMode === 0) {
        // Exit search mode
        await this.handlePaginationChange({ page: 1 })
      }
      // For search mode ie newMode 2/1, TableIndex will handle its own pagination
    },

    /**
     * Resets the active tab/pagination and re-fetches data.
     */
    resetAndFetch(): void {
      this.activeTab = 0
      this.pageParams = { page: 1, page_size: 5 }
      this.getItems()
    },

    /**
     * Proxy for selection-change events emitted by the table body/footer.
     * @param {Array<Object>} selectedItems
     */
    handleSelectionChange(selectedItems: TableItem[]): void {
      this.$emit('selection-change', selectedItems)
    },

    handleRefresh(): void {
      this.$emit('refreshed')
      this.getItems()
    },
  },

  watch: {
    /**
     * Refreshes the table whenever the getter function changes (e.g., switching endpoints).
     */
    getter() {
      this.resetAndFetch()
    },

    /**
     * Reloads the table whenever the external refresh key changes.
     */
    refreshKey(newVal: string | number | null, oldVal: string | number | null) {
      if (newVal !== oldVal) {
        this.resetAndFetch()
      }
    },
  },
})
</script>
<style></style>
