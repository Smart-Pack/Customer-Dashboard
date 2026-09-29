import { getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import type { SweetAlertOptions } from 'sweetalert2'

export function useGlobals() {
  const instance = getCurrentInstance()

  if (!instance) {
    throw new Error('useGlobals() must be called inside setup().')
  }

  const { appContext } = instance
  const router = useRouter()

  return {
    $api: appContext.config.globalProperties.$api,
    $notifySuccess: appContext.config.globalProperties.$notifySuccess as (
      message: string,
      overrides?: SweetAlertOptions,
    ) => Promise<unknown>,
    $notifyError: appContext.config.globalProperties.$notifyError as (
      message: string,
      overrides?: SweetAlertOptions,
    ) => Promise<unknown>,
    $deleteModal: appContext.config.globalProperties.$deleteModal as (
      action: string,
      message: string,
      overrides?: SweetAlertOptions,
    ) => Promise<boolean>,
    $router: router,
  }
}
