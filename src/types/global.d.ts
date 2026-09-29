import type { SweetAlertOptions } from 'sweetalert2'
import api from '@/api'
import Filters from '@/helpers/filters'

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: typeof api

    $filters: typeof Filters

    $notifySuccess: (message: string, overrides?: SweetAlertOptions) => Promise<unknown>

    $notifyError: (message: string, overrides?: SweetAlertOptions) => Promise<unknown>

    $deleteModal: (
      action: string,
      message: string,
      overrides?: SweetAlertOptions,
    ) => Promise<boolean>
  }
}
