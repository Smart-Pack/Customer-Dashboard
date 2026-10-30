
etup

This guide explains how to set up the SmartPack Customer Dashboard for local development, including Android development using Capacitor.

## Prerequisites

Ensure the following are installed:

- Git
- Node.js
- `pnpm`

For Android development, you also need a Java Development Kit (JDK) and Android SDK.

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

## 4. Set Up Android Development

The repository provides setup scripts to help prepare the Android development environment.

Run the scripts from the project root in the order described below.

### 4.1 Install Android Development Prerequisites

Make the main setup script executable and run it:

```bash
chmod +x setup.sh
./setup.sh
```

This script installs essential Android development prerequisites, including Android Debug Bridge (`adb`), the Java Development Kit (JDK), and supporting command-line utilities. It also prepares project dependencies and synchronizes the Capacitor Android project when supported by the script.

### 4.2 Configure the Android SDK

Run the Android SDK setup script:

```bash
chmod +x setup-android-sdk.sh
./setup-android-sdk.sh
```

Ensure the Android SDK is installed and that the `ANDROID_HOME` environment variable points to its location.

For a standard desktop Linux environment, Android Studio and its SDK Manager can be used to install the required components:

- Android SDK Platform
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools

Verify your environment variables:

```bash
echo "$ANDROID_HOME"
echo "$ANDROID_SDK_ROOT"
```

Both variables should point to the intended SDK directory if both are configured.

### 4.3 Configure AAPT2 for ARM64 Linux (UserLAnd)

When running Ubuntu on an ARM64 Android device through UserLAnd, the Android Gradle Plugin may attempt to execute an x86-64 AAPT2 binary. This binary cannot run natively in an ARM64 Linux environment and can cause Gradle builds to fail with an AAPT2 daemon startup error.

The repository provides an ARM64 AAPT2 setup script for this environment.

Run:

```bash
chmod +x setup-android-aapt2-arm64.sh
./setup-android-aapt2-arm64.sh
```

The script checks the system architecture, verifies the AAPT2 executable, and configures Gradle to use the ARM64 binary.

The binary is stored at:

```text
~/tools/aapt2
```

The Gradle override is stored in:

```text
~/.gradle/gradle.properties
```

The configuration property is:

```properties
android.aapt2FromMavenOverride=/path/to/your/home/tools/aapt2
```

The actual path should use your home directory. The setup script configures the path automatically.

This workaround is intended for ARM64 Linux environments such as UserLAnd. It is generally unnecessary on supported x86-64 desktop Linux systems.

The custom AAPT2 binary and Gradle user configuration are local environment files and should not be committed to the repository.

### 4.4 Synchronize the Capacitor Android Project

After installing dependencies and configuring the SDK, synchronize the native Android project:

```bash
pnpm exec cap sync android
```

This synchronizes the web application assets and Capacitor plugins with the Android project.

### 4.5 Build the Android Application

Build the debug APK:

```bash
cd android
./gradlew assembleDebug
```

If the build succeeds, the APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Because the command runs from inside the `android` directory, the relative output path is:

```text
app/build/outputs/apk/debug/app-debug.apk
```

To verify that the APK exists, return to the project root and run:

```bash
cd ..
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
```

### 4.6 Install and Test on an Android Device

For a connected and authorized Android device, verify the ADB connection:

```bash
adb devices
```

Install or update the application from the project root:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

If ADB cannot access the Android device from your Linux environment, transfer the generated APK to the phone and install it through Android's file manager. Android may require permission to install applications from that source.

For additional mobile development instructions, see [`usage.md`](usage.md).

## 5. Verify the Setup

Start the development server:

```bash
pnpm dev
```

Open the local development URL displayed by Vite.

Run the available tests and checks defined in `package.json`. For example, if the corresponding scripts exist:

```bash
pnpm test
pnpm type-check
pnpm lint
```

Check `package.json` for the exact script names supported by the project.

## Environment Configuration

The dashboard supports the following environments:

- `development` — local development
- `mobile` — Android builds using `.env.mobile`
- `preview` — testing and validation
- `production` — production deployment

Environment-specific variables should be configured through the appropriate local or deployment environment.

Never commit environment files containing secrets or private credentials.

## Recommended IDE Setup

[Visual Studio Code](https://code.visualstudio.com/) with the [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension is recommended.

Vetur should be disabled when using Vue (Official).
