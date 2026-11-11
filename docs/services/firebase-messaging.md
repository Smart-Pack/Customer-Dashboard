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
- `addNotificationActionListener(callback)` — Handles user interactions with notifications.
- `isSubscribedToFCM()` — Checks whether the current Android installation has notification permission and an active FCM device registration with the backend.

The service guards native operations on unsupported platforms and uses persistent device identifiers to associate FCM tokens with individual app installations.

## 4. Notification Integration

**`src/components/Notifications/NotificationBell.vue`** — Integrates Firebase Cloud Messaging (FCM) on Android with the existing browser push notification system and MQTT-based real-time notification delivery.

The component automatically selects the appropriate notification service based on the platform:

- **Android:** Uses Firebase Messaging to request notification permission, register the device with the backend, synchronize FCM tokens, and unregister the device when notifications are disabled.
- **Web:** Continues using the existing browser push notification service.

### Foreground Notification Delivery

MQTT is responsible for delivering new notifications while the dashboard is active.

The MQTT notification handler:
- Receives real-time notification events from the backend.
- Updates the notification inbox and unread count.
- Provides in-app notification feedback where appropriate.

The FCM `notificationReceived` listener is intentionally not used because MQTT already handles foreground notification delivery. Using both mechanisms could result in duplicate notification processing or feedback.

### Background Notification Delivery

FCM handles native Android push notifications when the application is in the background or closed.

The component registers an `addNotificationActionListener()` listener to handle user interactions with native FCM notifications. When a user taps a notification, the application can navigate to the relevant destination using the URL included in the notification data.

The component also monitors application state changes to refresh notification subscription status when the app returns to the foreground.

This separates notification responsibilities:

- **MQTT:** Real-time foreground notification delivery.
- **FCM:** Native Android background notification delivery and notification interactions.
- **Web Push:** Browser background notification delivery.
- **REST API:** Notification records, inbox history, and read status.

This provides a unified notification management interface across Android and web platforms while avoiding duplicate foreground notification handling.

**Note:** MQTT foreground delivery depends on an active MQTT connection. The REST API remains the source of truth, so notifications should still be retrievable when the connection is restored.
