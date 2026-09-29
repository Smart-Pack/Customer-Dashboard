# Development Usage

This guide covers the common commands used when developing the SmartPack Admin Dashboard.

## Start Development Server

Start the Vite development server:

```bash
pnpm dev
```

## Run Type Checking

Run TypeScript type checking:

```bash
pnpm build
```

The build process performs type checking, compilation, and production bundling according to the project's configuration.

## Run Unit Tests

Run the Vitest unit tests:

```bash
pnpm test:unit
```

## Run Linting

Run ESLint:

```bash
pnpm lint
```

## Format Code

Format the project using the configured formatter:

```bash
pnpm format
```

## Build for Production

Create a production build:

```bash
pnpm build
```

The generated production files are placed in the configured `dist` directory.
