# SmartPack Dashboard Notifications

## 1. Overview

The SmartPack Customer Dashboard provides an integrated notification system combining an in-dashboard notification inbox, real-time notification delivery through MQTT, and platform-specific push notifications.

The system allows users to view notifications, track unread notifications, mark notifications as read, navigate to relevant dashboard pages, and manage push notification subscriptions.

The implementation consists of five main parts:

1. **Notification Bell** — Provides access to the notification dropdown, displays the unread notification count, and manages push notification settings.
2. **Notification Content** — Retrieves notifications from the backend, subscribes to the authenticated user's MQTT topic, displays notifications, and manages read state.
3. **Notification Services** — Handle backend API communication, MQTT configuration, browser push subscriptions, and native Firebase Messaging.
4. **Service Worker** — Receives browser push events, displays system notifications, and handles navigation when users click them.
5. **Firebase Messaging** — Handles native Android push notifications, including device registration, token synchronization, and notification interactions.

The backend remains the source of truth for notification records. REST API requests retrieve existing notifications and update their state, while MQTT delivers real-time notification events to connected dashboards.

Push notifications provide a separate delivery mechanism that can notify users when they are not actively viewing the dashboard.

### Main files

| File | Responsibility |
|---|---|
| `src/components/Notifications/NotificationBell.vue` | Notification dropdown, unread count, settings navigation, and platform-specific push controls |
| `src/components/Notifications/NotificationContent.vue` | Notification retrieval, rendering, MQTT subscription, and read-state management |
| `src/services/pushNotifications.ts` | Browser push support, permission handling, service worker registration, and subscription synchronization |
| `src/services/firebaseMessaging.ts` | Native Android FCM integration and device registration |
| `src/api/` notification API module | Retrieves notifications and updates their state |
| `src/api/` push subscription API module | Manages browser push subscription records |
| `src/api/modules/fcmDevices.ts` | Manages native FCM device registrations |
| `src/stores/` MQTT store module | Provides MQTT connection configuration |
| `src/stores/modules/auth/getters.ts` | Exposes the authenticated user's UUID for MQTT subscriptions |
| `public/sw.js` | Handles browser push events and notification clicks |
| `android/app/src/main/AndroidManifest.xml` | Configures Android's default FCM notification icon and color |
| `src/layout/Dashboard/TopBar.vue` | Integrates the notification bell into the dashboard header |
| `src/components/Notifications/__tests__/NotificationBell.spec.ts` | Notification bell component tests |
| `src/components/Notifications/__tests__/NotificationContent.spec.ts` | Notification content and MQTT integration tests |
| `src/services/__tests__/pushNotifications.spec.ts` | Browser push service tests |
| `src/services/__tests__/firebaseMessaging.spec.ts` | Firebase Messaging service tests |
| `src/tests/service-worker/sw.spec.ts` | Service worker tests |

---

## 2. Notification Architecture

The notification system uses REST API requests, MQTT, and platform-specific push notifications for different purposes.

### 2.1 Notification retrieval and updates

The dashboard uses the backend notification API to retrieve existing notification records and update their read state.

The notification content component retrieves unread, non-dismissed notifications and displays the results in the notification dropdown.

The API provides the initial notification state when the component loads and allows the dashboard to recover notifications that were created while the user was disconnected from MQTT.

### 2.2 Real-time notification delivery

MQTT delivers notification events to connected dashboard clients.

The frontend obtains its MQTT connection configuration from the backend and uses the MQTT store to establish a connection to the configured broker.

After obtaining the authenticated user's UUID, the notification content component subscribes to the user-specific topic:

```text
users/{user_uuid}
```

For example:

```text
users/550e8400-e29b-41d4-a716-446655440000
```

The UUID in this example is illustrative. The application must use the actual UUID associated with the authenticated user.

When the backend publishes a notification to this topic, the frontend processes the incoming message and updates the notification list and unread count.

### 2.3 Push notifications

Push notifications are independent of MQTT delivery. Their implementation depends on the platform.

| Platform | Technology | Responsibility |
|---|---|---|
| Web | Web Push API and Service Worker | Receives and displays browser push notifications |
| Android | Firebase Cloud Messaging (FCM) | Receives and displays native Android push notifications |

**Web Push:** The browser maintains a push subscription containing the endpoint and associated encryption information. The backend stores this subscription and uses it for Web Push delivery.

**Android FCM:** The application obtains an FCM registration token and associates it with a persistent installation UUID. The backend stores the device registration and uses the token to send push notifications through Firebase.

Both mechanisms allow notifications to reach users independently of an active dashboard MQTT connection.

### 2.4 High-level architecture

```text
                     SmartPack Backend
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
       Notification API  MQTT Publisher  Push Services
             |              |              |
             |              v         +----+----+
             |         MQTT Broker     |         |
             |              |          v         v
             |              |       Web Push    FCM
             |              |          |         |
             v              v          v         v
       Notification Content <--- MQTT  Service   Android
             |                         Worker     App
             v                           |         |
       Notification Dropdown             v         v
                                    Browser    Native
                                  Notification Notification
```

---

## 3. Notification Bell Component

**File:** `src/components/Notifications/NotificationBell.vue`

The `NotificationBell` component provides the main interface for accessing notifications from the dashboard header.

It contains the notification dropdown, notification settings link, unread count, and platform-specific push notification controls.

### 3.1 Notification state

The component uses the reactive `isSubscribed` reference to track whether notifications are enabled on the current platform.

The notification status is determined differently depending on the platform:

- Android: Checks notification permission and the active FCM device registration.
- Web: Checks the browser's existing push subscription.

The unread count is maintained separately and reflects the notification inbox state.

### 3.2 Notification dropdown

Clicking the notification bell opens a dropdown containing:

- A Notifications heading.
- The unread notification count when the count is greater than zero.
- A link to notification settings.
- The notification content component.
- Push notification controls.

The dropdown visibility is managed using reactive component state.

```typescript
const isDropdownOpen = ref(false)
```

The unread count is updated by events emitted from `NotificationContent`.

```vue
<NotificationContent
  :unread-count="unreadNotifications"
  @unread-count-change="handleUnreadCountChange"
/>
```

### 3.3 Notification settings

The dropdown includes a settings link that navigates to the profile page with the notification tab selected.

```typescript
{
  name: 'my-profile',
  query: { tabs: 'notification' },
}
```

The `my-profile` route must support the `tabs=notification` query parameter.

### 3.4 Push notification controls

The component provides a unified interface for enabling and disabling push notifications.

It determines the current platform and delegates the operation to the appropriate service.

- **Android:** Requests notification permission, registers or synchronizes the FCM device with the backend, or unregisters the device when notifications are disabled.
- **Web:** Requests browser notification permission, creates or reuses a push subscription, synchronizes it with the backend, or removes it when notifications are disabled.

The component manages loading states, success messages, error messages, and subscription status refreshes.

Push notification controls affect push subscription state; they do not disable MQTT notifications or remove notifications from the inbox.

### 3.5 Notification listeners

On Android, the component registers native Firebase Messaging listeners to handle incoming notifications and notification interactions.

It also monitors application state changes and refreshes the notification subscription status when the application returns to the foreground.

The listeners are removed when the component unmounts.

### 3.6 Error handling

Subscription operations can involve both platform APIs and backend requests. One operation may succeed while the other fails.

When an operation fails, the component reports the error and attempts to refresh the actual notification state rather than assuming the operation was successful.

---

## 4. Notification Content Component

**File:** `src/components/Notifications/NotificationContent.vue`

The `NotificationContent` component manages the notification inbox displayed inside the notification bell dropdown.

Its responsibilities include:

- Retrieving notifications from the backend.
- Connecting to the MQTT broker.
- Subscribing to the authenticated user's notification topic.
- Processing incoming MQTT notification events.
- Merging API results with notifications received in real time.
- Keeping the displayed list sorted and within its configured limit.
- Synchronizing unread counts with the parent component.
- Marking notifications as read.
- Handling connection failures, API errors, and retries.
- Cleaning up MQTT resources when the component unmounts.

### 4.1 Initial notification retrieval

When the component initializes, it retrieves unread, non-dismissed notifications from the backend.

The API request uses the notification list endpoint with the appropriate filters, including:

```typescript
{
  status: 'unread_not_dismissed',
  page_size: 20,
}
```

The exact response structure follows the backend's paginated API contract.

The component preserves existing notification data while a request is pending, rather than immediately clearing the list.

### 4.2 MQTT configuration

The frontend obtains MQTT connection settings through the backend configuration API and the MQTT store.

The configuration may include:

- Broker hostname.
- Broker port.
- TLS settings.
- Frontend MQTT username.
- Frontend MQTT password.

Credentials must not be hard-coded in the component. The frontend should use the configured connection settings supplied through the application's intended configuration flow.

### 4.3 User-specific MQTT topic

After the authenticated user's UUID is available, the component subscribes to:

```text
users/{user_uuid}
```

The UUID is obtained from the authentication store.

This topic allows the backend to publish notification events for the intended recipient rather than broadcasting all notifications to every dashboard user.

The backend and frontend must use the same topic naming convention.

### 4.4 Incoming notification payload

The backend publishes notification events using an envelope similar to:

```json
{
  "event": "notification",
  "data": {
    "id": 123,
    "notification_type": "smartpack_sos_alert",
    "title": "SmartPack SOS Alert",
    "body": "A new SmartPack alert has been received.",
    "url": "/dashboard/smartpacks/123/details",
    "data": {},
    "read_at": null,
    "dismissed_at": null,
    "is_read": false,
    "is_dismissed": false,
    "created": "2026-10-27T01:00:00Z",
    "updated": "2026-10-27T01:00:00Z"
  }
}
```

This is an illustrative example. The exact fields and timestamp formats must remain consistent with the backend publisher and notification model.

The component validates incoming payloads before processing them.

### 4.5 Merging API and MQTT notifications

The component accounts for notifications arriving while the initial API request is pending.

It merges API results with notifications received through MQTT, removes duplicates, sorts the list by creation time, and limits the displayed collection to the 20 most recent notifications.

### 4.6 Unread count synchronization

The component reports changes to the unread notification count to its parent through the `unread-count-change` event.

The parent component uses the emitted count to update the number displayed in the notification heading.

### 4.7 Marking notifications as read

When a user marks a notification as read, the component sends the corresponding update to the backend.

It prevents duplicate requests for the same in-progress update and handles failures without incorrectly assuming that the backend successfully changed the notification's state.

### 4.8 Connection and error states

The component handles MQTT connection events, including:

- Successful connection.
- Offline state.
- Reconnection attempts.
- Connection closure.
- Connection errors.

It also handles notification API loading and error states.

An MQTT connection failure should not be interpreted as proof that no notifications exist. The REST API remains available for retrieving persisted notifications when connectivity is restored.

### 4.9 Resource cleanup

When the component unmounts, it removes MQTT event listeners and closes or releases the MQTT client resources associated with the component.

---

## 5. Browser Push Notification Service

**File:** `src/services/pushNotifications.ts`

The browser push notification service handles Web Push functionality independently of the Vue components.

Its responsibilities include:

- Checking browser push support.
- Checking notification permission and subscription state.
- Registering the service worker.
- Requesting notification permission.
- Creating or reusing browser push subscriptions.
- Synchronizing subscriptions with the backend.
- Removing browser subscriptions and matching backend records.

### 5.1 VAPID public key

The service obtains the VAPID public key from the frontend environment:

```typescript
const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEBPUSH_VAPID_PUBLIC_KEY
```

Configure the public key in the frontend environment file:

```dotenv
VITE_WEBPUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
```

The public key must correspond to the backend's Web Push VAPID private key.

Only the public key should be exposed to the frontend. Never include the private key in frontend source code or a `VITE_` environment variable.

### 5.2 Browser support and permission

The service checks whether the browser provides the APIs required for push notifications, including service workers, the Push API, and the Notifications API.

Permission and subscription are separate:

- Permission allows the website to request that the browser display notifications.
- A subscription provides the endpoint and associated information required for push delivery.

Granting permission does not automatically create a push subscription.

### 5.3 Subscription management

The service provides the following main operations:

| Function | Purpose |
|---|---|
| `isPushNotificationSupported()` | Checks whether browser push APIs are available |
| `isSubscribedToPushNotifications()` | Checks the current browser subscription state |
| `subscribeToPushNotifications()` | Creates or reuses a subscription and synchronizes it with the backend |
| `syncPushSubscription()` | Synchronizes an existing browser subscription |
| `unsubscribeFromPushNotifications()` | Removes the browser subscription and its matching backend record |

The backend associates the subscription with the authenticated user so that push messages can be sent to the appropriate browser endpoint.

---

## 6. Firebase Cloud Messaging (Android)

**File:** `src/services/firebaseMessaging.ts`

Firebase Cloud Messaging provides native Android push notification delivery.

Unlike browser Web Push, FCM uses Firebase registration tokens associated with individual application installations.

The application obtains an FCM token and a persistent installation UUID, then registers these details with the SmartPack backend.

The backend stores the registration and uses Firebase Cloud Messaging to send push notifications to the corresponding Android installation.

### 6.1 High-level workflow

```text
                  SmartPack Android App
                           |
                           v
                  Request Notification
                       Permission
                           |
                           v
                    Get FCM Token
                           |
                           v
                 Get Installation UUID
                           |
                           v
                  Register with Backend
                           |
                           v
                   FCM Device Record
                           |
                           v
                    SmartPack Backend
                           |
                           v
                  Firebase Cloud Messaging
                           |
                           v
                    Android Device
                           |
                           v
                  Display Notification
```

### 6.2 Device registration and synchronization

Each Android application installation is identified using a persistent UUID.

The FCM registration token identifies the installation to Firebase.

The application synchronizes the installation UUID and current FCM token with the backend. When Firebase refreshes the token, the application updates the backend registration.

When notifications are disabled through the application, the backend registration is removed and the local FCM token is deleted.

### 6.3 Notification handling

The application listens for notifications received while it is running and for user interactions with notifications.

The notification payload can contain additional data, including a destination URL, allowing the application to identify the relevant dashboard content.

The Android notification icon and color are configured through the native Android resources and manifest.

### 6.4 Detailed documentation

For the complete implementation, including the FCM device API, Android notification assets, Firebase Messaging service functions, device registration, token synchronization, and notification listeners, see:

**[Firebase Cloud Messaging (FCM) Integration](./firebase-messaging.md)**

---

## 7. Service Worker

**File:** `public/sw.js`

The service worker handles incoming browser push events and notification clicks.

It is served from the application root at:

```text
/sw.js
```

This functionality applies to browser Web Push. Native Android FCM notifications are handled by the Firebase Messaging integration.

### 7.1 Receiving push events

The worker listens for the `push` event and attempts to parse the incoming payload as JSON.

The implementation supports JSON and plain-text payloads, with defaults for missing notification fields where configured.

The notification is displayed using the browser's notification API. `event.waitUntil()` keeps the service worker active while the asynchronous operation completes.

```text
Push event
    |
    v
Read payload
    |
    v
Parse JSON or use plain text
    |
    v
Build notification options
    |
    v
Display browser notification
```

### 7.2 Push payload

A representative payload is:

```json
{
  "title": "SmartPack Alert",
  "body": "Your SmartPack has reported a new update.",
  "url": "/dashboard"
}
```

This is an illustrative Web Push payload. It is distinct from the MQTT envelope and native FCM notification payload.

### 7.3 Handling notification clicks

When a user clicks a browser notification, the service worker closes it and resolves its destination URL against the application's origin.

It then looks for a suitable existing application window, navigates and focuses that window where possible, or opens a new window.

Navigation is restricted to the same origin to prevent notification payloads from redirecting users to arbitrary external websites.

---

## 8. Dashboard Integration

**File:** `src/layout/Dashboard/TopBar.vue`

The notification bell is integrated into the dashboard header:

```vue
<NotificationBell class="mr-4 lg:mr-6" />
```

The component sits alongside the existing dashboard controls.

Keeping notification behavior in separate components prevents the dashboard header from becoming responsible for MQTT communication, notification retrieval, read-state updates, and push subscription management.

---

## 9. Backend Integration

The frontend interacts with the SmartPack backend through notification APIs, MQTT, Web Push, and FCM.

### 9.1 REST API

The notification API retrieves persisted notifications and updates notification state.

The browser push subscription API manages Web Push subscription records.

The FCM device API manages native Android device registrations.

The frontend uses the appropriate API modules rather than embedding request logic directly in notification components.

### 9.2 MQTT notification publishing

When a new notification is created, the backend publishes a message to the recipient's MQTT topic when MQTT publishing is enabled.

The topic format is:

```text
users/{user.unique_id}
```

The message contains an event name and notification data.

The backend publisher and frontend subscriber must agree on topic naming, event type, payload structure, broker configuration, and authentication permissions.

### 9.3 Web Push delivery

The backend stores browser push subscriptions and uses them to deliver Web Push messages.

This mechanism is separate from MQTT publishing and native FCM delivery.

### 9.4 FCM delivery

The backend stores FCM device registrations associated with authenticated users.

When sending a native push notification, the backend uses the registered FCM token to deliver the message through Firebase Cloud Messaging.

The backend may include notification data such as a destination URL alongside the notification title and body.

### 9.5 Reliability and recovery

MQTT is used for real-time delivery to connected clients; it should not be treated as a permanent notification history.

A dashboard may disconnect, reload, or miss an event while offline. When it reconnects, it should retrieve persisted notifications from the REST API.

Web Push and FCM provide independent delivery mechanisms for their respective platforms.

The backend notification database remains the source of truth for the inbox.

---

## 10. Testing

The notification system has dedicated tests for the bell component, notification content, browser push service, Firebase Messaging service, and service worker.

### 10.1 Notification Bell tests

**File:** `src/components/Notifications/__tests__/NotificationBell.spec.ts`

Tests cover notification bell rendering, unread count, dropdown interactions, settings navigation, platform-specific push controls, error handling, and event-listener cleanup.

### 10.2 Notification Content tests

**File:** `src/components/Notifications/__tests__/NotificationContent.spec.ts`

Tests cover:

- Initial notification API requests.
- MQTT configuration retrieval.
- MQTT connection and topic subscription.
- Handling incoming notification events.
- Payload validation.
- Duplicate notification filtering.
- Merging REST and MQTT notification results.
- Unread count synchronization.
- Mark-as-read behavior.
- API and connection errors.
- Retry behavior.
- Notification navigation.
- MQTT resource cleanup.

### 10.3 TopBar tests

**File:** `src/layout/Dashboard/__tests__/TopBar.spec.ts`

Tests verify that the notification bell is integrated into the dashboard header and that existing navigation, profile, theme, and account interactions remain functional.

### 10.4 Browser push service tests

**File:** `src/services/__tests__/pushNotifications.spec.ts`

These tests cover browser support checks, permission handling, service worker registration, subscription creation, backend synchronization, and unsubscription behavior.

### 10.5 Firebase Messaging tests

**File:** `src/services/__tests__/firebaseMessaging.spec.ts`

These tests cover native Firebase Messaging support, installation UUID management, notification permission, token retrieval, device registration, token synchronization, unregistration, notification listeners, and subscription status checks.

### 10.6 Service worker tests

**File:** `src/tests/service-worker/sw.spec.ts`

These tests cover push payload handling, browser notification display, fallback behavior, and notification-click navigation.

### 10.7 Running tests

Run the notification bell and content tests:

```bash
pnpm vitest --run \
  src/components/Notifications/__tests__/NotificationBell.spec.ts \
  src/components/Notifications/__tests__/NotificationContent.spec.ts
```

Run the dashboard header tests:

```bash
pnpm vitest --run \
  src/layout/Dashboard/__tests__/TopBar.spec.ts
```

Run the browser push service tests:

```bash
pnpm vitest --run \
  src/services/__tests__/pushNotifications.spec.ts
```

Run the Firebase Messaging service tests:

```bash
pnpm vitest --run \
  src/services/__tests__/firebaseMessaging.spec.ts
```

Run the service worker tests:

```bash
pnpm vitest --run \
  src/tests/service-worker/sw.spec.ts
```

Run all tests:

```bash
pnpm vitest --run
```

Run the TypeScript checks:

```bash
pnpm type-check
```

Test totals should be taken from the latest test run rather than copied from earlier development results.

---

## 11. Troubleshooting

### 11.1 Notifications do not appear in the dropdown

Check that the notification API request succeeds and returns the expected response structure.

Confirm that the notification matches the requested filters and that the component is receiving the correct authenticated user's data.

### 11.2 Real-time notifications are not received

Check:

- Whether the MQTT configuration endpoint succeeds.
- Whether the broker is reachable.
- Whether the frontend can authenticate with the broker.
- Whether the client subscribes to the correct `users/{user_uuid}` topic.
- Whether the backend publishes to the same topic.
- Whether the MQTT message contains the expected event envelope and notification data.

Review both frontend and backend logs.

### 11.3 Notifications disappear or are missing after reconnecting

MQTT delivery alone does not guarantee that a disconnected client will receive every message published while offline.

The frontend should retrieve persisted notifications through the REST API when it initializes or when recovery is needed.

Confirm that the backend saves notifications before publishing their MQTT events.

### 11.4 The unread count is incorrect

Check that the REST API response and MQTT events are merged without duplicating notifications.

Verify that read and dismissed notifications are excluded where appropriate and that count-change events are emitted after notification state changes.

### 11.5 Browser push notifications are unsupported

Confirm that the browser supports service workers, the Push API, and the Notifications API.

Production deployments generally require HTTPS for service workers and push notifications, except for browser-recognized secure development origins such as `localhost`.

### 11.6 The browser subscription exists but not in the backend

Inspect the subscription synchronization API request and backend logs.

Confirm that the backend associates the subscription with the authenticated user and that the request succeeds.

### 11.7 Firebase notifications are not received on Android

Check:

- Whether Firebase is configured for the correct Android application.
- Whether `google-services.json` is available during the Android build.
- Whether the package name matches the Firebase Android application configuration.
- Whether the signing certificate SHA-1 fingerprint is registered where required.
- Whether notification permission has been granted.
- Whether the FCM token is successfully retrieved.
- Whether the device registration is active in the backend.
- Whether the backend successfully sends the notification through Firebase.

Review Android logs and backend FCM logs.

For additional implementation details, see the [Firebase Cloud Messaging documentation](./firebase-messaging.md).

### 11.8 MQTT and push notification behavior differ

MQTT, Web Push, and FCM are independent delivery mechanisms.

A dashboard can receive MQTT events without displaying a push notification. Similarly, a browser or Android device can receive a push notification while the dashboard is disconnected from MQTT.

Inspect each mechanism independently when troubleshooting.

---

## 12. Design Considerations

The notification system follows these principles:

1. **Separation of concerns:** Vue components manage the interface, services manage communication and subscriptions, the backend persists notifications, and platform-specific components handle push delivery.
2. **Backend source of truth:** The REST API provides persisted notification state, while MQTT provides real-time updates.
3. **User-specific delivery:** MQTT subscriptions use the authenticated user's UUID.
4. **Platform-specific push:** Web uses browser Web Push, while Android uses Firebase Cloud Messaging.
5. **Reactive state:** The notification list and unread count update as notification state changes.
6. **Duplicate prevention:** Incoming MQTT notifications are checked before being added to the list.
7. **Error handling:** API, MQTT, and push subscription failures are handled independently.
8. **Resource cleanup:** MQTT resources, native listeners, and document-level event listeners are cleaned up when their owning components are destroyed.
9. **Same-origin browser navigation:** Browser notification clicks are restricted to the application's origin.
10. **Independent delivery mechanisms:** MQTT, Web Push, and FCM serve different purposes and should be monitored separately.
11. **Testability:** Notification components, subscription services, and service worker behavior have dedicated test files.

---

## 13. Limitations and Future Improvements

Potential improvements include:

- Detecting expired or revoked browser subscriptions and synchronizing their backend records.
- Improving recovery from partial failures between browser and backend subscription operations.
- Adding explicit MQTT reconnection recovery and REST synchronization after connectivity is restored.
- Improving navigation when users interact with native FCM notifications.
- Adding integration tests for notification delivery across the backend, MQTT broker, Firebase, and browser.
- Testing browser push and FCM delivery in deployed environments.
- Improving notification history, pagination, dismissal, and bulk read-state management where required.
- Monitoring MQTT publishing failures, Web Push delivery failures, and FCM delivery failures separately.

The notification inbox, MQTT real-time delivery, Web Push, and FCM should be treated as related but independent parts of the overall notification system.

The backend remains responsible for persisted notification records, while the frontend synchronizes and displays the appropriate state.
