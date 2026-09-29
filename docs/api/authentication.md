# Authentication API

This document provides a high-level overview of the authentication APIs used by the SmartPack Admin Dashboard.

## Authentication

The authentication API provides the endpoints required to establish, validate, maintain, and terminate an authenticated session.

The main authentication operations are:

* **Login** — Authenticates a user using their credentials.
* **Verify** — Validates an authentication token.
* **Refresh** — Refreshes the authentication session using the refresh token stored in the authentication cookie.
* **Logout** — Terminates the current authentication session.

The frontend communicates with these endpoints through the centralized API client and authentication API module.

## Two-Factor Authentication

Two-factor authentication provides an additional verification step for users whose account requires 2FA.

The 2FA flow is separate from the initial authentication request and **requires the user to be logged in first**.

The main operations are:

* **Request 2FA** — Requests a one-time password (OTP) for the authenticated user.
* **Verify 2FA** — Validates the submitted OTP and completes the 2FA authentication process.

### 2FA Flow

```text
User logs in
     ↓
Authenticated
     ↓
Request 2FA code
     ↓
Receive OTP
     ↓
Submit OTP
     ↓
Verify OTP
```

The API module for these operations is located at:

```text
src/api/modules/
├── auth.ts
└── twoFactor.ts
```

Authentication and 2FA API functions should be accessed through these modules rather than making direct HTTP requests from Vue components.

## Testing

Authentication and two-factor authentication API modules are covered by Vitest unit tests.

The tests verify that the API modules:

* Use the correct endpoints.
* Send the expected request data.
* Correctly handle API responses.

Run the authentication and two-factor authentication tests with:

```bash
pnpm test:unit --run src/api/__tests__/auth.spec.ts src/api/__tests__/twoFactor.spec.ts
```

The tests are located in `src/api/__tests__/`.

