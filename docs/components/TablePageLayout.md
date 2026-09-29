# Table Page Layout

A reusable layout component for building tabbed, paginated data tables.

`TablePageLayout` manages tabs, API data fetching, pagination, search-mode state, loading/error states, and refresh behavior while delegating table rendering to the `BaseTable` component.

The component is located at:

```text
src/components/Base/TablePageLayout.vue
```

## Features

- Tabbed table views
- API data fetching
- Server-side pagination
- Client-side pagination support
- Search-mode support
- Loading and error states
- Automatic data refresh
- External refresh control
- Tab-specific API parameters
- Table selection event forwarding
- Flexible `BaseTable` prop forwarding

## Basic Usage

```vue
<TablePageLayout
    :tabs="tabs"
    name="Users"
    :item-headings="headings"
    :getter="getUsers"
    :loading="loading"
/>
```

A typical configuration:

```ts
const tabs = [
    {
        id: 'all',
        label: 'All',
        caption: 'All Users',
        params: {},
    },
    {
        id: 'active',
        label: 'Active',
        caption: 'Active Users',
        params: {
            status: 'active',
        },
    },
]
```

## Props

### `pageDescription`

```ts
pageDescription?: string
```

Description displayed above the tab navigation.

Default:

```text
''
```

### `tabs`

```ts
tabs: TabItem[]
```

Defines the available tabs.

Each tab has the following structure:

```ts
interface TabItem {
    id: string
    caption?: string
    label: string
    params?: Record<string, unknown>
}
```

| Property  | Type                      | Description                                             |
| --------- | ------------------------- | ------------------------------------------------------- |
| `id`      | `string`                  | Unique identifier for the tab.                          |
| `label`   | `string`                  | Text displayed on the tab button.                       |
| `caption` | `string`                  | Optional caption displayed above the table.             |
| `params`  | `Record<string, unknown>` | Optional API parameters applied when the tab is active. |

Example:

```ts
const tabs = [
    {
        id: 'all',
        label: 'All',
        caption: 'All Users',
        params: {},
    },
    {
        id: 'active',
        label: 'Active',
        caption: 'Active Users',
        params: {
            status: 'active',
        },
    },
]
```

### `name`

```ts
name: string
```

Descriptive name for the items displayed in the table.

Required.

Example:

```text
Users
Partners
Devices
```

### `navClass`

```ts
navClass?: string
```

Additional Tailwind classes applied to the tab navigation.

Default:

```text
''
```

If no custom grid class is supplied, the component uses:

```text
grid-cols-3
```

Example:

```vue
<TablePageLayout nav-class="grid-cols-4" />
```

### `itemHeadings`

```ts
itemHeadings: TableField[]
```

Column configuration passed to `BaseTable`.

Required.

See [Table](Table.md) for the complete `TableField` definition.

### `enableSearch`

```ts
enableSearch?: boolean
```

Enables search functionality in the underlying `BaseTable`.

Default:

```text
false
```

### `getter`

```ts
getter: Getter
```

Function responsible for fetching table data.

The getter receives the combined tab and pagination parameters.

```ts
export type Getter = (params: Record<string, unknown>) => Promise<GetterResponse>
```

The getter can return either a paginated response:

```ts
{
  count: number
  results: TableItem[]
}
```

or a plain array:

```ts
TableItem[]
```

Example:

```ts
const getUsers: Getter = async (params) => {
    return await usersApi.list(params)
}
```

### `refreshKey`

```ts
refreshKey?: string | number | null
```

External value used to force the table to reset and fetch its data again.

When the value changes, the component calls `resetAndFetch()`.

Default:

```text
null
```

Example:

```vue
<TablePageLayout :refresh-key="refreshKey" />
```

### `extraProps`

```ts
extraProps?: Record<string, unknown>
```

Additional properties forwarded directly to `BaseTable`.

This is useful for less-common table configuration such as selection.

Example:

```vue
<TablePageLayout
    :extra-props="{
        selectionType: 'checkbox',
        selectionName: 'users',
    }"
/>
```

### `enableClientPagination`

```ts
enableClientPagination?: boolean
```

Enables client-side pagination in the underlying `BaseTable`.

When enabled, server-side pagination parameters are not included in getter requests.

Default:

```text
false
```

## Data Types

### `GetterResponse`

```ts
export type GetterResponse =
    | {
          count: number
          results: TableItem[]
      }
    | TableItem[]
```

The getter supports both paginated API responses and unpaginated arrays.

### `Getter`

```ts
export type Getter = (params: Record<string, unknown>) => Promise<GetterResponse>
```

The function used to retrieve table data.

## Events

### `pagination-change`

Handled internally by `TablePageLayout` and used to update server-side pagination.

When the table is in default mode, the updated pagination parameters are sent to the getter.

### `change-search-mode`

Handled internally to synchronize the layout's search mode with `BaseTable`.

Search modes:

| Mode | Description                     |
| ---- | ------------------------------- |
| `0`  | Default/server pagination mode. |
| `1`  | Search preparation mode.        |
| `2`  | Active local search mode.       |

### `selection-change`

Forwarded from `BaseTable`.

Payload:

```ts
TableItem[]
```

Example:

```vue
<TablePageLayout @selection-change="handleSelectionChange" />
```

### `openPopup`

Forwarded directly from `BaseTable`.

Example:

```vue
<TablePageLayout @openPopup="openPopup" />
```

### `refreshed`

Emitted when the table refresh handler is triggered.

Example:

```vue
<TablePageLayout @refreshed="handleRefreshed" />
```

## Internal State

### `items`

```ts
TableItem[]
```

The currently displayed table items.

### `allItems`

```ts
TableItem[]
```

Cached dataset used during local search.

### `error`

```ts
boolean
```

Indicates whether the most recent API request failed.

### `loading`

```ts
boolean
```

Indicates whether table data is currently being fetched.

### `activeTab`

```ts
number
```

Index of the currently selected tab.

The first tab has index `0`.

### `pageParams`

```ts
PaginationParams
```

Current server-side pagination parameters.

Default:

```ts
{
  page: 1,
  page_size: 5,
}
```

### `totalItems`

```ts
number
```

Total number of items returned by a paginated API response.

### `currentMode`

```ts
number
```

Current search mode.

```text
0 = default mode
1 = search preparation
2 = active search
```

## Computed Properties

### `activeCaption`

Returns the caption associated with the active tab.

If the active tab has no caption, it returns:

```text
None
```

### `activeTabId`

Returns the ID of the active tab.

```ts
string | undefined
```

### `activeParams`

Returns the API parameters associated with the active tab.

```ts
Record<string, unknown>
```

If the tab has no parameters, an empty object is returned.

### `navClasses`

Builds the Tailwind classes used by the tab navigation.

The default classes are:

```text
grid gap-2 nav-tab text-center grid-cols-3
```

A custom `navClass` replaces the default grid-column class.

## Data Fetching

Data is initially fetched when the component is mounted:

```ts
await this.getItems()
```

The request parameters depend on the current mode.

### Default mode

When `currentMode === 0` and client pagination is disabled, the getter receives:

```ts
{
  ...pageParams,
  ...activeParams,
}
```

For example:

```ts
{
  page: 1,
  page_size: 5,
  status: 'active',
}
```

### Search mode

When search mode is active, only the active tab parameters are sent:

```ts
{
  ...activeParams,
}
```

This allows the component to retrieve the complete dataset for local searching.

### Client pagination

When `enableClientPagination` is enabled, pagination parameters are not sent to the API.

`BaseTable` manages pagination locally.

## Tab Switching

When a tab is selected:

1. The active tab is updated.
2. Pagination is reset to page `1`.
3. Cached search data is cleared.
4. Search mode is reset.
5. Data is fetched for the new tab.

```ts
activeTab = index
pageParams = {
    page: 1,
    page_size: pageParams.page_size,
}
allItems = []
currentMode = 0
```

## Pagination

In default mode, pagination is handled server-side.

When pagination changes:

```ts
pageParams = {
    ...pageParams,
    ...next,
}
```

The component then fetches the updated page.

During search mode, the component retrieves the dataset when required and allows `BaseTable` to handle local pagination.

## Search Mode

Search mode works together with `BaseTable`.

The flow is:

```text
Default Mode
     │
     ▼
Search Preparation
     │
     ▼
Fetch Complete Dataset
     │
     ▼
Active Search
     │
     ▼
Local Filtering + Pagination
```

When leaving search mode, the table returns to default pagination and reloads page `1`.

## Refreshing Data

The component supports two refresh mechanisms.

### `refreshKey`

Changing `refreshKey` causes the table to reset and fetch again.

```vue
<TablePageLayout :refresh-key="refreshKey" />
```

### Table refresh event

When `BaseTable` emits `refresh`, the layout:

1. Emits `refreshed`.
2. Fetches the current table data again.

## Error Handling

If the getter throws an error:

```ts
this.error = true
```

The component also displays an error notification using:

```ts
this.$notifyError(message)
```

The loading state is reset in the `finally` block.

## Component Structure

```text
TablePageLayout
│
├── Page Description
│
├── Tab Navigation
│   └── Tab Buttons
│
└── BaseTable
    ├── TableHeader
    ├── TableBody
    └── TableFooter
```

## Data Flow

```text
Parent Page
     │
     ├── tabs
     ├── itemHeadings
     ├── getter
     └── table configuration
     │
     ▼
TablePageLayout
     │
     ├── active tab
     ├── pagination
     ├── search mode
     └── data fetching
     │
     ▼
BaseTable
     │
     ├── sorting
     ├── searching
     ├── selection
     └── pagination
     │
     ▼
TablePageLayout
     │
     └── events / refresh
     │
     ▼
Parent Page
```

## Testing

Unit tests are located at:

```text
src/components/Base/__tests__/TablePageLayout.spec.ts
```

Run the tests with:

```bash
pnpm vitest --run src/components/Base/__tests__/TablePageLayout.spec.ts
```

Run the complete test suite with:

```bash
pnpm vitest --run
```

## Related Components

- [Table](Table.md) — Reusable table component.
- `TableHeader` — Table headings, sorting, search, and selection.
- `TableBody` — Table rows, states, formatters, and actions.
- `TableFooter` — Pagination controls.
