# Android Build

This document describes the GitHub Actions workflow used to build the SmartPack Customer Dashboard Android application for testing.

## Workflow Overview

The Android APK build is handled by:

`.github/workflows/android-build.yml`

The workflow generates a debug APK using the mobile Vite build configuration and Android Gradle build tools.

### Build Configuration

| Configuration | Value |
|---|---|
| Workflow name | Android APK Build |
| Trigger | Manual (`workflow_dispatch`) |
| Source branch | `testing` |
| GitHub environment | `Preview` |
| Node.js | `24.18.0` |
| pnpm | `12.3.4` |
| Java | 21 |
| Android platform | API 36 |
| Android Build Tools | 36.0.0 |
| Build variant | Debug |

## Environment Variables

The workflow retrieves the following variables from the GitHub `Preview` environment:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_WEBPUSH_VAPID_PUBLIC_KEY` | Public Web Push VAPID key |

Configure these under:

**GitHub Repository → Settings → Environments → Preview → Environment variables**

These values are injected during the Vite mobile build.

## Running the Workflow

The workflow is manually triggered and only builds when dispatched from the `testing` branch.

To generate a testing APK:

1. Open the repository on GitHub.
2. Navigate to **Actions**.
3. Select **Android APK Build**.
4. Click **Run workflow**.
5. Select the `testing` branch.
6. Click **Run workflow** to start the build.

The build job is skipped if another branch is selected.

## Build Process

The workflow performs the following steps:

1. Checks out the repository.
2. Sets up pnpm and Node.js.
3. Sets up Java 21.
4. Configures the Android SDK.
5. Installs the required Android SDK components.
6. Accepts Android SDK licenses.
7. Installs project dependencies using `pnpm install --frozen-lockfile`.
8. Builds the mobile application using `pnpm android:build`.
9. Assembles the Android debug APK using Gradle.
10. Uploads the generated APK as a GitHub Actions artifact.

## Build Artifact

The generated APK is located at:

`android/app/build/outputs/apk/debug/app-debug.apk`

The workflow copies it to:

`build/app-debug.apk`

It is then uploaded as an artifact with the name:

`smartpack-android-debug`

### Downloading the APK

1. Open the completed GitHub Actions workflow run.
2. Navigate to the **Artifacts** section.
3. Download `smartpack-android-debug`.
4. Extract the downloaded archive to access `app-debug.apk`.

Artifacts are retained for **14 days**.

## Important Notes

- This workflow is intended exclusively for testing builds.
- It uses the GitHub `Preview` environment configuration.
- It generates a debug APK, not a signed release APK.
- The workflow does not publish the APK to the Google Play Store or create a GitHub Release.
- Android-specific local setup scripts are not required on GitHub-hosted Ubuntu runners.
