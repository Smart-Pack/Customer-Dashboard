#!/usr/bin/env bash
set -Eeuo pipefail

# SmartPack Customer Dashboard Android development setup for Ubuntu/Debian.
# Installs system prerequisites, checks the Android SDK, and prepares the
# JavaScript/Capacitor project when run from the repository root.

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Error: this setup script currently supports Ubuntu/Debian (apt-get)." >&2
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "Error: sudo is required to install system packages." >&2
    exit 1
  fi
  SUDO=(sudo)
fi

echo "==> Updating package lists..."
"${SUDO[@]}" apt-get update

echo "==> Installing Android/Java prerequisites..."
"${SUDO[@]}" apt-get install -y \
  adb \
  openjdk-21-jdk \
  curl \
  unzip \
  zip \
  git

echo
echo "==> Checking Java..."
if ! command -v java >/dev/null 2>&1; then
  echo "Error: java was not found after installing the JDK." >&2
  exit 1
fi
java -version

echo
echo "==> Checking ADB..."
adb version

# Prefer an explicitly configured SDK path; otherwise use the usual Linux path.
SDK_DIR="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-${HOME}/Android/Sdk}}"

if [[ -d "${SDK_DIR}" ]]; then
  export ANDROID_HOME="${ANDROID_HOME:-${SDK_DIR}}"
  export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${SDK_DIR}}"
  export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"

  echo
  echo "Android SDK directory detected: ${SDK_DIR}"
  if [[ -x "${SDK_DIR}/platform-tools/adb" ]]; then
    echo "SDK platform-tools are installed."
  else
    echo "Note: SDK platform-tools were not found inside ${SDK_DIR}."
    echo "The system ADB installed through apt is available separately."
  fi
else
  echo
  echo "Android SDK was not found at: ${SDK_DIR}"
  echo "Install Android Studio and use SDK Manager to install:"
  echo "  - Android SDK Platform (the API level required by this project)"
  echo "  - Android SDK Build-Tools"
  echo "  - Android SDK Platform-Tools"
  echo "  - Android SDK Command-line Tools (latest)"
  echo
  echo "Then set ANDROID_HOME and ANDROID_SDK_ROOT to your SDK directory."
fi

# Prepare the repository if the script is run from the project root.
if [[ -f "package.json" ]] && grep -q '"@capacitor/cli"' package.json; then
  echo
  echo "==> Preparing SmartPack Customer Dashboard..."
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm is not installed. Install/enable pnpm with Corepack or your preferred method,"
    echo "then rerun this script to install project dependencies."
  else
    pnpm install
    if [[ -d android ]]; then
      chmod +x android/gradlew
      pnpm exec cap sync android
    fi
  fi
else
  echo
  echo "Not run from the Customer-Dashboard project root; skipped pnpm install and Capacitor sync."
  echo "Run this script from the repository root to prepare the project too."
fi

echo
echo "==> Setup script finished."
echo "Next steps:"
echo "  1. Ensure Android Studio's SDK components are installed and ANDROID_HOME is configured."
echo "  2. Connect your phone, enable USB debugging, and authorize this computer."
echo "  3. Check the connection with: adb devices"
echo "  4. Build/install with: pnpm android:install"

