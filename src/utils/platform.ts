/**
 * Checks whether the application is running in Capacitor mobile mode.
 *
 * The Vite `mobile` mode is used when building the native Android application.
 *
 * @returns `true` when running in mobile mode; otherwise, `false`.
 */
export function isMobile(): boolean {
  return import.meta.env.MODE === 'mobile'
}
