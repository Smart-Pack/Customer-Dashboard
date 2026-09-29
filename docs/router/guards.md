# Router Guard

Responsible for handling logic that runs during route navigation.

## Document Title Management

Sets and maintains the browser tab title during route navigation.

The title is determined in the following order:

1. The route's configured `meta.title`.
2. The route name, formatted as a readable title.
3. The default application title: `SmartPack Admin Dashboard`.

The application suffix `- SmartPack Admin` is appended to route-specific titles.

## Authentication

Controls access to routes based on the user's authentication state.

The guard uses the authentication store's `isFullyAuthenticated` getter to determine whether the user has completed authentication.

### Unauthenticated Users

When the user is not fully authenticated:

- Public routes are allowed.
- Protected routes (`meta.requiresAuth: true`) redirect to the login page.
- The requested route's `fullPath` is included as the `redirect` query parameter so the user can be returned to the original destination after authentication.

### Fully Authenticated Users

When the user is fully authenticated:

- Public routes redirect to the dashboard.
- Protected routes are allowed after the remaining authentication requirements have been satisfied.

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

Authenticated users who have not changed their initial password are required to complete the password change before accessing other protected routes.

Users who have not changed their password:

- Are redirected to `change-password` when accessing another protected route.
- Can access the `change-password` route itself.
- Receive the original requested route as the `redirect` query parameter.

Users who have already changed their password are redirected to the dashboard if they attempt to access `change-password`.

## Navigation Handling

The guard runs before every route navigation and evaluates:

1. The document title for the destination route.
2. Whether the user is fully authenticated.
3. Whether the destination requires authentication.
4. Whether the user has completed the initial password change.
5. Whether a redirect is required.

Redirects use named routes and preserve the original destination where appropriate through the `redirect` query parameter.

### Breadcrumbs

Breadcrumbs are managed by the router guard based on route metadata and stored in the UI store. The `ContentHeader` component consumes this state to display the current navigation hierarchy.

* Routes define breadcrumb labels through route metadata.
* The router guard builds and updates the breadcrumb trail during navigation.
* Duplicate breadcrumbs are removed.
* The UI store holds the current breadcrumb state.
* `ContentHeader` renders the breadcrumb trail and provides navigation for previous levels.
* Routes without breadcrumb metadata clear the breadcrumb state.

