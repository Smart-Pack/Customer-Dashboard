# API Interceptors

## Overview

API interceptors provide centralized request and response handling for the application's Axios API client.

They are responsible for:

- Attaching the access token to API requests.
- Handling successful responses.
- Normalizing API and network error messages.
- Detecting unauthorized (`401`) responses.
- Refreshing authentication when required.
- Retrying failed requests when appropriate.
- Redirecting to the login page when the refresh session has expired.
- Preventing repeated authentication retries.

## Structure

```text
src/api/interceptors/
├── index.ts
├── handle401.ts
├── retryRequest.ts
└── __tests__/
```

- **`index.ts`** — Configures the Axios request and response interceptors, including error message normalization and handling unauthorized responses.
- **`handle401.ts`** — Handles unauthorized responses and determines whether a request should be retried or the session should be considered expired.
- **`retryRequest.ts`** — Refreshes the access token and retries the original request.
- **`__tests__/`** — Contains unit tests for the interceptor functionality.

## Authentication Flow

When an API request is made, the request interceptor adds the available access token to the `Authorization` header.

If a request returns `401 Unauthorized`, the response interceptor delegates the error to the `401` handler.

The `401` handler:

- Rejects requests to the login endpoint without attempting a token refresh.
- Rejects requests to the token verification endpoint without attempting a token refresh.
- Attempts to refresh the access token for two-factor authentication endpoints and protected requests.
- Retries the original request after a successful token refresh.
- Prevents a request that has already been retried from being retried again.

If the token refresh request itself fails, the session is considered expired. The user is redirected to the login page and receives a session-expired error.

## Error Handling

API errors containing a `detail` field use that value as the Axios error message.

When no response is received from the server, a default network error message is used:

```text
Unable to reach the server. Please check your network connection.
```

## Related Modules

- **API client:** `src/api/client.ts`
- **Authentication store:** `src/stores/modules/auth/`
- **Authentication API:** `src/api/modules/auth.ts`
- **API endpoints:** `src/api/endpoints.ts`
