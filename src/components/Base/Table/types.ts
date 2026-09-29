export interface TableItem {
  id: string | number
  _id?: string | number
}

export interface PaginationParams {
  page: number
  page_size: number
  [key: string]: unknown
}

export type PaginationChange = Partial<PaginationParams>
export type Pagination = PaginationParams | string

export interface ActionCondition {
  key: string
  match: unknown
}

interface BaseAction {
  name: string
  type?: 'popup'
  condition?: ActionCondition
}

export interface RouteAction extends BaseAction {
  route: string
}

export interface PopupAction extends BaseAction {
  type: 'popup'
}

export interface FunctionAction extends BaseAction {
  fn: (item: TableItem) => Promise<boolean> | boolean
}

export type TableAction = RouteAction | PopupAction | FunctionAction

export interface DataClassConfig {
  fmt: 'statusClass' | ((rawValue: unknown, item: TableItem) => string)
  match?: unknown
}

export interface FormatterObject {
  func: (rawValue: unknown, item: TableItem, ...args: unknown[]) => unknown
  args?: unknown[]
}

export interface TableField {
  key: string
  label: string
  sortable?: boolean
  defaultSort?: { direction: 'asc' | 'desc' }
  dataClass?: string | DataClassConfig
  formatter?: ((value: unknown, item: TableItem) => unknown) | FormatterObject
  action?: TableAction | TableAction[]
  click?: { getLink?: (item: TableItem) => string | null | undefined }
  button?: { class?: string; fn: (item: TableItem) => Promise<unknown> | unknown }
  component?: unknown
}
