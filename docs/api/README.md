# API

This section documents the API integration used by the SmartPack Customer Dashboard. It provides guidance on API configuration, client usage, authentication, and communication with the SmartPack backend.

## API Client

The Admin Dashboard uses Axios as its HTTP client. A dedicated Axios instance centralizes API communication and provides shared configuration such as the API base URL, JSON headers, request timeout, and credential support.

The API client is located at `src/api/client.ts` and is used as the foundation for service-specific API modules.

Further documentation will cover authentication, users, request/response handling, and other API services as they are implemented.

### Push Subscriptions API

The Push Subscriptions API manages browser Web Push subscriptions for the authenticated user.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `PUSH_SUBSCRIPTIONS.COLLECTION` | Registers or updates a browser push subscription. |
| `GET` | `PUSH_SUBSCRIPTIONS.COLLECTION` | Retrieves the user's paginated list of push subscriptions. |
| `DELETE` | `PUSH_SUBSCRIPTIONS.detail(id)` | Removes a registered push subscription by ID. |

The API module exports three functions: `create(payload)`, `list()`, and `remove(id)`. These use the shared `apiClient` and return the response data directly.

## Documentation

* [Authentication API](authentication.md) — provides a high-level overview of authentication and two-factor authentication endpoints and their respective flows.
* [API Interceptors](interceptors.md) — provides a high-level overview of request and response interception and authentication handling.
* [Users API](users.md) — provides a high-level overview of requests related to user information and account management.


