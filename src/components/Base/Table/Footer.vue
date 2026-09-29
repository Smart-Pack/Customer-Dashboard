<template>
  <!-- Pagination of Table -->
  <tfoot>
    <tr>
      <td
        :colspan="totalColumns"
        class="p-4 whitespace-nowrap lg:whitespace-normal text-sm lg:text-base"
      >
        <div class="flex justify-between gap-2">
          <!-- Choose number of rows show -->
          <div class="flex gap-4 items-center">
            <span class="secondary-text font-semibold">Rows per page</span>
            <div>
              <InputField
                v-model="pageSizeModel"
                name="page_size"
                variant="select"
                :options="rowOptions"
                :sync-external-value="true"
              />
            </div>
          </div>

          <!-- Choose pages to select -->
          <div class="flex gap-4 items-center">
            <span class="secondary-text font-semibold">Current Page</span>
            <div>
              <InputField
                v-model="pageModel"
                name="current_page"
                variant="select"
                :options="pageOptions"
                :sync-external-value="true"
              />
            </div>
            <span class="secondary-text font-semibold"> of {{ totalPages }} </span>
          </div>

          <!-- Choose Next/ Current Page -->
          <div class="flex gap-4">
            <button
              :disabled="paginationParams.page === 1"
              type="button"
              class="flex items-center px-2 py-1 form-submit disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              @click="handlePageChange({ page: paginationParams.page - 1 })"
            >
              <LeftIcon class="mr-1 w-4 h-4 text-white stroke-[3]" />
              <span> Previous</span>
            </button>

            <button
              :disabled="paginationParams.page >= totalPages"
              type="button"
              class="flex items-center px-2 py-1 form-submit disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              @click="handlePageChange({ page: paginationParams.page + 1 })"
            >
              <span> Next </span>
              <RightIcon class="ml-1 w-4 h-4 text-white stroke-[3]" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  </tfoot>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import LeftIcon from '@/components/Icons/LeftIcon.vue'
import RightIcon from '@/components/Icons/RightIcon.vue'
import InputField from '@/components/Base/InputField.vue'
import type { Pagination, PaginationChange, PaginationParams } from './types'

/**
 * Option used by the rows-per-page and page selectors.
 */
interface SelectOption {
  /** The value submitted when the option is selected. */
  value: number
  /** The label displayed to the user. */
  label: string
}

/**
 * @memberof module:components/Base/Table
 * @description The footer component for the BaseTable. It is responsible for rendering
 * the pagination controls, honoring the parent column count so its row spans every column,
 * and emitting pagination-change events whenever rows or pages update.
 * @displayName TableFooter
 */
export default defineComponent({
  name: 'TableFooter',

  components: {
    InputField,
    LeftIcon,
    RightIcon,
  },

  props: {
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
      required: true,
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
     * The total number of columns in the parent table.
     * Used to make the footer span the full table width.
     */
    totalColumns: {
      type: Number,
      required: false,
      default: 0,
    },
  },

  emits: {
    /**
     * Emitted whenever the current page or page size changes.
     */
    'pagination-change': (value: PaginationChange) => {
      return (
        (value.page === undefined || typeof value.page === 'number') &&
        (value.page_size === undefined || typeof value.page_size === 'number')
      )
    },
  },

  data() {
    return {
      rowOptions: [
        { value: 5, label: '5' },
        { value: 10, label: '10' },
        { value: 25, label: '25' },
        { value: 50, label: '50' },
      ] as SelectOption[],
    }
  },

  computed: {
    paginationParams(): PaginationParams {
      return this.pagination as PaginationParams
    },
    /**
     * Calculates the total number of pages based on the total number of items
     * and the selected page size.
     */
    totalPages(): number {
      const pagination = this.pagination

      if (typeof pagination === 'string') {
        return 1
      }

      const pageSize = Number(pagination?.page_size) || 5

      if (!this.totalItems) {
        return 1
      }

      return Math.max(1, Math.ceil(this.totalItems / pageSize))
    },

    /**
     * Proxy computed used to back the rows-per-page select so changes emit the pagination-change event.
     */
    pageSizeModel: {
      get(): number {
        const pagination = this.pagination

        if (typeof pagination === 'string') {
          return 5
        }

        return pagination?.page_size ?? 5
      },

      set(value: number | string) {
        this.handlePageChange({
          page_size: Number(value),
          page: 1,
        })
      },
    },

    /**
     * Proxy computed for the current page selector so v-model updates trigger pagination changes.
     */
    pageModel: {
      get(): number {
        const pagination = this.pagination

        if (typeof pagination === 'string') {
          return 1
        }

        return pagination?.page ?? 1
      },

      set(value: number | string) {
        this.handlePageChange({
          page: Number(value),
        })
      },
    },

    /**
     * Generates options for the page selection dropdown.
     * @returns {Array<Object>} An array of objects with `value` and `label` for each page.
     */
    pageOptions(): SelectOption[] {
      const pagination = this.pagination

      if (!this.totalItems || typeof pagination === 'string' || !pagination?.page_size) {
        return []
      }

      const pageCount = Math.ceil(this.totalItems / pagination.page_size)

      return Array.from({ length: pageCount }, (_, index) => ({
        value: index + 1,
        label: `${index + 1}`,
      }))
    },
  },

  methods: {
    /**
     * Proxies pagination updates back to the parent table so it can fetch the new page/size.
     * @param {object} value
     */
    handlePageChange(value: PaginationChange): void {
      this.$emit('pagination-change', value)
    },
  },
})
</script>

<style scoped></style>
