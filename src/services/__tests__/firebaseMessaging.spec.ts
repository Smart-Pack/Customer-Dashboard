import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  isNativePlatform,
  getPlatform,
  checkPermissions,
  requestPermissions,
  getToken,
  deleteToken,
  addListener,
  create,
  list,
  remove,
  getDeviceId,
  setDeviceId,
} = vi.hoisted(() => ({
  isNativePlatform: vi.fn<() => boolean>(),
  getPlatform: vi.fn<() => string>(),
  checkPermissions: vi.fn<() => Promise<{ receive: string }>>(),
  requestPermissions: vi.fn<() => Promise<{ receive: string }>>(),
  getToken: vi.fn<() => Promise<{ token: string }>>(),
  deleteToken: vi.fn<() => Promise<void>>(),
  addListener:
    vi.fn<
      (
        eventName: string,
        callback: (event: unknown) => void,
      ) => Promise<{ remove: () => Promise<void> }>
    >(),
  create: vi.fn<(payload: { device_id: string; token: string }) => Promise<unknown>>(),
  list: vi.fn<
    (params?: { device_id?: string }) => Promise<{
      results: Array<{ id: number; device_id: string }>
    }>
  >(),
  remove: vi.fn<(deviceId: string) => Promise<string>>(),
  getDeviceId: vi.fn<() => Promise<string | null>>(),
  setDeviceId: vi.fn<() => Promise<string | null>>(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform,
    getPlatform,
  },
}))

vi.mock('@capacitor-firebase/messaging', () => ({
  FirebaseMessaging: {
    checkPermissions,
    requestPermissions,
    getToken,
    deleteToken,
    addListener,
  },
}))

vi.mock('@/api/modules', () => ({
  fcmDevices: {
    create,
    list,
    remove,
  },
}))

vi.mock('../secureTokenStorage', () => ({
  secureTokenStorage: {
    getDeviceId,
    setDeviceId,
  },
}))

import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { fcmDevices } from '@/api/modules'
import { secureTokenStorage } from '../secureTokenStorage'

import {
  isFirebaseMessagingSupported,
  isNotificationPermissionGranted,
  requestNotificationPermission,
  getFCMToken,
  getOrCreateDeviceId,
  registerFCMDevice,
  syncFCMDevice,
  unregisterFCMDevice,
  addFCMTokenListener,
  addNotificationReceivedListener,
  addNotificationActionListener,
} from '../firebaseMessaging'

const DEVICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const NEW_DEVICE_ID = '550e8400-e29b-41d4-a716-446655440000'
const FCM_TOKEN = 'test-fcm-token'

describe('firebaseMessaging', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    isNativePlatform.mockReturnValue(true)
    getPlatform.mockReturnValue('android')

    checkPermissions.mockResolvedValue({ receive: 'granted' })
    requestPermissions.mockResolvedValue({ receive: 'granted' })
    getToken.mockResolvedValue({ token: FCM_TOKEN })
    deleteToken.mockResolvedValue(undefined)

    create.mockResolvedValue(undefined)
    list.mockResolvedValue({ results: [] })
    remove.mockResolvedValue('Device removed')

    getDeviceId.mockResolvedValue(DEVICE_ID)
    setDeviceId.mockResolvedValue(NEW_DEVICE_ID)

    addListener.mockResolvedValue({
      remove: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    })
  })

  describe('isFirebaseMessagingSupported', () => {
    it('returns true on native Android platforms', () => {
      expect(isFirebaseMessagingSupported()).toBe(true)
    })

    it('returns false on web platforms', () => {
      isNativePlatform.mockReturnValue(false)

      expect(isFirebaseMessagingSupported()).toBe(false)
    })

    it('returns false on non-Android native platforms', () => {
      getPlatform.mockReturnValue('ios')

      expect(isFirebaseMessagingSupported()).toBe(false)
    })
  })

  describe('getOrCreateDeviceId', () => {
    it('returns the existing device ID from secure storage', async () => {
      const result = await getOrCreateDeviceId()

      expect(secureTokenStorage.getDeviceId).toHaveBeenCalledOnce()
      expect(secureTokenStorage.setDeviceId).not.toHaveBeenCalled()
      expect(result).toBe(DEVICE_ID)
    })

    it('generates and stores a new device ID when none exists', async () => {
      getDeviceId.mockResolvedValue(null)

      const result = await getOrCreateDeviceId()

      expect(secureTokenStorage.getDeviceId).toHaveBeenCalledOnce()
      expect(secureTokenStorage.setDeviceId).toHaveBeenCalledOnce()
      expect(result).toBe(NEW_DEVICE_ID)
    })

    it('generates a new device ID when retrieval fails and returns null', async () => {
      getDeviceId.mockResolvedValue(null)

      const result = await getOrCreateDeviceId()

      expect(secureTokenStorage.setDeviceId).toHaveBeenCalledOnce()
      expect(result).toBe(NEW_DEVICE_ID)
    })

    it('throws when a new device ID cannot be generated', async () => {
      getDeviceId.mockResolvedValue(null)
      setDeviceId.mockResolvedValue(null)

      await expect(getOrCreateDeviceId()).rejects.toThrow('Unable to initialize the device ID.')
    })

    it('propagates device ID generation and storage errors', async () => {
      getDeviceId.mockResolvedValue(null)

      const error = new Error('Device ID storage failed')
      setDeviceId.mockRejectedValue(error)

      await expect(getOrCreateDeviceId()).rejects.toThrow(error)
    })
  })

  describe('isNotificationPermissionGranted', () => {
    it('returns true when notification permission is granted', async () => {
      const result = await isNotificationPermissionGranted()

      expect(FirebaseMessaging.checkPermissions).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })

    it('returns false when notification permission is denied', async () => {
      checkPermissions.mockResolvedValue({ receive: 'denied' })

      const result = await isNotificationPermissionGranted()

      expect(result).toBe(false)
    })

    it('does not check permissions on unsupported platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      const result = await isNotificationPermissionGranted()

      expect(result).toBe(false)
      expect(FirebaseMessaging.checkPermissions).not.toHaveBeenCalled()
    })

    it('propagates permission check errors', async () => {
      const error = new Error('Permission check failed')
      checkPermissions.mockRejectedValue(error)

      await expect(isNotificationPermissionGranted()).rejects.toThrow(error)
    })
  })

  describe('requestNotificationPermission', () => {
    it('returns true when permission is already granted', async () => {
      const result = await requestNotificationPermission()

      expect(FirebaseMessaging.checkPermissions).toHaveBeenCalledOnce()
      expect(FirebaseMessaging.requestPermissions).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('requests permission when it has not been granted', async () => {
      checkPermissions.mockResolvedValue({ receive: 'prompt' })

      const result = await requestNotificationPermission()

      expect(FirebaseMessaging.requestPermissions).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })

    it('returns false when permission is denied', async () => {
      checkPermissions.mockResolvedValue({ receive: 'prompt' })
      requestPermissions.mockResolvedValue({ receive: 'denied' })

      const result = await requestNotificationPermission()

      expect(result).toBe(false)
    })

    it('throws when Firebase Messaging is unsupported', async () => {
      isNativePlatform.mockReturnValue(false)

      await expect(requestNotificationPermission()).rejects.toThrow(
        'Firebase Messaging is not supported on this platform.',
      )

      expect(FirebaseMessaging.checkPermissions).not.toHaveBeenCalled()
    })

    it('propagates permission request errors', async () => {
      const error = new Error('Permission request failed')

      checkPermissions.mockResolvedValue({ receive: 'prompt' })
      requestPermissions.mockRejectedValue(error)

      await expect(requestNotificationPermission()).rejects.toThrow(error)
    })
  })

  describe('getFCMToken', () => {
    it('retrieves the FCM registration token', async () => {
      const result = await getFCMToken()

      expect(FirebaseMessaging.getToken).toHaveBeenCalledOnce()
      expect(result).toBe(FCM_TOKEN)
    })

    it('throws when Firebase does not provide a token', async () => {
      getToken.mockResolvedValue({ token: '' })

      await expect(getFCMToken()).rejects.toThrow(
        'Firebase did not provide an FCM registration token.',
      )
    })

    it('throws when Firebase Messaging is unsupported', async () => {
      isNativePlatform.mockReturnValue(false)

      await expect(getFCMToken()).rejects.toThrow(
        'Firebase Messaging is not supported on this platform.',
      )

      expect(FirebaseMessaging.getToken).not.toHaveBeenCalled()
    })

    it('propagates token retrieval errors', async () => {
      const error = new Error('Token retrieval failed')
      getToken.mockRejectedValue(error)

      await expect(getFCMToken()).rejects.toThrow(error)
    })
  })

  describe('registerFCMDevice', () => {
    it('registers the FCM token using the existing device ID', async () => {
      await registerFCMDevice()

      expect(fcmDevices.create).toHaveBeenCalledExactlyOnceWith({
        token: FCM_TOKEN,
        device_id: DEVICE_ID,
      })
    })

    it('retrieves the device ID before registering', async () => {
      await registerFCMDevice()

      expect(secureTokenStorage.getDeviceId).toHaveBeenCalledOnce()
      expect(FirebaseMessaging.getToken).toHaveBeenCalledOnce()
      expect(fcmDevices.create).toHaveBeenCalledOnce()
    })

    it('generates a device ID when none exists', async () => {
      getDeviceId.mockResolvedValue(null)

      await registerFCMDevice()

      expect(secureTokenStorage.setDeviceId).toHaveBeenCalledOnce()
      expect(fcmDevices.create).toHaveBeenCalledExactlyOnceWith({
        token: FCM_TOKEN,
        device_id: NEW_DEVICE_ID,
      })
    })

    it('checks notification permission before registering', async () => {
      await registerFCMDevice()

      expect(FirebaseMessaging.checkPermissions).toHaveBeenCalledOnce()
      expect(FirebaseMessaging.getToken).toHaveBeenCalledOnce()
      expect(fcmDevices.create).toHaveBeenCalledOnce()
    })

    it('does not register when notification permission is denied', async () => {
      checkPermissions.mockResolvedValue({ receive: 'denied' })

      await expect(registerFCMDevice()).rejects.toThrow(
        'Notification permission has not been granted.',
      )

      expect(FirebaseMessaging.getToken).not.toHaveBeenCalled()
      expect(secureTokenStorage.getDeviceId).not.toHaveBeenCalled()
      expect(fcmDevices.create).not.toHaveBeenCalled()
    })

    it('propagates backend registration errors', async () => {
      const error = new Error('Registration failed')
      create.mockRejectedValue(error)

      await expect(registerFCMDevice()).rejects.toThrow(error)
    })

    it('throws when Firebase Messaging is unsupported', async () => {
      isNativePlatform.mockReturnValue(false)

      await expect(registerFCMDevice()).rejects.toThrow(
        'Firebase Messaging is not supported on this platform.',
      )

      expect(fcmDevices.create).not.toHaveBeenCalled()
    })
  })

  describe('syncFCMDevice', () => {
    it('synchronizes the existing FCM token with the backend', async () => {
      await syncFCMDevice()

      expect(fcmDevices.create).toHaveBeenCalledExactlyOnceWith({
        token: FCM_TOKEN,
        device_id: DEVICE_ID,
      })
    })

    it('does not synchronize when notification permission is denied', async () => {
      checkPermissions.mockResolvedValue({ receive: 'denied' })

      await syncFCMDevice()

      expect(FirebaseMessaging.getToken).not.toHaveBeenCalled()
      expect(fcmDevices.create).not.toHaveBeenCalled()
    })

    it('does nothing on unsupported platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      await syncFCMDevice()

      expect(FirebaseMessaging.checkPermissions).not.toHaveBeenCalled()
      expect(fcmDevices.create).not.toHaveBeenCalled()
    })

    it('propagates permission check errors', async () => {
      const error = new Error('Permission check failed')
      checkPermissions.mockRejectedValue(error)

      await expect(syncFCMDevice()).rejects.toThrow(error)
    })
  })

  describe('unregisterFCMDevice', () => {
    it('removes the backend device using its installation UUID and deletes the local token', async () => {
      list.mockResolvedValue({
        results: [
          {
            id: 1,
            device_id: DEVICE_ID,
          },
        ],
      })

      await unregisterFCMDevice()

      expect(fcmDevices.list).toHaveBeenCalledExactlyOnceWith({
        device_id: DEVICE_ID,
      })
      expect(fcmDevices.remove).toHaveBeenCalledExactlyOnceWith(DEVICE_ID)
      expect(FirebaseMessaging.deleteToken).toHaveBeenCalledOnce()
    })

    it('deletes the local token when no backend device exists', async () => {
      await unregisterFCMDevice()

      expect(fcmDevices.remove).not.toHaveBeenCalled()
      expect(FirebaseMessaging.deleteToken).toHaveBeenCalledOnce()
    })

    it('deletes the local token when no device ID is stored', async () => {
      getDeviceId.mockResolvedValue(null)

      await unregisterFCMDevice()

      expect(fcmDevices.list).not.toHaveBeenCalled()
      expect(fcmDevices.remove).not.toHaveBeenCalled()
      expect(FirebaseMessaging.deleteToken).toHaveBeenCalledOnce()
    })

    it('does not unregister on unsupported platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      await unregisterFCMDevice()

      expect(secureTokenStorage.getDeviceId).not.toHaveBeenCalled()
      expect(fcmDevices.list).not.toHaveBeenCalled()
      expect(FirebaseMessaging.deleteToken).not.toHaveBeenCalled()
    })

    it('does not delete the local token when backend listing fails', async () => {
      const error = new Error('Device listing failed')
      list.mockRejectedValue(error)

      await expect(unregisterFCMDevice()).rejects.toThrow(error)

      expect(FirebaseMessaging.deleteToken).not.toHaveBeenCalled()
    })

    it('does not delete the local token when backend removal fails', async () => {
      const error = new Error('Device removal failed')

      list.mockResolvedValue({
        results: [{ id: 1, device_id: DEVICE_ID }],
      })
      remove.mockRejectedValue(error)

      await expect(unregisterFCMDevice()).rejects.toThrow(error)

      expect(FirebaseMessaging.deleteToken).not.toHaveBeenCalled()
    })

    it('propagates local token deletion errors', async () => {
      const error = new Error('Token deletion failed')
      deleteToken.mockRejectedValue(error)

      await expect(unregisterFCMDevice()).rejects.toThrow(error)
    })
  })

  describe('addFCMTokenListener', () => {
    it('registers a token refresh listener', async () => {
      await addFCMTokenListener()

      expect(FirebaseMessaging.addListener).toHaveBeenCalledOnce()
      expect(addListener.mock.calls[0]?.[0]).toBe('tokenReceived')
      expect(secureTokenStorage.getDeviceId).toHaveBeenCalledOnce()
    })

    it('generates a device ID when none exists', async () => {
      getDeviceId.mockResolvedValue(null)

      await addFCMTokenListener()

      expect(secureTokenStorage.setDeviceId).toHaveBeenCalledOnce()
    })

    it('synchronizes refreshed tokens using the persistent device ID', async () => {
      await addFCMTokenListener()

      const callback = addListener.mock.calls[0]?.[1] as (event: { token: string }) => Promise<void>

      await callback({ token: 'refreshed-fcm-token' })

      expect(fcmDevices.create).toHaveBeenCalledExactlyOnceWith({
        token: 'refreshed-fcm-token',
        device_id: DEVICE_ID,
      })
    })

    it('logs errors when refreshed token registration fails', async () => {
      const error = new Error('Registration failed')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      create.mockRejectedValue(error)

      await addFCMTokenListener()

      const callback = addListener.mock.calls[0]?.[1] as (event: { token: string }) => Promise<void>

      await callback({ token: 'refreshed-fcm-token' })

      expect(consoleError).toHaveBeenCalledWith('Failed to synchronize refreshed FCM token:', error)

      consoleError.mockRestore()
    })

    it('does nothing on unsupported platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      const result = await addFCMTokenListener()

      expect(result).toBeNull()
      expect(secureTokenStorage.getDeviceId).not.toHaveBeenCalled()
      expect(FirebaseMessaging.addListener).not.toHaveBeenCalled()
    })
  })

  describe('addNotificationReceivedListener', () => {
    it('registers a foreground notification listener', async () => {
      const callback = vi.fn<(notification: unknown) => void>()

      await addNotificationReceivedListener(callback)

      expect(FirebaseMessaging.addListener).toHaveBeenCalledOnce()
      expect(addListener.mock.calls[0]?.[0]).toBe('notificationReceived')
    })

    it('passes received notifications to the callback', async () => {
      const callback = vi.fn<(notification: unknown) => void>()
      const notification = {
        title: 'SmartPack alert',
        body: 'Weight limit exceeded',
      }

      await addNotificationReceivedListener(callback)

      const listener = addListener.mock.calls[0]?.[1] as (event: {
        notification: typeof notification
      }) => void

      listener({ notification })

      expect(callback).toHaveBeenCalledExactlyOnceWith(notification)
    })

    it('does nothing on unsupported platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      const result = await addNotificationReceivedListener(vi.fn())

      expect(result).toBeNull()
      expect(FirebaseMessaging.addListener).not.toHaveBeenCalled()
    })
  })

  describe('addNotificationActionListener', () => {
    it('registers a notification interaction listener', async () => {
      const callback = vi.fn<(notification: unknown) => void>()

      await addNotificationActionListener(callback)

      expect(FirebaseMessaging.addListener).toHaveBeenCalledOnce()
      expect(addListener.mock.calls[0]?.[0]).toBe('notificationActionPerformed')
    })

    it('passes notification interactions to the callback', async () => {
      const callback = vi.fn<(notification: unknown) => void>()
      const notification = {
        title: 'SmartPack alert',
        data: { url: '/dashboard/smartpacks/1/details' },
      }

      await addNotificationActionListener(callback)

      const listener = addListener.mock.calls[0]?.[1] as (event: {
        notification: typeof notification
      }) => void

      listener({ notification })

      expect(callback).toHaveBeenCalledExactlyOnceWith(notification)
    })

    it('does nothing on unsupported platforms', async () => {
      isNativePlatform.mockReturnValue(false)

      const result = await addNotificationActionListener(vi.fn())

      expect(result).toBeNull()
      expect(FirebaseMessaging.addListener).not.toHaveBeenCalled()
    })
  })
})
