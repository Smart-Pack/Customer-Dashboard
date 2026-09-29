# Helpers

The `src/helpers` directory contains reusable application utilities that support common functionality across the SmartPack Admin Dashboard.

## Available Helpers

| Helper | Description |
| --- | --- |
| [Validation](validation.md) | Centralized form validation rules and VeeValidate configuration. |
| [SweetAlert2 Notifications](swalNotifier.md) | Centralized success, error, and confirmation notifications. |
| Filters | Global formatting helpers for use in Vue components. |

## Adding Helpers

Helpers should contain reusable functionality that is shared across multiple parts of the application.

When adding a new helper:

* Keep the implementation focused on a specific responsibility.
* Avoid placing component-specific logic in helpers.
* Add unit tests for logic that can be tested independently.
* Document helpers that are intended for use across the application.

## Testing

Helper tests are located alongside the corresponding helper test directory.

Run the test suite with:

```bash
pnpm test
```

Run TypeScript checks with:

```bash
pnpm type-check
```

