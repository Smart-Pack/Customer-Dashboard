# Development Usage

This guide covers the common commands used when developing the SmartPack Customer Dashboard.

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

## Mobile Development (Android)

The SmartPack Customer Dashboard uses Capacitor to package the Vue application as a native Android app. The Android app uses the `.env.mobile` environment file for its configuration.

### Configure Mobile Environment

Create a `.env.mobile` file in the project root:

```env
VITE_API_BASE_URL=https://api-test.smartpack.razaoul.co.ke/api/
```

Replace the API URL with the appropriate backend endpoint if necessary.

The `android:build` script uses Vite's `--mode mobile` option to load `.env.mobile` when building the application.

### Install Dependencies

After cloning the repository, install the project dependencies:

```bash
pnpm install
```

Ensure that the following tools are installed and configured:

- **Java Development Kit (JDK):** Required by Gradle.
- **Android SDK:** Required to build and run the Android app.
- **Android Debug Bridge (ADB):** Used to detect connected Android devices and install the app.
- **USB debugging:** Enable this in the Android device's Developer Options.

The Android project includes the Gradle Wrapper (`android/gradlew`), so a separate global Gradle installation is not required.

### Connect an Android Device

Connect your Android phone to your computer using a USB cable, enable USB debugging, and authorize the computer when prompted on your phone.

Check whether ADB detects the device:

```bash
adb devices
```

A connected and authorized device should appear with the status `device`:

```text
List of devices attached
XXXXXXXX    device
```

If the status is `unauthorized`, unlock your phone and accept the USB debugging authorization prompt. If no device appears, check the USB cable, USB connection mode, and ADB configuration.

### Build and Install the Android App

Build the application using `.env.mobile`, synchronize the web assets and Capacitor plugins, and install the debug APK:

```bash
pnpm android:install
```

This script runs the following steps:

1. Builds the Vue application using `vite build --mode mobile`.
2. Synchronizes the Android project using Capacitor.
3. Builds and installs the debug APK using Gradle.

Alternatively, build the Android app without installing it:

```bash
pnpm android:build
```

Install the already-built debug APK on a connected device:

```bash
pnpm android:install:debug
```

### Assemble the Android APK

Build the Android application using `.env.mobile`, synchronize the web assets and Capacitor plugins, and generate the debug APK without installing it:

```bash
pnpm android:assemble
```

This script runs the following steps:

1. Synchronizes the Android project using Capacitor.
2. Builds the debug APK using Gradle.
3. Copies the generated APK to `build/app-debug.apk`.

The APK can then be transferred to an Android device or installed manually.


### Available Android Commands

| Command | Description |
|---|---|
| `adb devices` | Lists Android devices detected by ADB. |
| `pnpm android:build` | Builds the mobile web assets using `.env.mobile` and synchronizes Capacitor. |
| `pnpm android:install` | Builds the mobile assets, synchronizes Capacitor, and builds and installs the debug APK. |
| `pnpm android:install:debug` | Installs the existing debug APK on a connected Android device. |
| `pnpm android:assets` | Generates Android launcher icon assets from the SmartPack SVG logo and synchronizes the assets with the native Android project. |
| `pnpm android:assemble` | Synchronizes Capacitor with Android, builds the debug APK, and copies the generated APK into the `build/` directory. |

**Note:** The `android:build` script only synchronizes Capacitor; it does not build the APK itself. The `android:install` script invokes Gradle through `./gradlew installDebug`, which builds and installs the debug APK. Ensure the Android SDK is configured correctly before running these commands.
