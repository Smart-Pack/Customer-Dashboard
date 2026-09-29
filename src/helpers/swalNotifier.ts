/**
 * @module helpers/swalNotifier
 * @description This module provides centralized, consistently-styled notification helpers
 * using SweetAlert2. It exports functions for showing themed success and error messages.
 */
import Swal from 'sweetalert2'
import { useUiStore } from '@/stores'
import type { SweetAlertOptions } from 'sweetalert2'

/**
 * Base configuration for toast-style (top-right) notifications.
 * @type {import('sweetalert2').SweetAlertOptions}
 */
const toastBaseConfig: SweetAlertOptions = {
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  customClass: {
    container: 'z-[1050]',
    popup: 'swal-toast-popup !text-sm',
    timerProgressBar: 'swal-toast-progress',
  },
}

/**
 * Returns the Pinia UI store.
 */
function getUiStore() {
  return useUiStore()
}

/**
 * Displays a success toast notification.
 * @param {string} message - The success message to display.
 * @param {import('sweetalert2').SweetAlertOptions} [overrides={}] - Optional SweetAlert2 configuration to override the defaults.
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export function notifySuccess(message: string, overrides: SweetAlertOptions = {}) {
  return Swal.fire({
    ...toastBaseConfig,
    icon: 'success',
    title: message,
    ...overrides,
  } as SweetAlertOptions)
}

/**
 * Displays a modal-style error notification.
 * This function also manages a backdrop overlay through the Pinia UI store.
 * @param {string} message - The error message to display.
 * @param {import('sweetalert2').SweetAlertOptions} [overrides={}] - Optional SweetAlert2 configuration to override the defaults.
 * @returns {Promise<import('sweetalert2').SweetAlertResult>}
 */
export function notifyError(message: string, overrides: SweetAlertOptions = {}) {
  const uiStore = getUiStore()
  uiStore.updateSwalBackdrop(true)

  return Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonText: 'Close',
    buttonsStyling: false,
    backdrop: false,
    customClass: {
      container: 'z-[1065]',
      popup: 'swal-tailwind-popup',
      confirmButton: 'swal-tailwind-confirm',
    },
    willClose: () => uiStore.updateSwalBackdrop(false),
    ...overrides,
  }).finally(() => uiStore.updateSwalBackdrop(false))
}

/**
 * Shows a confirmation dialog for destructive operations (delete/suspend/activate).
 * Resolves to `true` if the user confirmed, `false` otherwise.
 * @param {string} action - Label for the confirm button and the action being confirmed.
 * @param {string} message - The entity name being actioned (e.g., "John Doe").
 * @param {import('sweetalert2').SweetAlertOptions} [overrides={}] - Additional SweetAlert2 configuration.
 * @returns {Promise<boolean>}
 */
export function deleteModal(action: string, message: string, overrides: SweetAlertOptions = {}) {
  const uiStore = getUiStore()
  uiStore.updateSwalBackdrop(true)

  return Swal.fire({
    icon: 'warning',
    title: `Confirm ${action}`,
    text: `Are you sure you want to ${action} ${message}`,
    showCancelButton: true,
    confirmButtonText: action,
    cancelButtonText: 'Cancel',
    buttonsStyling: false,
    backdrop: false,
    customClass: {
      container: 'z-[1065]',
      popup: 'swal-tailwind-popup',
      confirmButton: 'swal-tailwind-delete',
      cancelButton: 'swal-tailwind-confirm ml-16',
    },
    willClose: () => uiStore.updateSwalBackdrop(false),
    ...overrides,
  })
    .then((result) => result.isConfirmed)
    .finally(() => uiStore.updateSwalBackdrop(false))
}
