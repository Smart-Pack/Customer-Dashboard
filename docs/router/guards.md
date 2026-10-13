# Router Guard

Responsible for handling logic that runs during route navigation, including document title management, authentication, initial password changes, redirect handling, and breadcrumb management.

## Document Title Management

Sets and maintains the browser tab title during route navigation.

The title is determined in the following order:

1. The route's configured `meta.title`.
2. The route name, formatted as a readable title.
3. The default application title: `SmartPack Customer Dashboard`.

The application suffix `- SmartPack Customer` is appended to route-specific titles.

## Authentication

Controls access to routes based on the user's authentication state.

The guard uses the authentication store's `isFullyAuthenticated` getter to determine whether the user has completed the required authentication steps.

### Unauthenticated Users

When the user is not fully authenticated:

- Public routes are allowed.
- Protected routes (`meta.requiresAuth: true`) redirect to the login page.
- The intended destination is preserved in the `redirect` query parameter.
- Nested redirect parameters are normalized to prevent redirect destinations from accumulating multiple levels of `redirect` queries.

The intended destination is preserved throughout the authentication flow so users can return to the originally requested route after completing authentication.

### Fully Authenticated Users

When the user is fully authenticated:

- Public routes redirect to the dashboard.
- Protected routes are allowed after the remaining authentication requirements have been satisfied.
- A valid intended destination is used when redirecting after authentication requirements are complete.
- Redirect destinations retain their path, query parameters, and hash.

## Authorization

Authorization determines whether an authenticated user has permission to access a resource or perform an action.

Authorization rules are not currently implemented in the router guard. They can be added later based on the authenticated user's account type, role, or other permissions.

## Route Access Control

Protected routes are identified using the `requiresAuth` route metadata property.

```ts
meta: {
  requiresAuth: true,
}
```

Routes without `requiresAuth` are considered public by the router guard.

### Initial Password Change

Authenticated users who have not changed their initial password must complete the password change before accessing other protected routes.

Users who have not changed their password:

- Are redirected to `change-password` when accessing another protected route.
- Can access the `change-password` route itself.
- Have their intended destination preserved in the `redirect` query parameter.

Users who have already changed their password are redirected to the dashboard if they attempt to access `change-password`.

### Redirect Handling

The router guard preserves the intended destination across authentication-related navigation, including login, two-factor authentication, and the initial password change.

Redirect handling follows these rules:

- The original destination is carried through the `redirect` query parameter.
- Nested redirect parameters are normalized to avoid unnecessary redirect nesting.
- Redirect destinations are resolved using Vue Router.
- Redirects are followed only when the destination matches a registered route and differs from the current route.
- The destination's path, query parameters, and hash are preserved when navigating to it.
- If no valid redirect destination is available, normal navigation proceeds according to the guard's authentication rules.

This allows users to navigate directly to protected pages, complete the required authentication steps, and return to their intended destination.

## Navigation Handling

The guard runs before every route navigation and evaluates:

1. Breadcrumb state for the destination route.
2. The document title.
3. Whether the user is fully authenticated.
4. Whether the destination requires authentication.
5. Whether the user has completed the initial password change.
6. Whether the intended destination should be used for redirection.

Redirects use named routes where appropriate and preserve the original destination through the `redirect` query parameter.

## Breadcrumbs

Breadcrumbs are managed by the router guard based on route metadata and stored in the UI store. The `ContentHeader` component consumes this state to display the current navigation hierarchy.

- **Route metadata:** Defines breadcrumb labels for individual routes.
- **Breadcrumb generation:** The router guard builds and updates the breadcrumb trail during navigation.
- **Duplicate prevention:** Duplicate breadcrumbs are removed from the generated trail.
- **UI store:** Holds the current breadcrumb state.
- **ContentHeader:** Renders the breadcrumb trail and provides navigation to previous levels.
- **Routes without breadcrumb metadata:** Clear the breadcrumb state.

This keeps breadcrumb navigation synchronized with the current route and its configured metadata.
