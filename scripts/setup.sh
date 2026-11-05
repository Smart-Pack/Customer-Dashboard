#!/usr/bin/env bash
set -Eeuo pipefail

# SmartPack Customer Dashboard Android development setup.
#
# Supports Ubuntu/Debian environments.
# Installs system prerequisites, configures Android SDK environment
# variables, and prepares the JavaScript/Capacitor project.

echo "========================================"
echo "SmartPack Android Development Setup"
echo "========================================"

# --------------------------------------------------
# 1. Check operating system
# --------------------------------------------------

echo
echo "==> Checking operating system"

if ! command -v apt-get >/dev/null 2>&1; then
    echo "ERROR: This script currently supports Ubuntu/Debian only." >&2
    exit 1
fi

# --------------------------------------------------
# 2. Configure sudo
# --------------------------------------------------

if [[ "${EUID}" -eq 0 ]]; then
    SUDO=()
else
    if ! command -v sudo >/dev/null 2>&1; then
        echo "ERROR: sudo is required to install system packages." >&2
        exit 1
    fi

    SUDO=(sudo)
fi

# --------------------------------------------------
# 3. Install system prerequisites
# --------------------------------------------------

echo
echo "==> Updating package lists"

"${SUDO[@]}" apt-get update

echo
echo "==> Installing Android/Java prerequisites"

"${SUDO[@]}" apt-get install -y \
    adb \
    openjdk-21-jdk \
    curl \
    unzip \
    zip \
    git \
    wget \
    file

# --------------------------------------------------
# 4. Verify Java installation
# --------------------------------------------------

echo
echo "==> Checking Java"

if ! command -v java >/dev/null 2>&1; then
    echo "ERROR: Java was not found after installation." >&2
    exit 1
fi

java -version

# --------------------------------------------------
# 5. Configure Android SDK
# --------------------------------------------------

echo
echo "==> Configuring Android SDK"

SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"

mkdir -p "$SDK_DIR"

# Add SDK tools to the current shell.
export PATH="$SDK_DIR/platform-tools:$SDK_DIR/cmdline-tools/latest/bin:$PATH"

# Persist environment variables.
BASHRC="$HOME/.bashrc"

touch "$BASHRC"

if ! grep -q '# Android SDK setup' "$BASHRC"; then
    cat >> "$BASHRC" <<EOF

# Android SDK setup
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="\$ANDROID_HOME"
export PATH="\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH"
EOF
fi

# --------------------------------------------------
# 6. Verify Android SDK components
# --------------------------------------------------

echo
echo "==> Checking Android SDK components"

if [[ -x "$SDK_DIR/platform-tools/adb" ]]; then
    echo "Android SDK platform-tools detected."
    "$SDK_DIR/platform-tools/adb" version
else
    echo "WARNING: Android SDK platform-tools were not found."
    echo "Run: ./scripts/setup-android-sdk.sh"
fi

if [[ -x "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]]; then
    echo "Android SDK command-line tools detected."
else
    echo "WARNING: Android SDK command-line tools were not found."
    echo "Run: ./scripts/setup-android-sdk.sh"
fi

# --------------------------------------------------
# 7. Check system ADB
# --------------------------------------------------

echo
echo "==> Checking ADB"

if command -v adb >/dev/null 2>&1; then
    adb version
else
    echo "WARNING: ADB is not available."
fi

# --------------------------------------------------
# 8. Prepare JavaScript project
# --------------------------------------------------

echo
echo "==> Checking SmartPack Customer Dashboard project"

if [[ -f "package.json" ]] && grep -q '"@capacitor/cli"' package.json; then

    if ! command -v pnpm >/dev/null 2>&1; then
        echo "WARNING: pnpm is not installed."
        echo "Install pnpm and rerun this script to prepare project dependencies."

    else
        echo
        echo "==> Installing project dependencies"

        if [[ -f "pnpm-lock.yaml" ]]; then
            pnpm install --frozen-lockfile
        else
            pnpm install
        fi

        # --------------------------------------------------
        # 9. Synchronize Capacitor Android project
        # --------------------------------------------------

        if [[ -d "android" ]]; then
            echo
            echo "==> Synchronizing Capacitor Android project"

            chmod +x android/gradlew

            pnpm exec cap sync android
        else
            echo
            echo "WARNING: Android platform directory was not found."
            echo "Add it with: pnpm exec cap add android"
        fi
    fi

else
    echo "Not running from the Customer Dashboard project root."
    echo "Skipped pnpm installation and Capacitor synchronization."
fi

# --------------------------------------------------
# 10. Completion
# --------------------------------------------------

echo
echo "========================================"
echo "SmartPack setup completed!"
echo "========================================"

echo
echo "Android SDK: $SDK_DIR"

echo
echo "Next steps:"
echo "  1. Run: source ~/.bashrc"
echo "  2. Connect your Android phone."
echo "  3. Enable USB debugging."
echo "  4. Authorize the computer on your phone."
echo "  5. Check connection using: adb devices"
echo
echo "For Android SDK installation:"
echo "  ./scripts/setup-android-sdk.sh"
echo
echo "For ARM64 UserLAnd environments:"
echo "  ./scripts/setup-android-aapt2-arm64.sh"
echo
echo "Build your application:"
echo "  pnpm build --mode mobile"
echo "  pnpm exec cap sync android"
echo "  pnpm android:assemble"
echo
