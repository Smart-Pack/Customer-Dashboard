# Authentication Store

## Overview

The authentication store manages the application's client-side authentication state using Pinia.

It provides a centralized place for the dashboard to access authentication information and perform authentication-related state operations.

## Responsibilities

The authentication store is responsible for:

- Maintaining the current access token.
- Maintaining the currently logged-in user's information.
- Orchestrating the login flow.
- Orchestrating the two-factor authentication (OTP) verification flow.
- Clearing authentication state when the user logs out or authentication fails.
- Refreshing the access token when required.
- Restoring authentication state when the application starts.
- Providing authentication state to components and other application modules.
- Exposing the authenticated user's ID.
- Providing group role authorization checks to determine whether the authenticated user is a group owner or administrator.

## Structure

The authentication store is organized into separate modules:

```text
src/stores/modules/auth/
├── actions.ts
├── constants.ts
├── getters.ts
├── index.ts
└── state.ts
```

- **`state.ts`** — Defines the authentication state.
- **`constants.ts`** — Defines authentication-related constants, such as allowed account types.
- **`getters.ts`** — Provides access to derived or exposed state, including authentication status, user identification, and group authorization checks.
- **`actions.ts`** — Handles authentication-related state operations, including the login flow and authentication initialization.
- **`index.ts`** — Defines and exports the Pinia authentication store.

## Store Usage

The store is exposed through the `useAuthStore` composable and can be used by Vue components and other application logic that requires authentication state.

The store works together with the API authentication and users modules to communicate with the backend.

Example:

```ts
import { useAuthStore } from '@/stores/modules/auth'

const authStore = useAuthStore()

const currentUserId = authStore.userId
const isGroupAdmin = authStore.isGroupAdmin(groupId)
const isGroupOwner = authStore.isGroupOwner(groupId)
```

## Authentication Flow

At a high level:

1. The user submits their email and password.
2. The authentication store calls the authentication API to authenticate the user.
3. On successful authentication, the store maintains the access token.
4. The store fetches and maintains the currently logged-in user's information.
5. The store validates that the user's account type is allowed to access the dashboard.
6. The store requests a two-factor authentication token.
7. The user completes two-factor authentication.
8. Application features use the store to access the authenticated user's state.
9. The store can refresh the access token when required.
10. Authentication state is restored when the application starts.
11. Authentication state is cleared when the session becomes invalid or the user logs out.

## Authentication Initialization

The store provides an `initializeAuth()` action to restore authentication state when the application starts.

The initialization flow is:

1. The store attempts to refresh the access token using the existing refresh token.
2. The refresh request sets `skipAuthRedirect` to `true`.
3. If the token refresh succeeds, the store fetches the authenticated user's information.
4. If either operation fails, the initialization error is silently ignored.
5. The application continues loading without an authenticated session.

The action is called from `main.ts` before the application is mounted:

```ts
const authStore = useAuthStore(pinia)
await authStore.initializeAuth()

app.mount('#app')
```

This allows the application to restore an existing authenticated session before the application becomes available.

### Token Refresh Redirect Behavior

The `refreshToken()` action accepts an optional `skipAuthRedirect` parameter that controls the behavior when the refresh request fails.

- **`false`** — A failed refresh can trigger the authentication interceptor's redirect to the login page.
- **`true`** — A failed refresh does not trigger the redirect.

`initializeAuth()` uses `refreshToken(true)` because authentication restoration occurs during application startup. A failed restoration should not trigger an additional navigation; the application can instead continue as an unauthenticated session.

## Getters

The authentication store exposes getters that provide access to authentication state and group authorization information.

### `hasChangedPassword`

Indicates whether the authenticated user has changed their password after the initial login.

Returns `false` when no user is logged in.

### `isFullyAuthenticated`

Indicates whether the user has completed the authentication process.

The result depends on whether two-factor authentication is enabled:

- No logged-in user → `false`.
- 2FA disabled → `true` once the user information is available.
- 2FA enabled → `true` only when an access token is available and its `otp_verified` claim is `true`.
- 2FA enabled without an access token → `false`.

The OTP claim is evaluated by the `isOtpVerified` authentication utility.

### `userId`

Returns the ID of the currently logged-in user.

**Return type:** `number | undefined`

- Logged-in user → The user's numeric ID.
- No logged-in user → `undefined`.

This getter provides convenient access to the authenticated user's ID without requiring components to access `loggedInUser` directly.

Example:

```ts
const authStore = useAuthStore()

const currentUserId = authStore.userId
```

### `isGroupAdmin`

Determines whether the currently logged-in user is an owner or administrator of a specified group.

**Parameter:**

| Name | Type | Description |
|---|---|---|
| `groupId` | `string \| number` | The ID of the group to check. |

**Return type:** `boolean`

Returns:

- `true` — The user is an owner or administrator of the specified group.
- `false` — The user does not have either role in the specified group, or has no matching group membership.

Both string and numeric group IDs are supported. The supplied group ID is converted to a number before comparison.

The getter checks the user's group memberships and returns `true` when a matching group has either the `owner` or `admin` role.

This getter can be used to control access to group administration features, such as:

- Assigning SmartPacks to groups.
- Unassigning SmartPacks from groups.
- Managing group members.
- Displaying administrative controls for a particular group.

Example:

```ts
const authStore = useAuthStore()

const canManageGroup = authStore.isGroupAdmin(groupId)

if (canManageGroup) {
  // Display group administration controls.
}
```

### `isGroupOwner`

Determines whether the currently logged-in user is the owner of a specified group.

**Parameter:**

| Name | Type | Description |
|---|---|---|
| `groupId` | `string \| number` | The ID of the group to check. |

**Return type:** `boolean`

Returns:

- `true` — The user owns the specified group.
- `false` — The user does not own the specified group, or has no matching group membership.

Both string and numeric group IDs are supported. The supplied group ID is converted to a number before comparison.

Unlike `isGroupAdmin`, this getter returns `true` only when the matching group membership has the `owner` role. An administrator who is not the owner does not satisfy this check.

Use this getter when an operation must be restricted to the group owner rather than allowing both owners and administrators.

Example:

```ts
const authStore = useAuthStore()

const canManageGroupOwnership = authStore.isGroupOwner(groupId)

if (canManageGroupOwnership) {
  // Display actions restricted to the group owner.
}
```

### Group Authorization Behavior

The group authorization getters rely on the authenticated user's group membership information.

The expected group roles are:

| Role | `isGroupAdmin(groupId)` | `isGroupOwner(groupId)` |
|---|---|---|
| `owner` | `true` | `true` |
| `admin` | `true` | `false` |
| `member` | `false` | `false` |
| No matching group membership | `false` | `false` |

The checks apply to the specified group. Having an administrative role in one group does not automatically grant administrative access to another group.

These getters provide **client-side authorization checks** for controlling which interface actions are available to a user. They do not replace backend authorization. The backend must independently validate group permissions before performing protected operations.

## Related Modules

- **API authentication:** `src/api/modules/auth.ts`
- **API users:** `src/api/modules/users.ts`
- **Authentication store:** `src/stores/modules/auth/`
- **Authentication getters:** `src/stores/modules/auth/getters.ts`
- **API client:** `src/api/client.ts`
- **API interceptors:** `src/api/interceptors/`
- **Application entry point:** `src/main.ts`
```
