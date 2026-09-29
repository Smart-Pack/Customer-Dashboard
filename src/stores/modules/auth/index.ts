/**
 * @module stores/modules/auth
 * @description Authentication store.
 */

import { defineStore } from 'pinia'

import { actions } from './actions'
import { getters } from './getters'
import { state } from './state'

/**
 * Authentication store.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({ ...state }),
  getters,
  actions,
})
