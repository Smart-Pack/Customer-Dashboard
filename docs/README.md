# SmartPack Admin Dashboard Documentation

Welcome to the SmartPack Admin Dashboard documentation hub.

## Components
### Base Components

Reusable components shared across multiple views are stored in `src/components/Base/`.

#### InputField

`InputField.vue` provides a reusable form input component with support for common field types, including text, password, phone, select, textarea, and file inputs.

The component integrates with the application's centralized form validation system and supports reusable field icons and input actions.

Unit tests are located alongside the component in `src/components/Base/__tests__/`.

### Data

Country data used by the phone and country-related input fields is stored in:

```text
src/data/countries.ts
```

### Icons

Reusable SVG icon components are stored in `src/components/Icons/` and can be shared across the application.


## Documentation

* [Development](./development/README.md) - covers branching, feature development, testing, documentation, quality gates, code review, CI, security, and the Definition of Done.
* [Getting Started](./getting_started/README.md) - provides guides for setting up and working with the SmartPack Admin Dashboard.
* [Technology Stack](./stack.md) - describes the technologies and development tools used to build and operate the SmartPack Admin Dashboard.
* [API](./api/README.md) - documents the API integration, client configuration, authentication, and communication with the SmartPack backend.
* [Stores](./stores/README.md) — Pinia stores and application state management.
* [Layouts](./layouts/README.md) — Application layouts and shared page structures.
* [Helpers](helpers/README.md) — Reusable application utilities and helper functionality.
* [Components](components/README.md) - Reusable Vue components are documented in.
* [Router](router/README.md) - Application routing and navigation logic are documented in.


