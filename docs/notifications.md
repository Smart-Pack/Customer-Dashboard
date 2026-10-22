# Browser Push Notifications

## 1. Overview

The SmartPack Customer Dashboard implements browser push notifications to allow users to manage notifications directly from the dashboard.

The feature consists of three main parts:

1. **Notification Bell Component** — provides the user interface for enabling, disabling, and managing browser push notifications.
2. **Push Notification Service** — handles browser notification support checks, permission requests, service worker registration, push subscription management, and backend synchronization.
3. **Service Worker** — receives incoming push events, displays browser notifications, and handles navigation when users click notifications.

The browser subscription is synchronized with the SmartPack backend so that push messages can be delivered to the appropriate browser endpoint.

### Main files

| File | Responsibility |
|---|---|
| `src/components/Notifications/NotificationBell.vue` | Notification controls and subscription status |
| `src/services/pushNotifications.ts` | Browser push notification logic and backend synchronization |
| `public/sw.js` | Receives push events and displays notifications |
| `src/components/Icons/BellIcon.vue` | Icon displayed when notifications are enabled |
| `src/components/Icons/BellSlashIcon.vue` | Icon displayed when notifications are disabled |
| `src/components/Icons/CogIcon.vue` | Icon linking to notification settings |
| `src/layout/Dashboard/TopBar.vue` | Integrates the notification bell into the dashboard header |
| `src/components/Notifications/__tests__/NotificationBell.spec.ts` | Tests for the notification bell |
| `src/services/__tests__/pushNotifications.spec.ts` | Tests for the push notification service |
| `src/tests/service-worker/sw.spec.ts` | Tests for service worker behavior |

---

## 2. Notification Bell Component

**File:** `src/components/Notifications/NotificationBell.vue`

The `NotificationBell` component provides the dashboard interface for managing browser push notifications.

It is integrated into the dashboard `TopBar.vue`, making notification controls accessible from the main dashboard header.

### 2.1 Icon states

The component displays an icon based on the current browser subscription state.

| State | Icon | Meaning |
|---|---|---|
| Notifications enabled | `BellIcon` | The browser has an active push subscription |
| Notifications disabled | `BellSlashIcon` | The browser is not currently subscribed |

The state is tracked using the `isSubscribed` reactive reference.

```typescript
const isSubscribed = ref(false)
```

The icon updates automatically when the subscription state changes.

**Important:** This state represents the browser's push subscription status, not whether the user has read notifications or whether every push message has been delivered successfully.

### 2.2 Dropdown interface

Clicking the notification bell opens a dropdown containing:

- A notification heading.
- A link to notification settings on the user profile page.
- A description of the current notification state.
- A button for enabling or disabling notifications.
- A loading indicator while the operation is in progress.
- A message when browser push notifications are unsupported.

The dropdown uses the reactive `isDropdownOpen` reference to control visibility.

```typescript
const isDropdownOpen = ref(false)

function toggleDropdown(): void {
  isDropdownOpen.value = !isDropdownOpen.value
}
```

The notification settings link navigates to the profile page with the notification tab selected:

```typescript
{
  name: 'my-profile',
  query: { tabs: 'notification' },
}
```

Ensure that the `my-profile` route recognizes the `tabs=notification` query parameter.

### 2.3 Enabling and disabling notifications

The main operation is implemented in `toggleNotifications()`.

When the user clicks the action button:

1. The component checks whether another subscription operation is already running.
2. It enables the loading state.
3. It determines whether the user intends to subscribe or unsubscribe.
4. It invokes the corresponding service function.
5. It checks the actual browser subscription state.
6. It displays a success message if the resulting state matches the requested state.
7. It closes the dropdown after success.
8. It reports errors and rechecks the browser state if the operation fails.
9. It clears the loading state when the operation finishes.

The component uses these service functions:

```typescript
subscribeToPushNotifications()
unsubscribeFromPushNotifications()
isSubscribedToPushNotifications()
```

The loading state prevents repeated operations while a subscription request is running.

```typescript
const isLoading = ref(false)
```

The action button is disabled while loading or when push notifications are unsupported.

### 2.4 Error handling

The component handles errors from subscription operations and status checks.

It uses the application's global notification utilities:

```typescript
const { $notifySuccess, $notifyError } = useGlobals()
```

Success messages inform the user when browser notifications are enabled or disabled. Errors are displayed through `$notifyError`.

If an operation fails, the component attempts to retrieve the browser's actual subscription state rather than assuming that the operation either succeeded or failed completely.

This is important because a browser subscription operation and its corresponding backend request may not always finish successfully together.

For example, the browser may create a subscription before a backend synchronization request fails.

### 2.5 Dropdown dismissal and cleanup

The component supports dismissing the dropdown by:

- Clicking outside the notification component.
- Pressing the `Escape` key.

The outside-click handler checks whether the event target is contained within the component's root element.

```typescript
function handleOutsideClick(event: MouseEvent): void {
  if (
    containerRef.value &&
    event.target instanceof Node &&
    !containerRef.value.contains(event.target)
  ) {
    isDropdownOpen.value = false
  }
}
```

Event listeners are registered when the component mounts and removed when it unmounts.

```typescript
onMounted(() => {
  void refreshSubscriptionStatus()

  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
```

Removing these listeners prevents unnecessary document-level event handlers from remaining after the component has been destroyed.

---

## 3. Push Notification Service

**File:** `src/services/pushNotifications.ts`

The push notification service separates browser subscription logic from the Vue component.

This allows the notification logic to be tested independently and reused by other components if necessary.

Its responsibilities include:

- Checking browser support.
- Checking the current subscription state.
- Registering the service worker.
- Requesting notification permission.
- Creating a browser push subscription.
- Synchronizing subscription details with the backend.
- Removing subscriptions.
- Synchronizing existing subscriptions without creating new ones.

### 3.1 VAPID public key configuration

The service obtains the VAPID public key from the frontend environment.

```typescript
const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEBPUSH_VAPID_PUBLIC_KEY
```

Configure the public key in the frontend environment file:

```dotenv
# Public VAPID key used for Web Push notifications.
VITE_WEBPUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Use the public VAPID key corresponding to the backend's Web Push configuration.

The frontend public key must match the public key associated with the backend's VAPID private key.

**Security:** Only the public key belongs in a `VITE_` environment variable. Never expose the VAPID private key in frontend code or a frontend environment variable.

Because Vite exposes `VITE_` variables to browser code, the public key is not a secret.

Restart the Vite development server after changing environment variables.

### 3.2 Browser support detection

The `isPushNotificationSupported()` function checks whether the browser provides the required APIs.

The feature depends on:

- Service workers.
- The Push API.
- The Notifications API.

If the required browser APIs are unavailable, the interface disables the subscription action and informs the user.

This check determines whether the required APIs exist. It does not guarantee that the user has granted notification permission or that a subscription is currently active.

### 3.3 Checking subscription status

The `isSubscribedToPushNotifications()` function checks whether the browser currently has a push subscription.

The check considers:

- Browser API support.
- Notification permission.
- Service worker registration.
- An existing subscription obtained through the service worker's `PushManager`.

The component uses this function to determine which bell icon to display and which action to offer.

A browser can support push notifications while still being unsubscribed. Similarly, an existing subscription may need to be synchronized with the backend.

### 3.4 Service worker registration

The `ensureServiceWorkerReady()` function registers the service worker and waits for it to become ready.

The service worker is registered from:

```text
/sw.js
```

The browser registration is obtained through the Service Worker API.

The service worker is responsible for receiving push events and displaying notifications even when the dashboard page is not actively handling the event.

Registration errors are handled by the service rather than being silently treated as successful registration.

### 3.5 Requesting notification permission

The `requestNotificationPermission()` function requests browser notification permission.

The browser can grant, deny, or leave the permission in its default state.

Permission and subscription are separate concepts:

- **Permission** determines whether the website is allowed to display notifications.
- **Subscription** provides the browser push endpoint and associated subscription information needed for push delivery.

Granting permission does not necessarily mean that a push subscription has been created.

### 3.6 Creating a push subscription

The `subscribeToPushNotifications()` function performs the subscription workflow.

At a high level, it:

1. Checks browser support.
2. Verifies that the VAPID public key is configured.
3. Requests notification permission.
4. Ensures the service worker is ready.
5. Retrieves an existing browser subscription or creates one.
6. Uses the VAPID public key when creating a new subscription.
7. Sends the subscription details to the SmartPack backend.

An existing subscription is reused where possible rather than creating a new subscription unnecessarily.

The backend stores the subscription so it can associate the browser endpoint with the relevant user and send push messages.

The service uses the `pushSubscriptions` API module for backend communication.

### 3.7 Synchronizing an existing subscription

The `syncPushSubscription()` function synchronizes an existing browser subscription with the backend.

It is intentionally different from the subscribe operation.

| Function | Purpose |
|---|---|
| `subscribeToPushNotifications()` | Creates or reuses a browser subscription and synchronizes it with the backend |
| `syncPushSubscription()` | Synchronizes an existing browser subscription without requesting permission or creating a new subscription |
| `isSubscribedToPushNotifications()` | Checks the current browser subscription state |
| `unsubscribeFromPushNotifications()` | Removes the browser subscription and its matching backend record |

The component calls `syncPushSubscription()` when it discovers an existing subscription during initialization.

This helps ensure that an existing browser subscription is represented in the backend.

### 3.8 Unsubscribing

The `unsubscribeFromPushNotifications()` function handles removing a browser push subscription.

The workflow is:

1. Retrieve the existing browser subscription.
2. If no subscription exists, there is nothing to unsubscribe from.
3. Retrieve the user's stored push subscriptions from the backend.
4. Find the backend record matching the browser subscription endpoint.
5. Remove the matching backend record if it exists.
6. Unsubscribe the browser subscription.

This keeps browser-side and backend subscription records aligned as far as the completed operations allow.

Because these operations involve separate systems, failures can leave their states temporarily inconsistent. Error handling and subsequent synchronization may be necessary to recover.

---

## 4. Service Worker

**File:** `public/sw.js`

The service worker handles incoming push events and notification clicks.

It is served from the application's public root as `/sw.js`.

### 4.1 Receiving push events

The service worker listens for the `push` event.

When a push event arrives, it reads the message payload and attempts to parse it as JSON.

The implementation supports:

- JSON payloads.
- Plain-text payloads.
- Default notification titles and bodies when payload fields are missing.
- Notification metadata such as a tag and target URL.

If JSON parsing fails, the worker falls back to using the message as text.

The notification is displayed using the browser's notification API, with `event.waitUntil()` used to keep the service worker alive while the asynchronous work completes.

Conceptually, the process is:

```text
Push event received
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

### 4.2 Notification payload

The service worker expects a payload that can provide notification details, including:

- `title`: the notification heading.
- `body`: the notification message.
- `url`: the destination opened when the notification is clicked.
- Additional notification metadata where applicable.

A representative JSON payload is:

```json
{
  "title": "SmartPack Alert",
  "body": "Your SmartPack has reported a new update.",
  "url": "/dashboard"
}
```

This is an illustrative payload format. The actual fields sent by the backend should match the service worker's implementation.

When a field is omitted, the service worker uses its configured defaults where supported.

### 4.3 Handling notification clicks

The service worker listens for `notificationclick` events.

When a user clicks a notification, the worker:

1. Closes the notification.
2. Resolves the destination URL against the application's origin.
3. Rejects destinations belonging to a different origin.
4. Looks for an existing application window.
5. Navigates and focuses a suitable same-origin window where possible.
6. Opens a new window if no suitable window is available.

Restricting navigation to the application's own origin helps prevent notification payloads from redirecting users to arbitrary external websites.

For example, a notification can direct the user to:

```text
/dashboard
```

The actual route must exist in the dashboard application.

---

## 5. Dashboard Integration

**File:** `src/layout/Dashboard/TopBar.vue`

The notification bell is integrated into the dashboard header using the `NotificationBell` component.

```vue
<NotificationBell class="mr-4 lg:mr-6" />
```

The bell is positioned beside the existing dashboard controls.

The updated header retains the existing functionality, including:

- Mobile side-navigation toggle.
- Theme toggle.
- User profile display.
- Account dropdown.
- Profile navigation.
- Logout action.

Keeping notification functionality in a separate component prevents the main header from becoming responsible for all subscription-management logic.

The `NotificationBell` component can therefore manage its own state, event listeners, error handling, and interaction behavior.

---

## 6. Backend Integration

The frontend uses the `pushSubscriptions` API module to communicate with the SmartPack backend.

The service synchronizes browser subscription details with the backend so that the server can associate a push endpoint with a user.

The high-level relationship is:

```text
Vue NotificationBell
        |
        v
pushNotifications.ts
        |
        +---- Browser Notifications API
        |
        +---- Service Worker / PushManager
        |
        v
pushSubscriptions API module
        |
        v
SmartPack Backend
        |
        v
Stored browser subscription
```

The frontend is responsible for obtaining and managing the browser subscription. The backend is responsible for storing subscription details and using them when sending push notifications.

The exact API endpoint paths, request schemas, response schemas, and authentication requirements should be documented alongside the backend API implementation to avoid duplicating or misrepresenting its contract.

---

## 7. Testing

The notification feature has dedicated tests for its component and browser subscription service.

### 7.1 Notification Bell tests

**File:** `src/components/Notifications/__tests__/NotificationBell.spec.ts`

These tests cover:

- Initial subscription state.
- Rendering the enabled and disabled states.
- Subscription status refresh on mount.
- Synchronization of existing subscriptions.
- Opening and closing the dropdown.
- Navigation to notification settings.
- Unsupported browser behavior.
- Outside-click dismissal.
- Escape-key dismissal.
- Document event-listener cleanup.
- Enabling notifications.
- Disabling notifications.
- Loading state behavior.
- Subscription failures.
- Error-message handling.
- Rechecking the actual browser state after an operation fails.

### 7.2 TopBar tests

**File:** `src/layout/Dashboard/__tests__/TopBar.spec.ts`

The tests verify that the notification bell appears in the dashboard header and that existing header functionality remains intact.

Coverage includes:

- Dashboard title and welcome message.
- User icon or profile picture.
- Notification bell rendering.
- Side-navigation toggle.
- Theme switching.
- Account dropdown.
- Profile navigation.
- Logout behavior.

### 7.3 Running the tests

Run both related test files:

```bash
pnpm vitest --run \
  src/layout/Dashboard/__tests__/TopBar.spec.ts \
  src/components/Notifications/__tests__/NotificationBell.spec.ts
```

Run the notification component tests independently:

```bash
pnpm vitest --run \
  src/components/Notifications/__tests__/NotificationBell.spec.ts
```

Run the TopBar tests independently:

```bash
pnpm vitest --run \
  src/layout/Dashboard/__tests__/TopBar.spec.ts
```

The reported test results for the current implementation are:

| Test file | Tests passed |
|---|---:|
| `NotificationBell.spec.ts` | 26 |
| `TopBar.spec.ts` | 20 |
| **Total** | **46** |

These results reflect the test runs reported during development. Rerun the tests after subsequent changes to confirm the current state.

The push notification service and service worker also have dedicated test files. Run their tests separately when modifying those parts of the implementation.

---

## 8. Troubleshooting

### Notifications are not supported

Check that the browser provides the required service worker, push, and notification APIs.

The site must also be served in an environment where service workers are permitted. In production, this generally means HTTPS.

### The bell displays notifications as disabled

The component checks the browser's actual subscription state when it mounts. Check:

- Whether notification permission has been granted.
- Whether the service worker has registered successfully.
- Whether the browser has an active push subscription.
- Whether the subscription status check succeeds.

### The subscription exists in the browser but not in the backend

Check the frontend API request and backend logs.

Verify that the subscription synchronization request succeeds and that the backend associates the subscription with the correct authenticated user.

### The VAPID public key is missing

Verify that the frontend environment contains:

```dotenv
VITE_WEBPUSH_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Confirm that the value matches the public key associated with the backend's VAPID private key.

Restart the frontend development server after changing environment variables.

### Clicking a notification does not navigate correctly

Check the notification payload's `url` field and confirm that the destination is a valid route in the dashboard application.

The service worker only permits navigation to URLs on the same origin.

### Browser and backend subscription states differ

A browser subscription and its backend record are managed by separate systems. A network failure during synchronization or unsubscription can leave their states inconsistent.

Inspect the browser subscription and backend record, then retry synchronization or cleanup as appropriate.

---

## 9. Design Considerations

The implementation follows several useful design principles:

1. **Separation of concerns:** Vue handles the interface, the service handles subscription logic, and the service worker handles push events.
2. **Reactive state:** The bell icon and dropdown respond to changes in component state.
3. **Explicit user action:** The component requests subscription changes through a user-triggered control.
4. **Error handling:** Subscription operations report failures and recheck the actual browser state.
5. **Resource cleanup:** Document event listeners are removed when the component unmounts.
6. **Same-origin navigation:** Notification-click destinations are restricted to the application's origin.
7. **Testability:** Component interactions, service behavior, and service worker events have separate test files.

## 10. Limitations and Future Improvements

Potential improvements include:

- Refreshing subscription status when the user returns to the dashboard after changing browser permissions.
- Detecting browser-side subscription expiration or revocation and synchronizing the backend accordingly.
- Adding more explicit recovery behavior for partial failures between browser and backend operations.
- Documenting the backend push-subscription API contract and the complete notification payload schema.
- Testing push delivery end-to-end in a real browser and deployed environment.
- Adding integration tests for notification delivery and notification-click navigation.

The notification bell currently manages browser push subscription state. It should not be treated as a complete notification inbox or as proof that every backend push message has been delivered or displayed.
