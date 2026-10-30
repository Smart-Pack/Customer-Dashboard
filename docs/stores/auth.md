# Authentication Store

## Overview

The authentication store manages the application's client-side authentication state using Pinia.

It provides a centralized place for the dashboard to access authentication information and perform authentication-related state operations.

The store supports both web and native Android authentication. These platforms use different refresh token storage mechanisms to accommodate their authentication requirements.

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
- Persisting and managing refresh tokens securely on native platforms.

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

Refresh token persistence is handled separately by:

```text
src/services/secureTokenStorage.ts
```

This service provides a platform-aware interface for storing, retrieving, and removing refresh tokens.

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
3. On successful authentication, the store maintains the access token in application state.
4. The store securely persists the returned refresh token on native platforms.
5. The store fetches and maintains the currently logged-in user's information.
6. The store validates that the user's account type is allowed to access the dashboard.
7. The store requests a two-factor authentication token.
8. The user completes two-factor authentication.
9. The refresh token returned after successful two-factor verification is also persisted on native platforms.
10. Application features use the store to access the authenticated user's state.
11. The store can refresh the access token when required.
12. Rotated refresh tokens are persisted when a refresh request succeeds.
13. Authentication state is restored when the application starts.
14. Authentication state and stored refresh tokens are cleared when the session becomes invalid or the user logs out.

## Platform-Specific Refresh Token Management

The application supports web and native Android authentication through different refresh token persistence mechanisms.

This distinction is necessary because the Capacitor Android application runs using the `https://localhost` origin, while the backend API is hosted on a different domain.

### Web Authentication

On the web platform, authentication uses the existing HTTP cookie-based refresh token mechanism.

The browser manages the refresh token through HTTP cookies, and the application does not need to persist the refresh token manually.

When refreshing an access token without explicitly providing a refresh token, the authentication API sends the refresh request using the cookie-based mechanism.

### Native Android Authentication

The Capacitor Android application runs inside a WebView using the `https://localhost` origin.

Because the backend API is hosted on a different domain, the backend's refresh token cookie is not reliably available to the application's WebView through the normal cookie-based authentication flow.

To support native Android authentication independently of this cross-domain cookie behavior, the application explicitly persists the refresh token using secure native storage.

The implementation uses:

- **`capacitor-secure-storage-plugin`** — Provides secure storage for sensitive authentication data on native platforms.
- **`src/services/secureTokenStorage.ts`** — Encapsulates refresh token storage operations.
- **Pinia authentication store** — Coordinates refresh token retrieval, persistence, rotation, and removal.

The refresh token is stored securely rather than in browser local storage or session storage.

The platform-specific behavior is:

| Operation | Web | Native Android |
|---|---|---|
| Access token | Pinia state | Pinia state |
| Refresh token persistence | HTTP cookies | Capacitor secure storage |
| Refresh token retrieval | Browser cookie mechanism | Secure storage |
| Refresh request | Cookie-based request | Explicit refresh token in request body |
| Refresh token rotation | Managed through cookie-based authentication | Updated token persisted securely |
| Refresh token removal | Managed through cookie-based authentication | Removed from secure storage |

The secure storage service skips its operations on web platforms.

### Secure Refresh Token Storage

The secure storage service exposes three operations:

| Method | Description |
|---|---|
| `setRefreshToken(token)` | Stores the refresh token securely on a native platform. |
| `getRefreshToken()` | Retrieves the stored refresh token, returning `null` when unavailable or retrieval fails. |
| `removeRefreshToken()` | Removes the stored refresh token from native secure storage. |

Example:

```ts
import { secureTokenStorage } from '@/services/secureTokenStorage'

// Persist a refresh token.
await secureTokenStorage.setRefreshToken(refreshToken)

// Retrieve a stored refresh token.
const refreshToken = await secureTokenStorage.getRefreshToken()

// Remove the stored refresh token.
await secureTokenStorage.removeRefreshToken()
```

These operations are intended for native platforms. On web, the service skips secure storage operations.

## Authentication Initialization

The store provides an `initializeAuth()` action to restore authentication state when the application starts.

The initialization flow is:

1. The store attempts to retrieve the stored refresh token from secure storage.
2. If a refresh token is available, it is explicitly supplied to the refresh API.
3. If no stored refresh token is available, the refresh API uses the cookie-based authentication mechanism.
4. The refresh request sets `skipAuthRedirect` to `true`.
5. If the token refresh succeeds, the store updates the access token.
6. The newly returned refresh token is persisted securely on native platforms.
7. The store fetches the authenticated user's information.
8. If either operation fails, the initialization error is silently ignored.
9. The application continues loading without an authenticated session.

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

### Refresh Token Rotation

The backend may return a new refresh token after a successful refresh operation.

The authentication store persists the returned refresh token on native platforms, replacing the previously stored token.

This ensures that subsequent refresh requests use the latest refresh token rather than an outdated one.

The web platform continues to use its cookie-based refresh token mechanism.

## Login and Two-Factor Authentication

### Email and Password Login

When login succeeds:

1. The authentication API returns an access token and refresh token.
2. The store updates its access token state.
3. The refresh token is persisted using secure storage on native platforms.
4. The store fetches the authenticated user's information.
5. The store proceeds with the two-factor authentication flow.

If login fails, the store clears authentication state and attempts to remove any previously stored refresh token.

### Google Sign-In

Google authentication follows the same refresh token persistence approach.

After successful Google authentication, the store:

1. Updates the access token.
2. Persists the refresh token securely on native platforms.
3. Fetches the authenticated user's information.
4. Validates the user's account type.

If authentication fails, the store clears its authentication state and removes the stored refresh token.

### Two-Factor Authentication Verification

After successful OTP verification:

1. The two-factor authentication API returns an access token and refresh token.
2. The store updates its access token.
3. The returned refresh token is persisted securely on native platforms.
4. The user can continue with the authenticated application session.

If verification fails, the store clears authentication state and removes the stored refresh token.

## Logout

The authentication store exposes a `logOut()` action to centralize logout handling.

The action:

1. Attempts to perform server-side logout.
2. Removes the locally stored refresh token.
3. Clears the authentication store state.

Local logout is completed even if the server-side logout request or secure storage cleanup fails.

The `SideNav` and `TopBar` components delegate logout operations to this action and navigate the user to the login page afterward.

This avoids duplicating authentication cleanup logic across dashboard components.

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
- **Authentication actions:** `src/stores/modules/auth/actions.ts`
- **Authentication getters:** `src/stores/modules/auth/getters.ts`
- **Secure token storage:** `src/services/secureTokenStorage.ts`
- **API client:** `src/api/client.ts`
- **API interceptors:** `src/api/interceptors/`
- **Application entry point:** `src/main.ts`
