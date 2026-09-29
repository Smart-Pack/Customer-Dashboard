# Development Setup

This guide explains how to set up the SmartPack Admin Dashboard for local development.

## Prerequisites

Ensure the following are installed:

* Git
* Node.js
* `pnpm`

## 1. Clone the Repository

```bash
git clone <repository-url>
cd Admin-Dashboard
```

## 2. Install Dependencies

Install the project dependencies using `pnpm`:

```bash
pnpm install
```

## 3. Configure Environment Variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your local configuration.

For example:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Do not commit `.env.local` to version control.

Only environment variables intended for client-side use should use the `VITE_` prefix. Never store secrets in frontend environment variables.

## 4. Verify the Setup

Start the development server:

```bash
pnpm dev
```

The application should be available at the local development URL displayed by Vite.

## Environment Configuration

The Admin Dashboard uses the following environments:

* `development` — local development
* `preview` — testing and validation through Vercel Preview deployments
* `production` — production deployment

Environment-specific variables should be configured through the appropriate local or deployment environment.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) with the [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension is recommended.

Vetur should be disabled when using Vue (Official).

