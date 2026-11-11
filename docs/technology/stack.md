# Technology Stack

This document describes the technologies and tools used to develop and operate the SmartPack Customer Dashboard.

## Frontend

| Technology           | Purpose                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Axios                | HTTP client for API communication                                                                                                     |
| jwt-decode           | — Decodes JSON Web Tokens (JWTs) to access their payload claims                                                                       |
| Vue                  | Frontend framework                                                                                                                    |
| TypeScript           | Type-safe programming language                                                                                                        |
| Vite                 | Frontend build tool and development server                                                                                            |
| Pinia                | State management                                                                                                                      |
| Tailwind CSS         | Utility-first CSS framework                                                                                                           |
| @tailwindcss/vite    | Tailwind CSS integration for Vite                                                                                                     |
| SweetAlert2          | — Alert, toast, and confirmation notifications                                                                                        |
| Vue Router           | Client-side routing                                                                                                                   |
| VeeValidate          | — Form validation and field state management                                                                                          |
| Vue3 ApexCharts      | — Vue 3 charting library for interactive data visualization and sensor measurement charts                                             |
| @vee-validate/rules  | — Built-in validation rules for VeeValidate                                                                                           |
| mqtt                 | MQTT client for JavaScript, enabling real-time messaging between your Vue frontend and an MQTT broker over WebSockets.                |
| Vue Tel Input        | — International telephone number input with country selection and formatting                                                          |
| QRCode Vue 3         | `qrcode-vue3`                                                                                                                         | Vue 3 QR code generation component for displaying device/user QR codes |
| `vue3-google-signin` | Vue 3 Google Sign-In integration using Google Identity Services ([Guide](https://vue3-google-signin.wavezync.com/guide/))             |
| `vue-qrcode-reader`  | Vue 3 QR code reader with camera scanning and image/file QR code detection ([Guide](https://www.npmjs.com/package/vue-qrcode-reader)) |

## Mobile Development

| Technology                        | Purpose                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capacitor                         | Native runtime for packaging the Vue application as an Android mobile app while reusing the existing web codebase.                                                                                                                          |
| `@capacitor/core`                 | Core Capacitor runtime APIs for communication between the web application and native platform functionality.                                                                                                                                |
| `@capacitor/android`              | Android platform integration for building and running the application on Android devices.                                                                                                                                                   |
| `@capacitor/cli`                  | Command-line tooling for initializing Capacitor, synchronizing web assets and plugins, and managing native platform projects.                                                                                                               |
| `@capacitor-firebase/messaging`   | Firebase Cloud Messaging integration for obtaining FCM registration tokens, handling token refreshes, receiving push notifications, and handling notification interactions on Android devices.                                              |
| `firebase`                        | Firebase JavaScript SDK used as the web implementation dependency for `@capacitor-firebase/messaging`, providing Firebase Messaging functionality such as obtaining FCM tokens, checking messaging support, and handling incoming messages. |
| `bluetooth-serial`                | Bluetooth Classic serial communication between the Android application and ESP32-based SmartPack devices, including device discovery, connection, and data exchange.                                                                        |
| `@capacitor/assets`               | Generates native Android and iOS application icons and splash screen assets from source images.                                                                                                                                             |
| `sharp`                           | High-performance image processing library used to convert the SmartPack SVG logo into PNG assets and prepare adaptive icon foreground and background images.                                                                                |
| `sharp-cli`                       | Command-line interface for Sharp, enabling image processing and conversion tasks directly from the terminal.                                                                                                                                |
| `@capacitor/app`                  | Provides APIs for handling application state, lifecycle events, and native Android back-button events in Capacitor applications.                                                                                                            |
| `capacitor-secure-storage-plugin` | Provides secure storage for sensitive application data, such as authentication refresh tokens, using native Android Keystore-backed encryption and iOS Keychain.                                                                            |
| `@capgo/capacitor-social-login`   | Provides native social authentication integration for Capacitor applications, enabling users to sign in with providers such as Google on Android and iOS.                                                                                   |

## Dependency Patches

The project uses `pnpm patch` to apply fixes to third-party packages. Patch files are stored in `patches/` and registered under `patchedDependencies`, so they are reapplied on every `pnpm install`. Do not edit files in `node_modules` directly.

### `bluetooth-serial@1.0.0`

`bluetooth-serial` is an older Capacitor plugin that was not tested on Android 12+ (API 31+). The following changes are needed for it to work with Capacitor 8 on current Android versions.

#### 1. `setDiscoveryPermissions()` crash on Android 12+

|             |                                                                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**    | `android/src/main/java/com/glavotaner/bluetoothserial/BluetoothSerialPlugin.java`                                                                                                                                                                         |
| **Symptom** | On Android 12+ the app shows `BluetoothSerial plugin is not implemented on android`, and `Capacitor.isPluginAvailable('BluetoothSerial')` returns `false`. Android 11 and below work.                                                                     |
| **Cause**   | `load()` calls `setDiscoveryPermissions()`, which builds the list with `List.of(SCAN, CONNECT)` (immutable) and then calls `.add(FINE_LOCATION)`. This throws `UnsupportedOperationException` on API 31+. Capacitor then drops the plugin during startup. |
| **Fix**     | In the Android 12+ branch, replace `List.of(...)` with a mutable list. The Android 11 and below branch is unchanged because that list is never modified.                                                                                                  |

```java
discoveryPermissions = new ArrayList<>(java.util.Arrays.asList(SCAN, CONNECT));
```

#### 2. Gradle namespace

|             |                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**    | `android/build.gradle`                                                                                                                                   |
| **Symptom** | The build warns that setting the namespace via `package` in the plugin's `AndroidManifest.xml` is no longer supported and the value is ignored.          |
| **Cause**   | The plugin's `AndroidManifest.xml` still declares `package="com.glavotaner.bluetoothserial"`, which newer Android Gradle Plugin versions no longer read. |
| **Fix**     | Adds `namespace "com.glavotaner.bluetoothserial"` to the `android { }` block.                                                                            |

### Application-side configuration

These are not part of the patch. They live in the app and are required for Android 12+ support.

| Area                                       | Change                                                                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `capacitor.config.ts`                      | Sets `BluetoothSerial.neverScanForLocation: true`. SmartPack uses paired devices only, so discovery and location permission are not needed. It also skips the `.add(FINE_LOCATION)` call that caused the crash, so the plugin is protected even without the patch. |
| `android/app/src/main/AndroidManifest.xml` | Declares `BLUETOOTH` and `BLUETOOTH_ADMIN` (`maxSdkVersion="30"`), `BLUETOOTH_SCAN` (`neverForLocation`) and `BLUETOOTH_CONNECT`. Location permissions are declared for Android 11 and below only.                                                                 |

The plugin requests the "Nearby devices" (`BLUETOOTH_CONNECT`) runtime permission itself when `connect()` or `enable()` is called on Android 12+, so no extra permission code is needed in the app.

### Maintaining the patch

- Create or update a patch with `pnpm patch bluetooth-serial@1.0.0`, edit the folder it prints, then run `pnpm patch-commit '<folder>'`.
- If pnpm reports `ERR_PNPM_EDIT_DIR_NOT_EMPTY`, delete `node_modules/.pnpm_patches/bluetooth-serial@1.0.0` and run `pnpm patch` again.
- After changing the patch, run `pnpm install`, then `pnpm android:build`, and do a clean install of the app on the device.
- When upgrading `bluetooth-serial`, check whether the upstream release fixes the issue above. If it does, remove the patch.
- To verify the patch is applied:

```bash
grep -n "ArrayList<>(java.util.Arrays" \
  node_modules/bluetooth-serial/android/src/main/java/com/glavotaner/bluetoothserial/BluetoothSerialPlugin.java
```

## Testing

| Tool           | Purpose                                  |
| -------------- | ---------------------------------------- |
| Vitest         | Unit and component testing               |
| Vue Test Utils | Vue component testing utilities          |
| jsdom          | Browser environment simulation for tests |

## Code Quality and Development Tools

| Tool                            | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| ESLint                          | Code linting                                                   |
| Prettier                        | Code formatting                                                |
| Oxlint                          | Fast JavaScript and TypeScript linting                         |
| vue-tsc                         | Type checking for Vue and TypeScript                           |
| `@vue/eslint-config-typescript` | ESLint configuration for TypeScript and Vue                    |
| `eslint-plugin-vue`             | ESLint rules for Vue                                           |
| `eslint-config-prettier`        | Prevents ESLint and Prettier rule conflicts                    |
| pre-commit                      | Automated Git hooks for local quality checks                   |
| Git                             | Version control                                                |
| GitHub                          | Repository and collaboration                                   |
| Husky                           | Git hooks for automated pre-commit and pre-push quality checks |

## Development Environment

| Tool    | Purpose                             |
| ------- | ----------------------------------- |
| Node.js | JavaScript runtime                  |
| `pnpm`  | Package and dependency management   |
| VS Code | Recommended development environment |

## Deployment

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| Vercel     | Frontend hosting and continuous deployment |

## Planned Tools

Tools that are planned but not yet implemented should be documented separately or marked clearly as planned.
