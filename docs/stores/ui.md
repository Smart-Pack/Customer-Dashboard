# UI Store

## Overview

The UI store manages global user-interface state shared across the SmartPack Admin Dashboard.

It provides a centralized way for components and layouts to access and update common UI state using Pinia.

## Responsibilities

The UI store is responsible for:

* Managing SweetAlert2 backdrop visibility.
* Managing dashboard side navigation state.
* Managing the application's theme state and preference.
* Managing dashboard breadcrumbs.
* Providing getters for accessing UI state.
* Providing actions for updating UI state.

## State

The store maintains state for:

* SweetAlert2 backdrop visibility.
* Side navigation visibility.
* Theme preference and active theme mode.
* Current dashboard breadcrumbs.

## Getters

The store provides getters for accessing UI state, including:

* SweetAlert2 backdrop state.
* Side navigation state.
* Theme preference and active theme mode.
* Current breadcrumbs.
* Breadcrumb existence checks.

## Actions

The store provides actions for updating:

* SweetAlert2 backdrop visibility.
* Side navigation visibility.
* Theme preference and active theme mode.
* Dashboard breadcrumbs.

## Usage

Components should access shared UI state through the Pinia store rather than maintaining duplicate global UI state locally.

```ts
import { useUiStore } from '@/stores'

const uiStore = useUiStore()
```

## Testing

The UI store has unit tests covering its default state, getters, actions, theme behavior, side navigation, and breadcrumb management.

Tests are located under:

```text
src/stores/modules/ui/__tests__/
```

Run the store tests with:

```bash
pnpm vitest run src/stores/modules/ui/__tests__/index.spec.ts
```

