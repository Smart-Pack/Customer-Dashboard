// stores/modules/auth/constants.ts

/**
 * Account Types that are allowed to access the admin dashboard and protected routes.
 *
 * @type {string[]}
 * @constant
 * @example
 * import { ALLOWED_ACCOUNT_TYPES } from './constants';
 * if (ALLOWED_ACCOUNT_TYPES.includes(user.account_types)) {
 *   // user is authorized
 * }
 */
export const ALLOWED_ACCOUNT_TYPES = ['internal']
