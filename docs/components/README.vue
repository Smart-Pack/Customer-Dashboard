# Components

The `src/components` directory contains reusable Vue components used throughout the SmartPack Admin Dashboard.

## Base Components

The `src/components/Base` directory contains reusable UI and form components.

| Component                    | Description                            |
| ---------------------------- | -------------------------------------- |
| [AuthCard](AuthCard.md) | Reusable authentication form card.     |
| [Table](Table.md) | Reusable and configurable table component for displaying collections of data. |
| [TablePageLayout](base/TablePageLayout.md) | Reusable layout component for tabbed, paginated tables with API data fetching and search support. |
| [CreationFormLayout](base/CreationFormLayout.md) | Reusable form layout for creating and updating resources with grouped fields, validation, API submission, and optional modal actions. |

## Adding Components

When adding a new reusable component:

* Keep the component focused on a specific responsibility.
* Prefer reusable props and slots over component-specific logic.
* Add unit tests for components containing reusable logic.
* Document components that are intended for use across the application.

## Testing

Component tests are located alongside the corresponding component test directory.

Run the full test suite with:

```bash
pnpm test
```

Run TypeScript checks with:

```bash
pnpm type-check
```

