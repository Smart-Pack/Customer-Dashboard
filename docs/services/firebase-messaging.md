# Firebase Cloud Messaging (FCM)

Documents the Android Firebase Cloud Messaging integration in the SmartPack Customer Dashboard, including device registration, notification assets, and configuration.

## 1. API

**`src/api/modules/fcmDevices.ts`** — Provides API methods for managing the authenticated user's Firebase Cloud Messaging device registrations.

- `create(payload)` — Registers or updates an FCM device using its persistent installation UUID (`device_id`) and Firebase registration token (`token`).
- `list(params?)` — Retrieves registered FCM devices, with optional filtering by `device_id` and pagination.
- `remove(deviceId)` — Removes an FCM device registration using its persistent installation UUID.

The module also defines TypeScript interfaces for FCM device records, registration payloads, query parameters, and paginated responses.

All requests use the shared Axios API client and the FCM device endpoints.

## 2. Assets

**`scripts/generate-icons.mjs`** — Generates the Android Firebase notification icon (`ic_notification.png`) from the SmartPack SVG logo using Sharp, alongside the existing launcher and splash screen assets.

Run the following command to regenerate the Android assets:

```bash
pnpm android:assets
```

## 3. Services

**`src/services/firebaseMessaging.ts`** — Provides the native Android Firebase Cloud Messaging integration using `@capacitor-firebase/messaging`.

- `isFirebaseMessagingSupported()` — Checks whether native Firebase Messaging is available on Android.
- `getOrCreateDeviceId()` — Retrieves the persistent installation UUID or generates and stores a new one using secure storage.
- `isNotificationPermissionGranted()` — Checks whether notification permission has been granted.
- `requestNotificationPermission()` — Requests notification permission when required.
- `getFCMToken()` — Retrieves the Firebase registration token.
- `registerFCMDevice()` — Registers the installation UUID and FCM token with the backend.
- `syncFCMDevice()` — Synchronizes the current FCM token with the backend when notification permission is granted.
- `unregisterFCMDevice()` — Removes the backend device registration and deletes the local FCM token without generating a new installation UUID.
- `addFCMTokenListener()` — Listens for FCM token refresh events and synchronizes refreshed tokens with the backend.
- `addNotificationReceivedListener(callback)` — Handles notifications received while the application is in the foreground.
- `addNotificationActionListener(callback)` — Handles user interactions with notifications.
- `isSubscribedToFCM()` — Checks whether the current Android installation has notification permission and an active FCM device registration with the backend.

The service guards native operations on unsupported platforms and uses persistent device identifiers to associate FCM tokens with individual app installations.
