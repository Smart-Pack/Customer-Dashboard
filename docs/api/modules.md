# API Modules

The API modules provide a centralized interface for interacting with the SmartPack backend. Each module groups related API operations, keeping requests, response handling, and domain-specific functionality organized by feature.

The modules are located in:

```text
src/api/modules/
```

## Module Organization

The API modules are exposed through a central barrel file:

```text
src/api/modules/index.ts
```

This file re-exports individual modules and provides a default `api` object containing all available modules.

### Available Modules

| Module                    | Responsibility                                               |
| ------------------------- | ------------------------------------------------------------ |
| `analysis`                | Dashboard analysis and statistical data.                     |
| `auth`                    | User authentication and session management.                  |
| `fcmDevices`              | Firebase Cloud Messaging device registration and management. |
| `groups`                  | Group creation, retrieval, updates, and deletion.            |
| `groupMembers`            | Group membership management and related operations.          |
| `twoFactor`               | Two-factor authentication operations.                        |
| `mqtt`                    | MQTT-related communication and functionality.                |
| `notifications`           | User notification retrieval and management.                  |
| `notificationPreferences` | User notification preferences and settings.                  |
| `pushSubscriptions`       | Web Push subscription registration and management.           |
| `users`                   | User profile and account-related operations.                 |
| `smartpacks`              | SmartPack device management and related operations.          |

## Usage

Individual modules can be imported directly:

```typescript
import { groups, users } from '@/api/modules'

await groups.list()
await users.getMe()
```

Alternatively, use the default API object:

```typescript
import api from '@/api/modules'

await api.groups.list()
await api.users.getMe()
```

## Module Documentation

### 1. Authentication (`auth`)

The authentication module handles user authentication, session management, token verification, and password recovery.

| Function                           | Purpose                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `login(data)`                      | Authenticates a user using email and password and returns access and refresh tokens.             |
| `googleLogin(data)`                | Authenticates a user using Google Sign-In credentials.                                           |
| `logout(refresh?)`                 | Logs out the current user by invalidating the refresh token and clearing authentication cookies. |
| `refresh(refreshToken?, options?)` | Refreshes authentication tokens using a refresh token or authentication cookie.                  |
| `verify(data)`                     | Verifies an authentication token.                                                                |
| `forgotPassword(data)`             | Requests a password reset link to be sent to the user's email address.                           |
| `resetPassword(data)`              | Resets the user's password using the UID and token from the password reset link.                 |

### 2. FCM Devices (`fcmDevices`)

The FCM devices module manages Firebase Cloud Messaging device registrations associated with the authenticated user. It supports registering devices, retrieving registered devices, and removing device registrations.

| Function           | Purpose                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `create(payload)`  | Registers or updates the authenticated user's FCM device using its installation UUID and Firebase registration token. |
| `list(params?)`    | Retrieves the authenticated user's registered FCM devices, with optional device ID filtering and pagination.          |
| `remove(deviceId)` | Removes an FCM device registration using its persistent installation UUID.                                            |

### 3. Groups (`groups`)

The groups module manages group creation, retrieval, modification, and deletion. It also supports retrieving group details, including members and associated SmartPacks.

The module integrates with the local SQLite database to support offline access to paginated group listings on native platforms. Cached results are filtered according to the authenticated user's group roles.

| Function                            | Purpose                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add(payload)`                      | Creates a new group using the supplied group name.                                                                                                             |
| `list(params?)`                     | Retrieves a paginated list of groups, with optional filtering by member, owner, or administrative access.                                                      |
| `getById({ id })`                   | Retrieves a group's details, including its members and associated SmartPacks.                                                                                  |
| `remove(id)`                        | Deletes a group using its ID.                                                                                                                                  |
| `edit(id, payload)`                 | Updates an existing group's information.                                                                                                                       |
| `listWithCache(params, userGroups)` | Retrieves paginated groups with SQLite caching on native platforms. Falls back to locally cached, filtered, and paginated results when the API is unavailable. |

### 4. Group Members (`groupMembers`)

The group members module manages group memberships and invitations. It supports retrieving members, inviting users, updating member roles, removing members, leaving groups, and accepting or verifying invitations.

| Function                       | Purpose                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `list(params?)`                | Retrieves a paginated list of group members, with optional filtering by group, role, or administrative access.                         |
| `listWithCache(params)` | Fetches a paginated list of group members from the API and caches successful responses. Falls back to locally cached, filtered, and paginated group members when the native application cannot reach the API. Requires a group ID. |
| `sendInvite(groupId, payload)` | Sends an invitation to a user to join a group with the specified role.                                                                 |
| `leaveGroup(id)`               | Removes the current user's membership from a group.                                                                                    |
| `removeGroupMember(id)`        | Removes a specified user from a group.                                                                                                 |
| `edit(id, payload)`            | Updates a group member's role.                                                                                                         |
| `verifyInvite(payload)`        | Verifies an invitation token and retrieves the invitation details, including its group, assigned role, inviter, and expiration status. |
| `joinInvite(payload)`          | Accepts a group invitation and creates the user's group membership.                                                                    |

### 5. MQTT (`mqtt`)

The MQTT module retrieves the MQTT broker configuration for the authenticated user. The returned configuration provides the connection details and authentication credentials required to establish an MQTT connection.

| Function      | Purpose                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `getConfig()` | Retrieves the MQTT broker configuration, including the host, port, TLS setting, username, and password. |

### 6. Notification Preferences (`notificationPreferences`)

The notification preferences module manages the authenticated user's notification channels and contact phone numbers. It supports retrieving and updating notification preferences, as well as verifying or clearing SMS and WhatsApp phone numbers through OTP-based operations.

| Function                      | Purpose                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `get()`                       | Retrieves the authenticated user's notification preferences, including linked phone numbers and preferred notification channels. |
| `patch(payload)`              | Updates the preferred channels for general and SmartPack notifications.                                                          |
| `clearSmsPhoneNumber()`       | Removes the user's linked SMS phone number, provided SMS is not currently used by either notification category.                  |
| `requestSmsOtp(payload)`      | Requests an OTP to verify a new SMS phone number.                                                                                |
| `verifySmsOtp(payload)`       | Verifies the SMS OTP and updates the user's linked SMS phone number.                                                             |
| `clearWhatsAppPhoneNumber()`  | Removes the user's linked WhatsApp phone number, provided WhatsApp is not currently used by either notification category.        |
| `requestWhatsAppOtp(payload)` | Requests an OTP to verify a new WhatsApp phone number.                                                                           |
| `verifyWhatsAppOtp(payload)`  | Verifies the WhatsApp OTP and updates the user's linked WhatsApp phone number.                                                   |

### 7. Notifications (`notifications`)

The notifications module manages notifications available to the authenticated user. It supports retrieving paginated notifications, fetching individual notifications, and updating their read or dismissed status.

| Function            | Purpose                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(params?)`     | Retrieves a paginated list of notifications, with optional filtering by creation date, read status, dismissal status, notification type, status, or recipient. |
| `getById({ id })`   | Retrieves an individual notification using its ID.                                                                                                             |
| `edit(id, payload)` | Updates a notification's read or dismissed timestamp.                                                                                                          |

### 8. Push Subscriptions (`pushSubscriptions`)

The push subscriptions module manages browser-based Web Push registrations for the authenticated user. It supports registering browser push subscriptions, retrieving registered subscriptions, and removing existing subscriptions.

| Function          | Purpose                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `create(payload)` | Registers or updates a browser's Web Push subscription using its endpoint and subscription details. |
| `list()`          | Retrieves the authenticated user's registered browser push subscriptions.                           |
| `remove(id)`      | Removes a registered browser push subscription using its ID.                                        |

### 9. SmartPacks (`smartpacks`)

The SmartPacks module manages SmartPack devices and their associations with customers and groups. It supports device retrieval, claiming, assignment, updating, and grouping. It also provides access to paginated sensor measurements and utilities for calculating step differences between measurements.

| Function                           | Purpose                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(params?)`                    | Retrieves a paginated list of SmartPacks, with optional filtering by assigned customer, group, assignment status, or group association.                                                                 |
| `listWithCache(params?)`           | Fetches a paginated list of SmartPacks from the API and caches successful responses. Falls back to locally cached, filtered, and paginated SmartPacks when the native application cannot reach the API. |
| `listSensorMeasurementsWithCache(params)` | Fetches paginated sensor measurements for a SmartPack from the API and caches successful responses. Falls back to locally cached, filtered, and paginated sensor measurements when the native application cannot reach the API. Requires a SmartPack ID. |
| `getById({ id })`                  | Retrieves a SmartPack using its ID.                                                                                                                                                                     |
| `assign(id, payload)`              | Assigns a SmartPack to a customer.                                                                                                                                                                      |
| `unassign(id)`                     | Removes a SmartPack's customer assignment.                                                                                                                                                              |
| `edit(smartPack)`                  | Updates a SmartPack's child name.                                                                                                                                                                       |
| `claim(deviceUid, payload)`        | Allows an authenticated customer to claim an unassigned SmartPack by verifying its IMEI.                                                                                                                |
| `assignGroup(id, payload)`         | Assigns a SmartPack to a group.                                                                                                                                                                         |
| `unassignGroup(id)`                | Removes a SmartPack's group association.                                                                                                                                                                |
| `listSensorMeasurements(params?)`  | Retrieves paginated sensor measurements, with optional filtering by SmartPack and timestamp range.                                                                                                      |
| `getStepsDelta(current, previous)` | Calculates the non-negative difference in step counts between two sensor measurements.                                                                                                                  |

### 10. Two-Factor Authentication (`twoFactor`)

The two-factor authentication module manages the additional verification step during authentication. It supports requesting a one-time password (OTP) and verifying the submitted code to complete authentication.

| Function       | Purpose                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| `request()`    | Requests a two-factor authentication code and returns the API confirmation message.        |
| `verify(data)` | Verifies the submitted OTP and returns authentication tokens upon successful verification. |

### 11. Users (`users`)

The users module manages user accounts, profile information, authentication-related account operations, and user registration. It supports retrieving and updating the authenticated user's profile, managing passwords, creating and managing internal user accounts, and registering new customers.

| Function                    | Purpose                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `getMe()`                   | Retrieves the profile information of the currently authenticated user, including account details, status, and group memberships. |
| `initialPassword(payload)`  | Changes the user's initial password and resolves the initial-password requirement.                                               |
| `editMe(payload)`           | Updates the authenticated user's profile information, including an optional profile picture.                                     |
| `setPassword(payload)`      | Changes the authenticated user's password using their current and new passwords.                                                 |
| `add(payload)`              | Creates a new internal user account with the supplied details and role.                                                          |
| `list(params?)`             | Retrieves a paginated list of users, with optional filtering by account type, active status, or role.                            |
| `getById({ id })`           | Retrieves an individual user by their ID.                                                                                        |
| `edit(user, toggle?)`       | Updates an existing user's information or toggles their account between active and suspended states.                             |
| `registerCustomer(payload)` | Registers a new customer account.                                                                                                |
