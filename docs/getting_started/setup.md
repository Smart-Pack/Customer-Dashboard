# Development Setup

This guide explains how to set up the SmartPack Customer Dashboard for local development.

## Prerequisites

Ensure the following are installed:

- Git
- Node.js
- `pnpm`

## 1. Clone the Repository

```bash
git clone <repository-url>
cd Customer-Dashboard
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

## 4. Set Up Mobile Development (Android)

To prepare your environment for Android development, run the provided setup script:

```bash
chmod +x setup.sh
./setup.sh
```

The script installs essential Android development prerequisites, including:

- Android Debug Bridge (`adb`)
- Java Development Kit (JDK)
- Supporting command-line utilities

When run from the project root, it also installs project dependencies, ensures the Gradle Wrapper is executable, and synchronizes the Capacitor Android project when `pnpm` is available.

### Android SDK Requirements

Install Android Studio and use its SDK Manager to ensure the following components are installed:

- Android SDK Platform
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools

Ensure the Android SDK environment variables are configured correctly.

For USB device testing, enable **Developer Options** and **USB debugging** on your Android phone, connect it to your computer, and authorize the computer when prompted.

Verify the connection with:

```bash
adb devices
```

For instructions on configuring the mobile environment, building the Android application, and installing it on a connected device, see [`usage.md`](usage.md).

## 5. Verify the Setup

Start the development server:

```bash
pnpm dev
```

The application should be available at the local development URL displayed by Vite.

## Environment Configuration

The dashboard supports the following environments:

- `development` — local development
- `mobile` — Android builds using `.env.mobile`
- `preview` — testing and validation
- `production` — production deployment

Environment-specific variables should be configured through the appropriate local or deployment environment.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) with the [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension is recommended.

Vetur should be disabled when using Vue (Official).
