# Push Notifications Service

## Overview

The Push Notifications Service manages browser-based Web Push notifications for the SmartPack Customer Dashboard.

It integrates the browser's Service Worker API, Push API, and Notifications API with the SmartPack backend to allow authenticated users to receive notifications even when the dashboard is not actively open in a browser tab.

The service handles browser support detection, notification permissions, service worker registration, push subscription management, and synchronization of subscriptions with the backend.

**Platform support:** Compatible browsers that support the required Web Push APIs.

## Key Responsibilities

The service is responsible for:

- Detecting browser support for Web Push notifications.
- Checking existing notification permissions and push subscriptions.
- Registering and activating the application's service worker.
- Requesting permission to display browser notifications.
- Creating browser push subscriptions using the configured VAPID public key.
- Registering subscriptions with the authenticated SmartPack backend.
- Removing subscriptions from both the backend and browser.
- Synchronizing existing browser subscriptions with the backend.
- Handling errors from browser APIs and backend requests.

## Architecture

The service acts as an abstraction between the dashboard, browser notification APIs, and the SmartPack backend.

```text
Vue Components
      |
      v
Push Notifications Service
      |
      +------------------------+
      |                        |
      v                        v
Browser Push APIs         SmartPack Backend
      |                        |
      v                        v
Service Worker            Push Subscription API
      |
      v
Browser Notifications
```

Vue components interact with the exported service functions rather than directly managing browser push subscriptions.

## Browser Support Detection

The service checks whether the browser provides the required APIs:

- **Service Worker API:** Enables background notification handling.
- **Push API:** Manages browser push subscriptions.
- **Notifications API:** Requests permission and displays notifications.

Web Push functionality is considered supported only when all three APIs are available.

The support check does not guarantee that notification permission has been granted or that a valid subscription exists.

## Service Worker Management

The service registers the application's root service worker (`/sw.js`) and waits for an active registration.

The service worker handles background push events and allows notifications to be received when the dashboard is not actively open.

Registration failures are logged and handled without exposing browser-specific implementation details to consuming components.

## Notification Permissions

Before creating a push subscription, the service requests permission from the browser.

The browser permission state determines whether notifications can be enabled:

| Permission | Description |
|---|---|
| `granted` | Notifications are permitted. |
| `denied` | Notifications are blocked. |
| `default` | Permission has not yet been decided. |

A push subscription cannot be created unless notification permission is granted.

## Subscription Management

### Subscribe

The subscription workflow:

1. Checks browser support.
2. Verifies that the VAPID public key is configured.
3. Requests notification permission.
4. Ensures the service worker is registered and active.
5. Retrieves an existing browser subscription or creates a new one.
6. Sends the subscription endpoint and details to the SmartPack backend.

The VAPID public key is supplied through the `VITE_WEBPUSH_VAPID_PUBLIC_KEY` environment variable.

The browser subscription is registered through the `pushSubscriptions` API module.

### Unsubscribe

The unsubscription workflow:

1. Checks browser support.
2. Retrieves the root service worker registration.
3. Retrieves the existing browser push subscription.
4. Finds the corresponding subscription record on the backend.
5. Removes the backend record if one exists.
6. Unsubscribes the browser locally.

The backend record is removed before the local browser subscription to avoid leaving an active backend record when the browser has already unsubscribed.

### Synchronize

The synchronization workflow ensures that an existing browser subscription is registered with the SmartPack backend.

It:

- Checks Web Push support.
- Verifies that notification permission is granted.
- Ensures the service worker is ready.
- Retrieves the existing browser subscription.
- Sends its endpoint and subscription details to the backend.

Synchronization does not request notification permission or create a new subscription. It returns without making changes when synchronization is unnecessary.

## Backend Integration

The service communicates with the SmartPack backend through the `pushSubscriptions` API module.

| Operation | Backend interaction |
|---|---|
| Subscribe | Creates or registers a push subscription. |
| Unsubscribe | Retrieves existing subscriptions and removes the matching record. |
| Synchronize | Registers the existing browser subscription. |

Subscription information includes:

- **Endpoint:** The browser-generated push service endpoint.
- **Subscription information:** The subscription details returned by the browser's `toJSON()` method.

Backend requests require the appropriate authenticated user context.

## Error Handling

The service handles errors arising from:

- Unsupported browser APIs.
- Missing VAPID configuration.
- Denied notification permissions.
- Service worker registration failures.
- Push subscription creation failures.
- Missing subscription endpoints.
- Backend API request failures.
- Browser subscription removal failures.

Axios errors are converted into standard JavaScript errors while other errors are propagated to the caller.

This allows Vue components to handle failures consistently and provide appropriate feedback to users.

## Testing

The service is covered by Vitest unit tests using mocked browser APIs and backend API methods.

Tests should cover:

- Browser support detection.
- Existing subscription and permission checks.
- Service worker registration.
- Notification permission requests.
- Subscription creation and backend registration.
- Existing subscription reuse.
- Backend subscription removal and browser unsubscription.
- Subscription synchronization.
- Error handling for browser and backend operations.

## Related Components

- **Push Notifications Service:** `src/services/pushNotifications.ts`
- **Service Worker:** `public/sw.js`
- **Backend API Module:** `src/api/modules/pushSubscriptions.ts`
- **Environment Configuration:** `VITE_WEBPUSH_VAPID_PUBLIC_KEY`
- **Notification UI:** Dashboard notification components.
