// @/services/firebaseMessaging.ts
import { fcmDevices } from '@/api/modules'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { Capacitor } from '@capacitor/core'
import axios from 'axios'
import { secureTokenStorage } from './secureTokenStorage'

/**
 * Determines whether native Android Firebase Messaging is available.
 *
 * @returns `true` if running on Android; otherwise, `false`.
 */
export function isFirebaseMessagingSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

/**
 * Retrieves the persistent device ID or generates a new one.
 *
 * If no device ID exists or retrieval fails, a new UUID is generated
 * and securely persisted.
 *
 * @returns The persistent device ID.
 * @throws If the device ID cannot be generated or stored.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existingDeviceId = await secureTokenStorage.getDeviceId()

  if (existingDeviceId) {
    return existingDeviceId
  }

  const deviceId = await secureTokenStorage.setDeviceId()

  if (!deviceId) {
    throw new Error('Unable to initialize the device ID.')
  }

  return deviceId
}

/**
 * Checks whether notification permission has been granted.
 *
 * @returns A promise resolving to `true` if permission is granted.
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!isFirebaseMessagingSupported()) {
    return false
  }

  const permission = await FirebaseMessaging.checkPermissions()

  return permission.receive === 'granted'
}

/**
 * Requests permission to display notifications.
 *
 * Android 13+ requires runtime notification permission.
 *
 * @returns A promise resolving to the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isFirebaseMessagingSupported()) {
    throw new Error('Firebase Messaging is not supported on this platform.')
  }

  let permission = await FirebaseMessaging.checkPermissions()

  if (permission.receive !== 'granted') {
    permission = await FirebaseMessaging.requestPermissions()
  }

  return permission.receive === 'granted'
}

/**
 * Retrieves the current FCM registration token.
 *
 * @returns The FCM registration token.
 */
export async function getFCMToken(): Promise<string> {
  if (!isFirebaseMessagingSupported()) {
    throw new Error('Firebase Messaging is not supported on this platform.')
  }

  const { token } = await FirebaseMessaging.getToken()

  if (!token) {
    throw new Error('Firebase did not provide an FCM registration token.')
  }

  return token
}

/**
 * Registers the current Android installation with the SmartPack backend.
 *
 * Automatically retrieves or generates the persistent device ID.
 */
export async function registerFCMDevice(): Promise<void> {
  if (!isFirebaseMessagingSupported()) {
    throw new Error('Firebase Messaging is not supported on this platform.')
  }

  const permissionGranted = await isNotificationPermissionGranted()

  if (!permissionGranted) {
    throw new Error('Notification permission has not been granted.')
  }

  const deviceId = await getOrCreateDeviceId()
  const token = await getFCMToken()

  try {
    await fcmDevices.create({
      token,
      device_id: deviceId,
    })
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.message)
    }

    throw error
  }
}

/**
 * Synchronizes the current FCM token with the SmartPack backend.
 *
 * Does not request notification permission.
 * Does nothing if Firebase Messaging is unsupported or permission
 * has not been granted.
 */
export async function syncFCMDevice(): Promise<void> {
  if (!isFirebaseMessagingSupported()) {
    return
  }

  if (!(await isNotificationPermissionGranted())) {
    return
  }

  await registerFCMDevice()
}

/**
 * Unregisters the current installation from the SmartPack backend
 * and deletes its local FCM token.
 *
 * Uses the existing device ID without generating a new one.
 */
export async function unregisterFCMDevice(): Promise<void> {
  if (!isFirebaseMessagingSupported()) {
    return
  }

  const deviceId = await secureTokenStorage.getDeviceId()

  if (deviceId) {
    try {
      const devices = await fcmDevices.list({
        device_id: deviceId,
      })

      const existingDevice = devices.results.find((device) => device.device_id === deviceId)

      if (existingDevice) {
        await fcmDevices.remove(existingDevice.device_id)
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.message)
      }

      throw error
    }
  }

  await FirebaseMessaging.deleteToken()
}

/**
 * Listens for FCM token changes and synchronizes the new token
 * with the SmartPack backend.
 *
 * Automatically retrieves or generates the persistent device ID.
 *
 * @returns The listener handle, or null if unsupported.
 */
export async function addFCMTokenListener() {
  if (!isFirebaseMessagingSupported()) {
    return null
  }

  const deviceId = await getOrCreateDeviceId()

  return FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
    try {
      await fcmDevices.create({
        token,
        device_id: deviceId,
      })
    } catch (error) {
      console.error('Failed to synchronize refreshed FCM token:', error)
    }
  })
}

/**
 * Registers a listener for notifications received while the app
 * is in the foreground.
 *
 * @param callback - Function called with the received notification.
 * @returns The listener handle, or null if unsupported.
 */
export async function addNotificationReceivedListener(callback: (notification: unknown) => void) {
  if (!isFirebaseMessagingSupported()) {
    return null
  }

  return FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
    callback(notification)
  })
}

/**
 * Registers a listener for notification interactions.
 *
 * @param callback - Function called when a notification is interacted with.
 * @returns The listener handle, or null if unsupported.
 */
export async function addNotificationActionListener(callback: (notification: unknown) => void) {
  if (!isFirebaseMessagingSupported()) {
    return null
  }

  return FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
    callback(notification)
  })
}

/**
 * Checks whether the current Android installation has an active FCM
 * device registration with the SmartPack backend and notification permission.
 *
 * @returns A promise resolving to `true` if permission is granted and an
 * active FCM registration exists.
 */
export async function isSubscribedToFCM(): Promise<boolean> {
  if (!isFirebaseMessagingSupported()) {
    return false
  }

  if (!(await isNotificationPermissionGranted())) {
    return false
  }

  try {
    const deviceId = await secureTokenStorage.getDeviceId()

    if (!deviceId) {
      return false
    }

    const devices = await fcmDevices.list({
      device_id: deviceId,
    })

    return (
      devices.results?.some((device) => device.device_id === deviceId && device.is_active) ?? false
    )
  } catch {
    return false
  }
}
