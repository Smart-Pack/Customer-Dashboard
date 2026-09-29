/**
 * @module api
 * @description Public entry point for API modules used by the dashboard.
 */

import api from './modules'
import './interceptors'

/**
 * Re-exports all API modules.
 */
export * from './modules'

/**
 * Default API interface containing all available API modules.
 */
export default api
