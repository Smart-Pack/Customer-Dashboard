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

### Bluetooth Classic SPP Testing

The repository provides a Bluetooth Classic SPP test server that simulates a SmartPack device during development. It allows the Android application to test Bluetooth communication without requiring the physical ESP32 hardware.

The server periodically sends two newline-delimited JSON messages to connected Android devices:

1. **Sensor measurements** – simulated weight and step-count readings.
2. **SmartPack configuration** – device settings, including:
   - Weight limit (grams).
   - Measurement update delay (seconds).
   - Communication mode (GSM or Wi-Fi).
   - Wi-Fi network credentials (SSID and password).
   - Bluetooth device name.

The server also receives messages from the Android application and logs transmitted and received messages with timestamps. This supports testing Bluetooth connectivity, sensor processing, configuration reception, configuration updates, and bidirectional communication during development.

After completing the Bluetooth setup described in the [Setup Guide](setup.md), start the test server from the project root:

```bash
pnpm bluetooth:server
```

To use the test server as a SmartPack device:

1. Pair your Android device with the Linux machine running the Bluetooth server.
2. Obtain the Bluetooth MAC address of the Linux machine using:

   ```bash
   bluetoothctl show
   ```

3. Assign the Linux machine's Bluetooth MAC address to the SmartPack's `bluetooth_mac_address` field.
4. Open the SmartPack in the Android application and connect to it.
5. Navigate to the SmartPack's **Settings** tab to view the simulated configuration received over Bluetooth.
6. Select **Update Configuration** to modify the device settings.
7. Submit the form to send configuration updates to the test server over the Bluetooth connection.

#### Configuration Updates

The Android application sends configuration changes as newline-terminated CSV commands using the following format:

```text
parameter,value_1,value_2
```

Supported commands include:

| Command | Description | Example |
|---|---|---|
| `weight_limit` | Updates the weight limit in grams. | `weight_limit,25000` |
| `delay` | Updates the measurement interval in seconds. | `delay,60` |
| `com_mode` | Sets the communication mode (`0` = GSM, `1` = Wi-Fi). | `com_mode,1` |
| `wifi_settings` | Updates the Wi-Fi SSID and password. | `wifi_settings,MyNetwork,MyPassword` |
| `bluetooth_name` | Updates the Bluetooth device name. | `bluetooth_name,SmartPack-01` |

Only settings that differ from the initially received configuration are sent. Multiple updates are transmitted sequentially over the Bluetooth connection.

Ensure the Bluetooth server is running before attempting to connect. Configuration updates require an active Bluetooth connection.

The test server uses predefined configuration values for development and testing. These values can be modified in `scripts/bluetooth_server.py` to simulate different SmartPack configurations.

For detailed setup and troubleshooting instructions, see [Bluetooth Setup](docs/getting_started/setup.md#47-bluetooth-classic-spp-testing).

### Available Android Commands

| Command | Description |
|---|---|
| `adb devices` | Lists Android devices detected by ADB. |
| `pnpm android:build` | Builds the mobile web assets using `.env.mobile` and synchronizes Capacitor. |
| `pnpm android:install` | Builds the mobile assets, synchronizes Capacitor, and builds and installs the debug APK. |
| `pnpm android:install:debug` | Installs the existing debug APK on a connected Android device. |
| `pnpm android:assets` | Generates Android launcher icon assets from the SmartPack SVG logo and synchronizes the assets with the native Android project. |
| `pnpm android:assemble` | Synchronizes Capacitor with Android, builds the debug APK, and copies the generated APK into the `build/` directory. |
| `pnpm android:sha1` | Generates and displays the SHA-1 signing certificate fingerprint for the Android debug variant, useful when configuring Google OAuth credentials. |

#### Android Logs & App Control

| Command | Description |
|---|---|
| `pnpm android:stop` | Force-stops the SmartPack Android application. |
| `pnpm android:start` | Launches the SmartPack Android application. |
| `pnpm android:restart` | Force-stops the application, waits two seconds, and launches it again. |
| `pnpm android:logs:clear` | Clears the existing Android log buffer and restarts the application. |
| `pnpm android:logs` | Waits until the SmartPack application is running, then streams its Android logs using its process ID. |
| `pnpm android:logs:restart` | Clears the log buffer, restarts the application, waits two seconds, and streams its logs. |
| `pnpm run android:logs:filter '[AuthStore]'` | Clears the log buffer, restarts the application, waits two seconds, and streams only log entries containing the specified fixed-string pattern. |

**Filtering application logs**

Use `android:logs:filter` to monitor specific application components by passing their log prefixes as arguments.

```bash
# Monitor authentication logs
pnpm run android:logs:filter '[AuthStore]'

# Monitor user repository logs
pnpm run android:logs:filter '[UserRepository]'

# Monitor authentication and user repository logs
pnpm run android:logs:filter '[AuthStore]' -e '[UserRepository]'
```

The command clears the log buffer, restarts the application, waits two seconds, and streams only log entries matching the specified fixed-string patterns.

**Note:** The `android:build` script only synchronizes Capacitor; it does not build the APK itself. The `android:install` script invokes Gradle through `./gradlew installDebug`, which builds and installs the debug APK. Ensure the Android SDK is configured correctly before running these commands.

