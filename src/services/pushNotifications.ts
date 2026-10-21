import { pushSubscriptions } from '@/api/modules'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEBPUSH_VAPID_PUBLIC_KEY

/**
 * Convert a URL-safe Base64 VAPID public key into a Uint8Array
 * required by the browser Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }

  return output
}

/**
 * Check whether the browser supports Web Push notifications.
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Register the SmartPack service worker.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by this browser.')
  }

  return navigator.serviceWorker.register('/sw.js')
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
 * Subscribe the current browser to Web Push and register the subscription
 * with the authenticated SmartPack backend.
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

  const registration = await registerServiceWorker()

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

  await pushSubscriptions.create({
    endpoint: subscriptionInfo.endpoint,
    subscription_info: subscriptionInfo,
  })
}

/**
 * Unsubscribe the current browser from Web Push and remove its subscription
 * from the SmartPack backend.
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

  // Remove the server-side record before unsubscribing locally.
  // If the API request fails, the browser remains subscribed.
  const subscriptions = await pushSubscriptions.list()

  const existingSubscription = subscriptions.results.find((item) => item.endpoint === endpoint)

  if (existingSubscription) {
    await pushSubscriptions.remove(existingSubscription.id)
  }

  await subscription.unsubscribe()
}

/**
 * Check whether this browser currently has a push subscription.
 */
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false
  }

  const registration = await navigator.serviceWorker.getRegistration('/')

  if (!registration) {
    return false
  }

  return Boolean(await registration.pushManager.getSubscription())
}

/**
 * Logs the number of push subscriptions registered for the
 * currently authenticated user.
 */
export async function logSubscriptionCount(): Promise<void> {
  try {
    const response = await pushSubscriptions.list()

    console.log('[SmartPack Push Notifications]', {
      subscriptionCount: response.count,
      subscriptions: response.results.map((subscription) => ({
        id: subscription.id,
        createdAt: subscription.created_at,
      })),
    })
  } catch (error) {
    console.error('[SmartPack Push Notifications] Failed to retrieve subscriptions:', error)
  }
}

// src/services/serviceWorker.ts

export async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')

    await navigator.serviceWorker.ready

    return registration
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

/**
 * If this browser has a push subscription, always (re)register it
 * with the backend via the create endpoint.
 */
export async function syncPushSubscription(): Promise<void> {
  if (!isPushNotificationSupported()) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    return
  }

  const subscriptionInfo = subscription.toJSON()

  if (!subscriptionInfo.endpoint) {
    throw new Error('The browser subscription endpoint is missing.')
  }

  await pushSubscriptions.create({
    endpoint: subscriptionInfo.endpoint,
    subscription_info: subscriptionInfo,
  })
}
