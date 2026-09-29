/**
 * @module helpers/filters
 * @description Global Vue filters for formatting router, session, voucher, user, and date/time values in templates.
 */
export default {
  /**
   * Capitalizes the first character of a string.
   *
   * @param str - The input string to format.
   * @returns The string with its first character uppercased, or an empty string when no value is provided.
   */
  capitalize(str: string): string {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  },
  /**
   * Returns dynamic Tailwind CSS classes for a status badge based on a boolean value.
   * @param {unknown} value - The actual value to check (e.g., `partner.is_active`).
   * @param {unknown} match - The value that should trigger the "active" style (e.g., `true`).
   * @returns {string} A string of Tailwind CSS classes for the badge.
   */
  statusClass(value: unknown, match: unknown): string {
    return value === match
      ? 'table-status-active py-1 px-2 text-sm'
      : 'table-status-inactive py-1 px-2 text-sm'
  },
  /**
   * Formats an ISO date-time string into a localized, human-readable format.
   *
   * @param value - The ISO date-time string to format.
   * @returns The formatted date-time string, or an empty string if the input is falsy.
   */
  dateTime(value: string | null | undefined): string {
    if (!value) return ''

    const date = new Date(value)

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  },
  /**
   * Formats an ISO date string into a localized, human-readable date only (no time).
   * @param value - The ISO date or date-time string to format.
   * @returns The formatted date string, or an empty string if the input is falsy.
   */
  dateOnly(value: string | null | undefined): string {
    if (!value) return ''

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
    }).format(new Date(value))
  },
  /**
   * Returns dynamic Tailwind CSS classes for a status badge based on a boolean value.
   * Mainly used for connectivity status.
   *
   * @param value - The boolean status value.
   * @returns A string of Tailwind CSS classes for the badge.
   */
  activeClass(value: boolean): string {
    const common =
      'text-transparent w-6 h-6 border-2 border-card-border dark:border-card-borderDark rounded-full overflow-hidden p-0 block'

    return value === true ? `bg-green-700 ${common}` : `bg-error ${common}`
  },
}
