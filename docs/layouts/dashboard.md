# Dashboard Layout

## Overview

The dashboard layout provides the shared application shell for authenticated SmartPack Customer Dashboard pages.

It coordinates the:

- Top navigation bar.
- Responsive side navigation.
- Content header and breadcrumbs.
- Routed dashboard content.
- Content footer.
- Global notification backdrop.
- Application theme synchronization.

The layout is loaded by the `/dashboard` route and provides the common structure for dashboard child routes.

## Route Integration

The dashboard route uses the dashboard layout as its parent component:

```ts
{
  path: '/dashboard',
  component: () => import('@/layout/Dashboard/index.vue'),
  meta: {
    breadcrumb: 'Home',
    requiresAuth: true,
  },
  children: [
    {
      path: '',
      name: 'dashboard',
      component: () => import('@/views/Dashboard/index.vue'),
      meta: {
        breadcrumb: 'Home',
        title: 'Home',
      },
    },
  ],
}
```

The layout is therefore responsible for rendering the shared dashboard shell while the matched child route is rendered through `<router-view />`.

## Layout Structure

The layout is organized into three main areas:

```text
DashboardLayout
├── TopBar
├── Dashboard Content Area
│   ├── SideNav
│   └── Main Content
│       ├── ContentHeader
│       ├── RouterView
│       └── ContentFooter
└── Backdrops
    ├── Notification Backdrop
    └── Mobile Side Navigation Backdrop
```

### TopBar

`TopBar` provides the primary dashboard navigation and authenticated-user controls.

It is responsible for:

- SmartPack dashboard branding.
- Dashboard navigation.
- Mobile side-navigation toggle.
- Theme switching.
- Authenticated-user information.
- Profile navigation.
- Logout.

The component manages its own interaction behavior and uses the UI and authentication stores.

### SideNav

`SideNav` provides the dashboard's secondary navigation.

It is responsible for:

- Dashboard navigation items.
- Mobile navigation behavior.
- User information on mobile.
- Theme switching on mobile.
- Highlighting the active dashboard section.
- Manual mobile data synchronization.
- Managing automatic mobile synchronization.

#### Mobile Data Synchronization

On mobile devices, the side navigation provides a **Sync Now** button that allows users to manually synchronize locally cached data with the backend.

The button:

- Triggers synchronization of all registered synchronization modules.
- Displays a loading spinner while synchronization is in progress.
- Is disabled during an active manual synchronization.
- Displays a success notification when synchronization completes.
- Displays an error notification if synchronization fails.

Automatic synchronization is also managed by the side navigation on mobile devices.

It uses the synchronization scheduler with the following behavior:

| Trigger | Behavior |
| --- | --- |
| Dashboard navigation mounted | Starts the synchronization scheduler and performs an initial synchronization. |
| Every 30 minutes | Automatically synchronizes cached data. |
| Application returns to foreground | Triggers synchronization immediately. |
| Manual Sync Now action | Triggers synchronization immediately and provides user feedback. |

Automatic synchronization failures are logged without displaying notifications to the user. The scheduler continues running, allowing subsequent synchronization attempts.

The scheduler and application state listener are cleaned up when the side navigation component is unmounted.

These synchronization features are mobile-only and are not initialized on desktop devices.

### ContentHeader

`ContentHeader` displays information associated with the current dashboard route.

It provides:

- Breadcrumb navigation.
- Current date information.

Breadcrumb state is obtained from the UI store and is updated by the router guard.

### Router View

The dashboard layout renders child routes through:

```vue
<router-view />
```

This allows dashboard pages to share the same layout without duplicating the navigation, header, and footer.

For example:

```text
/dashboard
    └── DashboardLayout
          └── DashboardView
```

Additional dashboard features can be added as child routes while retaining the same dashboard shell.

### ContentFooter

`ContentFooter` provides the shared footer displayed below the dashboard content.

## UI Store Integration

The layout uses the Pinia UI store:

```ts
const uiStore = useUiStore()
```

The following state is consumed by the layout:

### `swalBackdrop`

Controls the global notification backdrop.

When enabled, the layout renders a full-screen backdrop:

```vue
<div
  v-if="uiStore.swalBackdrop"
  class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1040]"
  aria-hidden="true"
></div>
```

### `isSideNavOpen`

Controls the mobile side-navigation backdrop.

When the side navigation is open, the layout displays a backdrop over the page content:

```vue
<div
  v-if="uiStore.isSideNavOpen"
  class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40] lg:hidden"
  aria-hidden="true"
></div>
```

The backdrop is limited to mobile layouts using the `lg:hidden` utility.

### `isLightMode`

Controls the application's active theme.

The layout synchronizes this state with the root HTML element by adding or removing the `dark` class.

## Theme Synchronization

The layout uses a dedicated helper:

```ts
function syncTheme(isLightMode: boolean): void {
  document.documentElement.classList.toggle('dark', !isLightMode)
}
```

When light mode is active:

```text
<html>
```

When dark mode is active:

```text
<html class="dark">
```

The theme is synchronized in two situations:

1. When the dashboard layout is mounted.
2. When the UI store's `isLightMode` state changes.

```ts
watch(
  () => uiStore.isLightMode,
  (isLightMode) => {
    syncTheme(isLightMode)
  },
)
```

This keeps the document-level theme state synchronized with the Pinia UI store.

## Initialization

When the layout is mounted, it resets transient dashboard UI state:

```ts
onMounted(() => {
  uiStore.updateSwalBackdrop(false)
  uiStore.updateIsSideNavOpen(false)

  syncTheme(uiStore.isLightMode)
})
```

This ensures that:

- A notification backdrop does not remain active when entering the dashboard.
- The mobile side navigation starts closed.
- The document theme matches the current UI store state.

Mobile synchronization initialization is handled separately by `SideNav`.

## Responsive Behavior

The dashboard layout adapts between mobile and desktop screen sizes.

### Mobile

The layout:

- Uses the mobile TopBar.
- Allows the SideNav to open as an overlay.
- Displays a backdrop when the SideNav is open.
- Uses reduced header and content heights.
- Provides mobile-specific controls through the SideNav.
- Provides manual and automatic data synchronization.
- Synchronizes cached data every 30 minutes.
- Triggers synchronization when the application returns to the foreground.

### Desktop

The layout:

- Displays the TopBar across the page.
- Keeps the SideNav as part of the dashboard structure.
- Removes the mobile SideNav backdrop.
- Uses the larger desktop header and content dimensions.
- Does not initialize the mobile synchronization scheduler or manual synchronization controls.

The responsive behavior is implemented primarily through Tailwind CSS responsive utilities, with mobile-specific functionality determined by the platform utility.

## Component Responsibilities

The dashboard layout intentionally keeps component responsibilities separated:

| Component | Responsibility |
| --- | --- |
| `DashboardLayout` | Shared dashboard shell, routed content, backdrop and theme synchronization |
| `TopBar` | Primary navigation, account controls and desktop theme control |
| `SideNav` | Dashboard navigation, mobile navigation controls and mobile data synchronization |
| `ContentHeader` | Breadcrumbs and current date |
| `ContentFooter` | Dashboard footer |
| Dashboard view | Feature-specific page content |

The layout should coordinate these components rather than duplicate their internal behavior.

## Testing

Dashboard layout tests are located under:

```text
src/layout/Dashboard/__tests__/index.spec.ts
```

The tests cover:

- Rendering of dashboard layout components.
- Notification backdrop visibility.
- Mobile side-navigation backdrop visibility.
- Resetting notification and side-navigation state on mount.
- Initial light and dark theme synchronization.
- Theme synchronization when the UI store changes.

Side navigation tests are located under:

```text
src/layout/Dashboard/__tests__/SideNav.spec.ts
```

These tests cover:

- Navigation rendering and behavior.
- Mobile-only Sync Now button visibility.
- Manual synchronization success and failure handling.
- Synchronization loading state and duplicate-trigger prevention.
- Automatic scheduler initialization with a 30-minute interval.
- Synchronization when the application returns to the foreground.
- Automatic synchronization error handling.
- Scheduler and application listener cleanup on unmount.
- Ensuring desktop devices do not initialize mobile synchronization.

Run the layout tests with:

```bash
pnpm vitest --run src/layout/Dashboard/__tests__/index.spec.ts
```

Run the side navigation tests with:

```bash
pnpm vitest --run src/layout/Dashboard/__tests__/SideNav.spec.ts
```

## Related Components

The dashboard layout is composed of:

```text
src/layout/Dashboard/
├── index.vue
├── TopBar.vue
├── SideNav.vue
├── ContentHeader.vue
├── ContentFooter.vue
└── __tests__/
    ├── index.spec.ts
    └── SideNav.spec.ts
```

Component-specific behavior should be documented alongside the corresponding component when additional documentation is required.
