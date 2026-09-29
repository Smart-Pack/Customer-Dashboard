Here is a high-level `docs/layouts/auth.md` matching the style of your store documentation:

# Authentication Layout

## Overview

The authentication layout provides the shared structure for authentication-related pages in the SmartPack Admin Dashboard.

It provides a consistent layout for pages such as login, two-factor authentication, password recovery, and password reset.

## Responsibilities

The authentication layout is responsible for:

* Providing the shared authentication page structure.
* Rendering authentication pages through the router view.
* Displaying SmartPack branding and the authentication background.
* Managing the authentication layout height for pages that require additional space.
* Synchronizing the application theme with the current UI store state.
* Managing the global SweetAlert2 backdrop state.
* Displaying the application copyright footer.

## Structure

The layout is divided into three main areas:

### Branding Panel

The branding panel displays:

* SmartPack logo.
* SmartPack branding text.
* Authentication background artwork.

The panel is positioned alongside the authentication content on larger screens.

### Authentication Content

Authentication pages are rendered through the Vue Router:

```vue
<router-view @change-size="handleChangeSize"></router-view>
```

Individual authentication views are responsible for their own page-specific content.

### Footer

The layout displays the current year and SmartPack copyright information.

## Theme

The layout integrates with the UI store to synchronize the application's theme.

When light mode is active, the `dark` class is removed from the document root. When dark mode is active, the `dark` class is added.

This allows Tailwind's dark-mode utilities to respond to the global theme state.

## Layout Sizing

Authentication pages can request additional vertical space by emitting the `change-size` event.

```text
Authentication View
        │
        │ change-size
        ▼
   AuthLayout
        │
        ▼
   screenSize
```

When `screenSize` is enabled, the layout allows additional height and vertical scrolling for pages that require it.

## SweetAlert2 Backdrop

The layout observes the global SweetAlert2 backdrop state from the UI store.

When enabled, a backdrop is rendered above the authentication layout to prevent interaction with the underlying page while an alert is active.

## Related Components

The authentication layout works together with:

* **UI Store** — provides theme and SweetAlert2 backdrop state.
* **Authentication Views** — provide individual authentication pages.
* **Vue Router** — renders authentication views inside the layout.
* **SmartPack Branding Components** — provide the logo and visual identity.

