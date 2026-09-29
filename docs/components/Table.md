# Base Table

A reusable and configurable table component for displaying collections of data in the SmartPack Admin Dashboard.

The table is composed of three sub-components:

* `TableHeader` — renders table headings, sorting, search controls, and selection controls.
* `TableBody` — renders table rows, cells, loading/error/empty states, and row actions.
* `TableFooter` — renders pagination controls.

The main component is located at:

```text
src/components/Base/Table/index.vue
```

## Features

* TypeScript support
* Client-side sorting
* Server-side pagination
* Client-side pagination
* Search mode support
* Loading and error states
* Empty-state handling
* Checkbox and radio selection
* Custom field formatters
* Dynamic data classes
* Row and field actions
* Popup actions
* Route actions
* Custom function actions
* External links
* Pagination event handling
* Responsive table layout

## Basic Usage

```vue
<BaseTable
  caption="Users"
  :headings="headings"
  :items="users"
  :loading="loading"
  :error="error"
  :pagination="pagination"
  :total-items="totalItems"
/>
```

## Props

### `caption`

```ts
caption: string
```

The title displayed above the table.

The caption is hidden when its value is:

```text
None
```

Required.

### `name`

```ts
name?: string
```

Descriptive name used by the table and its child components.

Default:

```text
''
```

### `headings`

```ts
headings: TableField[]
```

Defines the table columns.

Example:

```ts
const headings: TableField[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
  },
]
```

Required.

### `items`

```ts
items: TableItem[]
```

The rows displayed by the table.

Example:

```ts
const users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
]
```

Required.

### `allItems`

```ts
allItems?: TableItem[]
```

Contains the complete dataset used when performing client-side searching.

Default:

```ts
[]
```

### `pagination`

```ts
pagination?: Pagination
```

Pagination information supplied by the API.

The type is:

```ts
type Pagination = PaginationParams | string
```

A pagination object contains:

```ts
interface PaginationParams {
  page: number
  page_size: number
  [key: string]: unknown
}
```

An empty string disables the pagination footer.

Example:

```ts
const pagination = {
  page: 1,
  page_size: 20,
}
```

### `totalItems`

```ts
totalItems?: number
```

Total number of items available across all server-side pages.

Default:

```text
0
```

### `loading`

```ts
loading: boolean
```

Controls the table loading state.

Required.

### `error`

```ts
error: boolean
```

Indicates whether an error occurred while fetching table data.

Required.

### `selectionType`

```ts
selectionType?: string
```

Controls row selection.

Supported values include:

```text
checkbox
radio
```

### `selectionName`

```ts
selectionName?: string
```

Name used for radio-button selection.

### `enableSearch`

```ts
enableSearch?: boolean
```

Enables the table search functionality.

### `currentMode`

```ts
currentMode?: number
```

Controls the current search mode.

The default mode is:

```text
0
```

The table uses the mode to determine whether pagination should use server-side or local state.

### `enableClientPagination`

```ts
enableClientPagination?: boolean
```

Enables client-side pagination.

When enabled, the table paginates the locally available sorted dataset rather than relying on the API pagination state.

## Types

The shared table types are defined in:

```text
src/components/Base/Table/types.ts
```

### `TableItem`

```ts
interface TableItem {
  id: string | number
  [key: string]: unknown
}
```

Every table item must have an `id`.

Both string and numeric IDs are supported.

### `TableField`

```ts
interface TableField {
  key: string
  label: string
  sortable?: boolean
  defaultSort?: {
    direction: 'asc' | 'desc'
  }
  dataClass?: string | DataClassConfig
  formatter?:
    | ((value: unknown, item: TableItem) => unknown)
    | FormatterObject
  action?: TableAction | TableAction[]
  click?: {
    getLink?: (item: TableItem) => string | null | undefined
  }
  button?: {
    class?: string
    fn: (item: TableItem) => Promise<unknown> | unknown
  }
  component?: unknown
}
```

### `PaginationParams`

```ts
interface PaginationParams {
  page: number
  page_size: number
  [key: string]: unknown
}
```

### `PaginationChange`

```ts
type PaginationChange = Partial<PaginationParams>
```

Used when notifying the parent that pagination has changed.

For example:

```ts
{
  page: 2
}
```

or:

```ts
{
  page_size: 50
}
```

### `ActionCondition`

```ts
interface ActionCondition {
  key: string
  match: unknown
}
```

Controls conditional visibility of an action.

### `TableAction`

Actions can be route, popup, or function-based actions.

```ts
type TableAction =
  | RouteAction
  | PopupAction
  | FunctionAction
```

## Events

### `pagination-change`

Emitted when pagination changes.

Payload:

```ts
PaginationChange
```

Example:

```vue
<BaseTable
  @pagination-change="handlePaginationChange"
/>
```

```ts
function handlePaginationChange(change: PaginationChange) {
  fetchUsers(change)
}
```

### `selection-change`

Emitted when selected rows change.

Payload:

```ts
TableItem[]
```

Example:

```vue
<BaseTable
  @selection-change="handleSelectionChange"
/>
```

### `change-search-mode`

Emitted when the table search mode changes.

Example:

```vue
<BaseTable
  @change-search-mode="handleSearchMode"
/>
```

### `openPopup`

Proxied from `TableBody` when an action requires opening a popup.

```vue
<BaseTable
  @openPopup="openPopup"
/>
```

### `refresh`

Proxied from `TableBody` when the table needs its parent to refresh the data.

```vue
<BaseTable
  @refresh="refresh"
/>
```

## Sorting

The table maintains the sorted dataset internally.

When sorting changes:

1. The sorted items are updated.
2. Search/client-side pagination is reset to page `1`.
3. The updated dataset is rendered.

The sorting behavior is handled by `TableHeader`.

## Pagination

The table supports both server-side and client-side pagination.

### Server-side pagination

In the default mode, the API pagination object is used directly:

```ts
activePagination = pagination
```

The API-provided `totalItems` is also used:

```ts
activeTotalItems = totalItems
```

### Client-side pagination

When client-side pagination or search mode is active, the table maintains its own pagination state:

```ts
{
  page: 1,
  page_size: pagination.page_size
}
```

The sorted dataset is then sliced according to the active page:

```ts
const start = (page - 1) * pageSize

items.slice(start, start + pageSize)
```

## Selection

The table supports checkbox and radio selection.

Selected IDs are stored as:

```ts
Array<string | number>
```

Selected items are derived from the current table items:

```ts
selectedItems = items.filter(
  item => selectedIds.includes(item.id)
)
```

The selected items are emitted through:

```text
selection-change
```

## Field Formatters

Fields can define a formatter for transforming displayed values.

Example:

```ts
{
  key: 'created_at',
  label: 'Created',
  formatter: {
    func: formatDate,
  },
}
```

A formatter can receive:

* the raw field value
* the complete table item
* optional formatter arguments

## Data Classes

A field can define a static CSS class:

```ts
{
  key: 'status',
  label: 'Status',
  dataClass: 'text-green-600',
}
```

Or dynamically determine the class:

```ts
{
  key: 'status',
  label: 'Status',
  dataClass: {
    fmt: 'statusClass',
    match: 'active',
  },
}
```

## Actions

Fields can define actions for individual rows.

Actions can be:

* route actions
* popup actions
* function actions

Actions can also include conditions controlling whether they are displayed.

Example:

```ts
{
  key: 'actions',
  label: 'Actions',
  action: {
    name: 'Edit',
    route: '/users/edit',
  },
}
```

## Component Structure

```text
Table
├── Header
│   ├── headings
│   ├── sorting
│   ├── search
│   └── selection
│
├── Body
│   ├── rows
│   ├── formatters
│   ├── actions
│   ├── loading state
│   ├── error state
│   └── empty state
│
└── Footer
    └── pagination
```

## Internal Data Flow

```text
Parent Component
       │
       ├── headings
       ├── items
       ├── pagination
       ├── loading
       └── selection configuration
       │
       ▼
    BaseTable
       │
       ├───────────────┐
       ▼               ▼
 TableHeader       TableBody
       │               │
       │               ├── pagination-change
       │               ├── selection-change
       │               ├── openPopup
       │               └── refresh
       │
       └── sort-change
       │
       ▼
 TableFooter
       │
       └── pagination-change
       │
       ▼
    BaseTable
       │
       ▼
    Parent
```

## Testing

Unit tests are located in:

```text
src/components/Base/Table/__tests__/
```

The main table tests are:

```text
index.spec.ts
```

Run the table tests with:

```bash
pnpm vitest --run src/components/Base/Table/__tests__/index.spec.ts
```

Run all tests with:

```bash
pnpm vitest --run
```

## Related Components

```text
src/components/Base/Table/
├── Body.vue
├── Footer.vue
├── Header.vue
├── index.vue
├── types.ts
└── __tests__/
    ├── Body.spec.ts
    ├── Footer.spec.ts
    ├── Header.spec.ts
    └── index.spec.ts
```
