import { pushSubscriptions } from '@/api/modules'
import axios from 'axios'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEBPUSH_VAPID_PUBLIC_KEY

/**
 * Convert a URL-safe Base64 VAPID public key into a Uint8Array
 * required by the browser Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))

  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }

  return output
}

/**
 * Determines whether the current browser supports the APIs required for Web Push notifications.
 *
 * Checks for the availability of the Service Worker API, Push API, and Notifications API.
 * All three APIs must be available for the application to register a service worker,
 * manage push subscriptions, and display system notifications.
 *
 * This function checks API availability only; it does not verify notification permissions,
 * service worker registration status, an existing push subscription, or network connectivity.
 *
 * @returns {boolean} `true` if all required browser APIs are supported; otherwise, `false`.
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Checks whether the current browser has an existing Web Push subscription
 * and permission to display notifications.
 *
 * Verifies that the browser supports the required Web Push APIs, that
 * notification permission has been granted, and that an existing push
 * subscription is associated with the root service worker scope (`/`).
 *
 * Returns `false` if Web Push is unsupported, notification permission has
 * not been granted, no service worker registration exists, or no push
 * subscription is found.
 *
 * This function checks the browser's local state only. It does not verify
 * whether the subscription is valid or registered with the backend.
 *
 * @returns A promise that resolves to `true` if notification permission
 *   is granted and an existing push subscription is found, or `false`
 *   otherwise.
 */
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false
  }

  if (Notification.permission !== 'granted') {
    return false
  }

  const registration = await navigator.serviceWorker.getRegistration('/')

  if (!registration) {
    return false
  }

  return Boolean(await registration.pushManager.getSubscription())
}

/**
 * Registers `/sw.js` and waits for an active service worker.
 *
 * The service worker enables background tasks such as receiving Web Push
 * events when the application is not open in a browser tab.
 *
 * @returns The active service worker registration, or `null` if unsupported
 *          or registration fails.
 */
export async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    await navigator.serviceWorker.register('/sw.js')
    return await navigator.serviceWorker.ready
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

/**
 * Request permission to display browser notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by this browser.')
  }

  return Notification.requestPermission()
}

/**
 * Subscribes the current browser to Web Push notifications and registers
 * the subscription with the authenticated SmartPack backend.
 *
 * Checks browser support and VAPID configuration, requests notification
 * permission, ensures the service worker is ready, and reuses an existing
 * push subscription or creates a new one using the VAPID public key.
 * The resulting subscription is then sent to the backend for storage.
 *
 * @returns A promise that resolves when the subscription is registered
 *          successfully with the backend.
 * @throws {Error} If Web Push is unsupported, the VAPID public key is
 *   missing, notification permission is not granted, service worker
 *   initialization fails, the browser cannot provide a valid subscription
 *   endpoint, or the backend request fails.
 */
export async function subscribeToPushNotifications(): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by this browser.')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('The Web Push VAPID public key is not configured.')
  }

  const permission = await requestNotificationPermission()

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await ensureServiceWorkerReady()

  if (!registration) {
    throw new Error('Failed to register or activate service worker.')
  }

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const subscriptionInfo = subscription.toJSON()

  if (!subscriptionInfo.endpoint) {
    throw new Error('The browser did not provide a valid push subscription endpoint.')
  }

  try {
    await pushSubscriptions.create({
      endpoint: subscriptionInfo.endpoint,
      subscription_info: subscriptionInfo,
    })
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message)
    }

    throw error
  }
}

/**
 * Unsubscribes the current browser from Web Push notifications and removes
 * its corresponding subscription record from the SmartPack backend.
 *
 * Retrieves the existing browser subscription, removes its matching backend
 * record if one exists, and then unsubscribes the browser locally.
 *
 * The backend record is removed first so that an API failure does not leave
 * the browser unsubscribed while its subscription remains registered on the
 * backend.
 *
 * @returns A promise that resolves when the browser is unsubscribed, or
 *          immediately if no service worker registration or push subscription
 *          exists.
 * @throws {Error} If Web Push is unsupported, retrieving or removing the
 *   backend subscription fails, or the browser cannot unsubscribe successfully.
 */
export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by this browser.')
  }

  const registration = await navigator.serviceWorker.getRegistration('/')

  if (!registration) {
    return
  }

  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return
  }

  const endpoint = subscription.endpoint

  let subscriptions

  try {
    subscriptions = await pushSubscriptions.list()
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message)
    }

    throw error
  }

  const existingSubscription = subscriptions.results.find((item) => item.endpoint === endpoint)

  if (existingSubscription) {
    try {
      await pushSubscriptions.remove(existingSubscription.id)
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.message)
      }

      throw error
    }
  }

  const unsubscribed = await subscription.unsubscribe()

  if (!unsubscribed) {
    throw new Error('Failed to unsubscribe from browser push notifications.')
  }
}

/**
 * Synchronizes an existing browser push subscription with the SmartPack backend.
 *
 * Checks Web Push support and notification permission, ensures the service
 * worker is registered and active, and retrieves the existing push
 * subscription. If a subscription exists, its endpoint and details are sent
 * to the backend to register or synchronize the server-side record.
 *
 * This function does not request notification permission or create a new
 * browser push subscription.
 *
 * @returns A promise that resolves when synchronization completes or when
 *          synchronization is unnecessary because Web Push is unsupported,
 *          permission has not been granted, service worker initialization
 *          fails, or no subscription exists.
 * @throws {Error} If the subscription endpoint is missing or the backend
 *   request fails.
 */
export async function syncPushSubscription(): Promise<void> {
  if (!isPushNotificationSupported()) {
    return
  }

  if (Notification.permission !== 'granted') {
    return
  }

  const registration = await ensureServiceWorkerReady()

  if (!registration) {
    return
  }

  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return
  }

  const subscriptionInfo = subscription.toJSON()

  if (!subscriptionInfo.endpoint) {
    throw new Error('The browser subscription endpoint is missing.')
  }

  try {
    await pushSubscriptions.create({
      endpoint: subscriptionInfo.endpoint,
      subscription_info: subscriptionInfo,
    })
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message)
    }

    throw error
  }
}
