# SmartPack Dashboard Notifications

## 1. Overview

The SmartPack Customer Dashboard provides an integrated notification system that combines an in-dashboard notification inbox, real-time notification delivery through MQTT, and browser push notifications.

The system allows users to view notifications, track unread notifications, mark notifications as read, navigate to relevant dashboard pages, and manage browser push notification subscriptions.

The implementation consists of four main parts:

1. **Notification Bell** — provides access to the notification dropdown, displays the unread notification count, and provides access to notification settings and browser push controls.
2. **Notification Content** — retrieves notifications from the backend, subscribes to the authenticated user's MQTT topic, displays notifications, and manages read state.
3. **Notification and Push Services** — handle backend API communication, MQTT configuration, browser push subscriptions, and subscription synchronization.
4. **Service Worker** — receives browser push events, displays system notifications, and handles navigation when users click them.

The backend remains the source of truth for notification records. REST API requests retrieve existing notifications and update their state, while MQTT delivers real-time notification events to connected dashboards. Browser push notifications provide a separate delivery mechanism that can notify users when they are not actively viewing the dashboard.

### Main files

| File | Responsibility |
|---|---|
| `src/components/Notifications/NotificationBell.vue` | Notification dropdown, unread count, settings navigation, and browser push controls |
| `src/components/Notifications/NotificationContent.vue` | Notification retrieval, rendering, MQTT subscription, read-state management, and error handling |
| `src/services/pushNotifications.ts` | Browser push support, permission handling, service worker registration, and subscription synchronization |
| `src/api/` notification API module | Retrieves notifications and updates their state |
| `src/api/` push subscription API module | Creates, lists, and removes backend push subscription records |
| `src/stores/` MQTT store module | Provides MQTT connection configuration |
| `src/stores/modules/auth/getters.ts` | Exposes the authenticated user's UUID for MQTT topic subscriptions |
| `public/sw.js` | Handles browser push events and notification clicks |
| `src/components/Icons/BellIcon.vue` | Icon displayed when browser push notifications are enabled |
| `src/components/Icons/BellSlashIcon.vue` | Icon displayed when browser push notifications are disabled |
| `src/components/Icons/CogIcon.vue` | Icon linking to notification settings |
| `src/layout/Dashboard/TopBar.vue` | Integrates the notification bell into the dashboard header |
| `src/components/Notifications/__tests__/NotificationBell.spec.ts` | Notification bell component tests |
| `src/components/Notifications/__tests__/NotificationContent.spec.ts` | Notification content and MQTT integration tests |
| `src/services/__tests__/pushNotifications.spec.ts` | Browser push service tests |
| `src/tests/service-worker/sw.spec.ts` | Service worker tests |

*Note: Confirm the exact notification and push subscription API module paths against the current repository before using this table as a definitive file inventory.*

---

## 2. Notification Architecture

The notification system uses REST API requests, MQTT, and browser push notifications for different purposes.

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

The MQTT topic must match the topic used by the backend publisher. Both sides should use the user's unique UUID rather than the database primary key.

### 2.3 Browser push notifications

Browser push notifications are separate from MQTT delivery.

MQTT updates an active dashboard connection. Web Push allows the browser to receive push messages through its push subscription and service worker without requiring the dashboard page to maintain an active MQTT connection.

The backend stores browser push subscriptions and uses them when sending push messages.

A successful MQTT delivery does not imply that a browser push notification was delivered, and a browser push subscription does not imply that the dashboard is connected to MQTT.

### 2.4 High-level architecture

```text
                    SmartPack Backend
                           |
               +-----------+-----------+
               |                       |
               v                       v
        Notification API          MQTT Publisher
               |                       |
               |                       v
               |                  MQTT Broker
               |                       |
               v                       v
        Notification Content <--- MQTT Subscription
               |
               v
        Notification Dropdown
               |
               v
        Mark as Read / Navigation


        SmartPack Backend
               |
               v
        Web Push Delivery
               |
               v
        Browser Push Service
               |
               v
        Service Worker
               |
               v
        Browser Notification
```

---

## 3. Notification Bell Component

**File:** `src/components/Notifications/NotificationBell.vue`

The `NotificationBell` component provides the main interface for accessing notifications from the dashboard header.

It is integrated into `TopBar.vue` and contains the notification dropdown, notification settings link, unread count, and browser push notification controls.

### 3.1 Browser push icon states

The bell icon represents the browser's push subscription state.

| State | Icon | Meaning |
|---|---|---|
| Subscribed | `BellIcon` | The browser has an active push subscription |
| Not subscribed | `BellSlashIcon` | The browser does not currently have an active push subscription |

The state is represented by the reactive `isSubscribed` reference.

```typescript
const isSubscribed = ref(false)
```

The icon reflects browser subscription status, not the number of unread notifications.

The unread count is maintained separately and reflects the notification inbox state.

### 3.2 Notification dropdown

Clicking the notification bell opens a dropdown containing:

- A **Notifications** heading.
- The unread notification count when the count is greater than zero.
- A link to notification settings.
- The notification content component.
- Browser push notification controls.

The dropdown visibility is managed using reactive component state.

```typescript
const isDropdownOpen = ref(false)

function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value
}
```

The unread count is updated by events emitted from `NotificationContent`.

```vue
<NotificationContent
  :unread-count="unreadNotifications"
  @unread-count-change="handleUnreadCountChange"
/>
```

The parent component handles updates and prevents negative counts:

```typescript
const unreadNotifications = ref(0)

function handleUnreadCountChange(count: number): void {
  unreadNotifications.value = Math.max(0, count)
}
```

The count is displayed in the heading only when there are unread notifications.

### 3.3 Notification settings

The dropdown includes a settings link that navigates to the profile page with the notification tab selected.

```typescript
{
  name: 'my-profile',
  query: { tabs: 'notification' },
}
```

The `my-profile` route must support the `tabs=notification` query parameter.

The settings link should have an accessible label, such as `Notification settings`.

### 3.4 Browser push controls

The component provides controls for enabling and disabling browser push notifications.

The main operation is implemented through `toggleNotifications()`, which calls the appropriate service function depending on the current subscription state.

```typescript
subscribeToPushNotifications()
unsubscribeFromPushNotifications()
isSubscribedToPushNotifications()
```

The component manages the loading state, success messages, error messages, and subscription-state refresh.

The action button is disabled while an operation is in progress or when browser push notifications are unsupported.

Browser push controls affect push subscription state; they do not disable MQTT notifications or remove notifications from the inbox.

### 3.5 Error handling

Subscription operations can involve both browser APIs and backend requests. One operation may succeed while the other fails.

For example, the browser may create a push subscription but the request to register it with the backend may fail.

When an operation fails, the component reports the error and attempts to refresh the actual browser subscription state rather than assuming the subscription was unchanged.

### 3.6 Dropdown dismissal and cleanup

The component supports dismissing the dropdown by clicking outside it or pressing the `Escape` key.

Document-level event listeners are removed when the component unmounts to prevent unnecessary event handlers from remaining active.

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

This helps prevent notifications received through MQTT from disappearing while the initial API request is in progress.

### 4.2 MQTT configuration

The frontend obtains MQTT connection settings through the backend configuration API and the MQTT store.

The configuration may include:

- Broker hostname.
- Broker port.
- TLS settings.
- Frontend MQTT username.
- Frontend MQTT password.

The actual values depend on the deployed environment.

Credentials must not be hard-coded in the component. The frontend should use the configured connection settings supplied through the application's intended configuration flow.

The backend configuration endpoint should return only credentials intended for frontend use, with permissions restricted to the necessary topics.

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

This is an illustrative example of the event structure. The exact fields and timestamp formats must remain consistent with the backend publisher and notification model.

The component validates incoming payloads before processing them.

It ignores malformed messages, unrelated events, duplicate notifications, and notifications that are already read or dismissed.

### 4.5 Merging API and MQTT notifications

The component must account for notifications arriving while the initial API request is still pending.

It merges API results with notifications received through MQTT, removes duplicates, sorts the list by creation time, and limits the displayed collection to the 20 most recent notifications.

This avoids losing a real-time notification simply because it arrived while the REST request was being processed.

### 4.6 Unread count synchronization

The component reports changes to the unread notification count to its parent through the `unread-count-change` event.

The parent component uses the emitted count to update the number displayed in the notification heading.

The unread count should remain consistent with the displayed notification state and the backend's notification records.

### 4.7 Marking notifications as read

When a user marks a notification as read, the component sends the corresponding update to the backend.

It prevents duplicate requests for the same in-progress update and handles failures without incorrectly assuming that the backend successfully changed the notification's state.

The component also updates the displayed notification state and unread count when the operation succeeds.

### 4.8 Connection and error states

The component handles MQTT connection events, including:

- Successful connection.
- Offline state.
- Reconnection attempts.
- Connection closure.
- Connection errors.

It also handles notification API loading and error states.

When the notification request fails, the interface provides an error state and a retry mechanism.

An MQTT connection failure should not be interpreted as proof that no notifications exist. The REST API remains available for retrieving persisted notifications when connectivity is restored.

### 4.9 Resource cleanup

When the component unmounts, it removes MQTT event listeners and closes or releases the MQTT client resources associated with the component.

This prevents stale event handlers and unnecessary connections from remaining after the notification dropdown content is destroyed.

---

## 5. Push Notification Service

**File:** `src/services/pushNotifications.ts`

The push notification service separates browser subscription logic from Vue components.

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

Restart the Vite development server after changing environment variables.

### 5.2 Browser support

The service checks whether the browser provides the APIs required for push notifications, including service workers, the Push API, and the Notifications API.

The availability of these APIs does not guarantee that notification permission has been granted or that a subscription exists.

### 5.3 Subscription status

The service checks the browser's existing push subscription through the service worker registration and `PushManager`.

The result determines whether the notification bell displays the subscribed or unsubscribed icon.

An existing subscription may still require synchronization with the backend.

### 5.4 Service worker registration

The service registers the worker at:

```text
/sw.js
```

It obtains the registration and waits for it to become ready before performing subscription operations.

Registration errors are surfaced to the calling component rather than silently treated as success.

### 5.5 Requesting permission

The service requests notification permission when the user initiates the subscription workflow.

Permission and subscription are separate:

- **Permission** allows the website to request that the browser display notifications.
- **Subscription** provides the endpoint and associated information required for push delivery.

Granting permission does not automatically create a push subscription.

### 5.6 Creating and synchronizing a subscription

The `subscribeToPushNotifications()` function checks support and configuration, requests permission, ensures that the service worker is ready, creates or reuses a browser subscription, and synchronizes the resulting subscription with the backend.

The `syncPushSubscription()` function synchronizes an existing subscription without requesting permission or creating a new one.

| Function | Purpose |
|---|---|
| `subscribeToPushNotifications()` | Creates or reuses a subscription and synchronizes it with the backend |
| `syncPushSubscription()` | Synchronizes an existing browser subscription |
| `isSubscribedToPushNotifications()` | Checks the current browser subscription state |
| `unsubscribeFromPushNotifications()` | Removes the browser subscription and its matching backend record |

The backend associates the subscription with the authenticated user so that push messages can be sent to the appropriate browser endpoint.

### 5.7 Unsubscribing

The unsubscription workflow retrieves the existing browser subscription, identifies the matching backend record, removes the backend record if present, and unsubscribes the browser.

Because the browser and backend are separate systems, a failure can leave their states temporarily inconsistent. Subsequent synchronization or cleanup may be required.

---

## 6. Service Worker

**File:** `public/sw.js`

The service worker handles incoming browser push events and notification clicks.

It is served from the application root at `/sw.js`.

### 6.1 Receiving push events

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

### 6.2 Push payload

A representative payload is:

```json
{
  "title": "SmartPack Alert",
  "body": "Your SmartPack has reported a new update.",
  "url": "/dashboard"
}
```

This is an illustrative Web Push payload. It is distinct from the MQTT envelope used by the dashboard's real-time notification subscription.

The service worker should follow the payload schema used by the backend's Web Push implementation.

### 6.3 Handling notification clicks

When a user clicks a browser notification, the service worker closes it and resolves its destination URL against the application's origin.

It then looks for a suitable existing application window, navigates and focuses that window where possible, or opens a new window.

Navigation is restricted to the same origin to prevent notification payloads from redirecting users to arbitrary external websites.

The destination route must exist in the dashboard application.

---

## 7. Dashboard Integration

**File:** `src/layout/Dashboard/TopBar.vue`

The notification bell is integrated into the dashboard header:

```vue
<NotificationBell class="mr-4 lg:mr-6" />
```

The component sits alongside the existing dashboard controls.

The header retains its existing functionality, including mobile navigation, theme switching, profile access, account dropdown, and logout.

Keeping notification behavior in separate components prevents the dashboard header from becoming responsible for MQTT communication, notification retrieval, read-state updates, and browser push subscription management.

---

## 8. Backend Integration

The frontend interacts with the SmartPack backend through two distinct notification mechanisms.

### 8.1 REST API

The notification API is responsible for retrieving persisted notifications and updating notification state.

The push subscription API manages browser subscription records.

The frontend uses the appropriate API modules rather than embedding request logic directly in the notification components.

### 8.2 MQTT notification publishing

When a new notification is created, the backend publishes a message to the recipient's MQTT topic when MQTT publishing is enabled.

The topic format is:

```text
users/{user.unique_id}
```

The message contains an event name and notification data.

The backend publisher and frontend subscriber must agree on:

- Topic naming.
- Event type.
- Notification payload structure.
- Broker configuration.
- Authentication and topic permissions.

The frontend should subscribe only to the authenticated user's authorized topic.

### 8.3 Browser push delivery

The backend stores browser push subscriptions and uses them to deliver Web Push messages.

This mechanism is separate from MQTT publishing. Each mechanism has its own configuration, delivery behavior, and failure modes.

### 8.4 Reliability and recovery

MQTT is used for real-time delivery to connected clients; it should not be treated as a permanent notification history.

A dashboard may disconnect, reload, or miss an event while offline. When it reconnects, it should retrieve persisted notifications from the REST API.

The backend notification database remains the source of truth for the inbox.

---

## 9. Testing

The notification system has dedicated tests for the bell component, notification content, push subscription service, and service worker.

### 9.1 Notification Bell tests

**File:** `src/components/Notifications/__tests__/NotificationBell.spec.ts`

Tests cover the notification bell's rendering, unread count, dropdown interactions, settings navigation, browser push subscription controls, error handling, and event-listener cleanup.

They also verify that notification content is embedded in the dropdown and that unread count updates are reflected in the heading.

### 9.2 Notification Content tests

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

### 9.3 TopBar tests

**File:** `src/layout/Dashboard/__tests__/TopBar.spec.ts`

Tests verify that the notification bell is integrated into the dashboard header and that existing navigation, profile, theme, and account interactions remain functional.

### 9.4 Push notification service tests

**File:** `src/services/__tests__/pushNotifications.spec.ts`

These tests cover browser support checks, permission handling, service worker registration, subscription creation, backend synchronization, and unsubscription behavior.

### 9.5 Service worker tests

**File:** `src/tests/service-worker/sw.spec.ts`

These tests cover push payload handling, browser notification display, fallback behavior, and notification-click navigation.

### 9.6 Running tests

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

Run the push notification service tests:

```bash
pnpm vitest --run \
  src/services/__tests__/pushNotifications.spec.ts
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

## 10. Troubleshooting

### 10.1 Notifications do not appear in the dropdown

Check that the notification API request succeeds and returns the expected response structure.

Confirm that the notification matches the requested filters and that the component is receiving the correct authenticated user's data.

### 10.2 Real-time notifications are not received

Check:

- Whether the MQTT configuration endpoint succeeds.
- Whether the broker is reachable.
- Whether the frontend can authenticate with the broker.
- Whether the client subscribes to the correct `users/{user_uuid}` topic.
- Whether the backend publishes to the same topic.
- Whether the MQTT message contains the expected event envelope and notification data.

Review both frontend and backend logs.

### 10.3 Notifications disappear or are missing after reconnecting

MQTT delivery alone does not guarantee that a disconnected client will receive every message published while offline.

The frontend should retrieve persisted notifications through the REST API when it initializes or when recovery is needed.

Confirm that the backend saves notifications before publishing their MQTT events.

### 10.4 The unread count is incorrect

Check that the REST API response and MQTT events are merged without duplicating notifications.

Verify that read and dismissed notifications are excluded where appropriate and that count-change events are emitted after notification state changes.

### 10.5 Browser push notifications are unsupported

Confirm that the browser supports service workers, the Push API, and the Notifications API.

Production deployments generally require HTTPS for service workers and push notifications, except for browser-recognized secure development origins such as `localhost`.

### 10.6 The browser subscription exists but not in the backend

Inspect the subscription synchronization API request and backend logs.

Confirm that the backend associates the subscription with the authenticated user and that the request succeeds.

### 10.7 The VAPID public key is missing or invalid

Verify the frontend environment variable:

```dotenv
VITE_WEBPUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Ensure that it matches the public key corresponding to the backend's VAPID private key.

Restart the frontend development server after changing environment variables.

### 10.8 Notification clicks do not navigate correctly

Check the payload's `url` field and verify that the destination is a valid same-origin dashboard route.

### 10.9 MQTT and browser push behavior differ

MQTT and Web Push are independent delivery mechanisms.

A dashboard can receive MQTT events without displaying a browser push notification, and a browser can display a push notification while the dashboard is disconnected from MQTT.

Inspect each mechanism independently when troubleshooting.

---

## 11. Design Considerations

The notification system follows these principles:

1. **Separation of concerns:** Vue components manage the interface, services manage communication and subscriptions, the backend persists notifications, and the service worker handles browser push events.
2. **Backend source of truth:** The REST API provides persisted notification state, while MQTT provides real-time updates.
3. **User-specific delivery:** MQTT subscriptions use the authenticated user's UUID.
4. **Reactive state:** The notification list and unread count update as notification state changes.
5. **Duplicate prevention:** Incoming MQTT notifications are checked before being added to the list.
6. **Error handling:** API, MQTT, and push subscription failures are handled independently.
7. **Resource cleanup:** MQTT resources and document-level event listeners are cleaned up when their components are destroyed.
8. **Same-origin navigation:** Browser notification clicks are restricted to the application's origin.
9. **Testability:** Notification components, subscription services, and service worker behavior have dedicated test files.
10. **Independent delivery mechanisms:** MQTT and Web Push serve different purposes and should be monitored separately.

---

## 12. Limitations and Future Improvements

Potential improvements include:

- Refreshing browser push subscription status when the user returns to the dashboard after changing browser permissions.
- Detecting expired or revoked browser subscriptions and synchronizing their backend records.
- Improving recovery from partial failures between browser and backend subscription operations.
- Adding explicit MQTT reconnection recovery and REST synchronization after connectivity is restored.
- Documenting the exact MQTT configuration API contract and notification payload schema.
- Adding integration tests for notification delivery across the backend, MQTT broker, and browser.
- Testing browser push delivery in deployed environments.
- Improving notification history, pagination, dismissal, and bulk read-state management where required.
- Monitoring MQTT publishing failures and Web Push delivery failures separately.

The notification inbox, MQTT real-time delivery, and browser push subscriptions should be treated as related but independent parts of the overall notification system. The backend remains responsible for persisted notification records, while the frontend synchronizes and displays the appropriate state.
