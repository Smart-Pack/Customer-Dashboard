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
| Source branch | Selected branch when dispatching |
| GitHub environment | `Preview` |
| Node.js | `24.18.0` |
| pnpm | `12.3.4` |
| Java | 21 |
| Android platform | API 36 |
| Android Build Tools | 36.0.0 |
| Build variant | Debug |

## Environment Configuration

The workflow retrieves the following variables from the GitHub `Preview` environment:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_WEBPUSH_VAPID_PUBLIC_KEY` | Public Web Push VAPID key |

Configure these under:

**GitHub Repository → Settings → Environments → Preview → Environment variables**

These values are injected during the Vite mobile build.

## Android Debug Keystore

GitHub-hosted runners use fresh environments, so their default Android debug keystores are not persistent between workflow runs.

To maintain a consistent debug signing identity, the workflow restores a previously generated debug keystore from a GitHub environment secret.

### GitHub Secret

Configure the following secret under:

**GitHub Repository → Settings → Environments → Preview → Environment secrets**

| Secret | Description |
|---|---|
| `ANDROID_DEBUG_KEYSTORE_BASE64` | Base64-encoded Android debug keystore |

### Generating the Base64 Value

On your development machine, encode the existing debug keystore:

```bash
base64 -w 0 ~/.android/debug.keystore
```

Copy the generated output into the `ANDROID_DEBUG_KEYSTORE_BASE64` GitHub environment secret.

The keystore must use the standard Android debug credentials:

| Configuration | Value |
|---|---|
| Keystore filename | `debug.keystore` |
| Alias | `androiddebugkey` |
| Store password | `android` |
| Key password | `android` |

**Important:** Never commit the keystore or its Base64-encoded contents to the repository. Keep them in GitHub Secrets.

### Restoring the Keystore

Before assembling the APK, the workflow:

1. Checks that `ANDROID_DEBUG_KEYSTORE_BASE64` is configured.
2. Creates the `~/.android` directory.
3. Decodes the secret into `~/.android/debug.keystore`.
4. Restricts file permissions to the current runner user.

Gradle automatically uses this keystore for the default debug signing configuration.

### Verifying the Signing Certificate

The workflow performs two verification steps.

**1. Verify the restored keystore**

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

**2. Verify the generated APK**

```bash
apksigner verify --print-certs build/app-debug.apk
```

The second command displays the APK signing certificate fingerprints, including SHA-1 and SHA-256.

You can compare the SHA-1 fingerprint against your local debug APK to confirm that both builds use the same signing identity.

## Running the Workflow

The workflow is manually triggered using `workflow_dispatch`.

To generate a testing APK:

1. Open the repository on GitHub.
2. Navigate to **Actions**.
3. Select **Android APK Build**.
4. Click **Run workflow**.
5. Select the desired branch.
6. Click **Run workflow** to start the build.

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
9. Restores the Android debug keystore from GitHub Secrets.
10. Verifies the restored debug signing certificate.
11. Assembles the Android debug APK using Gradle.
12. Verifies the generated APK signing certificate.
13. Uploads the generated APK as a GitHub Actions artifact.

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

- This workflow is intended for testing builds.
- It uses the GitHub `Preview` environment configuration.
- It restores a persistent debug keystore to maintain a consistent signing identity across CI runs.
- It generates a debug APK, not a production release APK.
- The workflow does not publish the APK to the Google Play Store or create a GitHub Release.
- Android-specific local setup scripts are not required on GitHub-hosted Ubuntu runners.
- The debug keystore should be treated as sensitive because anyone possessing it and its credentials can sign APKs with the same debug identity.
