#!/usr/bin/env bash
set -Eeuo pipefail

SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
CMDLINE_TOOLS_VERSION="13114758"
ANDROID_API="36"
BUILD_TOOLS_VERSION="36.0.0"

ZIP_NAME="commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"
DOWNLOAD_URL="https://dl.google.com/android/repository/${ZIP_NAME}"

echo "==> Installing prerequisites"

sudo apt-get update
sudo apt-get install -y openjdk-21-jdk curl unzip

echo "==> Configuring Android SDK directories"

mkdir -p "$SDK_DIR/cmdline-tools"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Downloading Android command-line tools"

curl -fL "$DOWNLOAD_URL" -o "$TMP_DIR/$ZIP_NAME"

echo "==> Extracting Android command-line tools"

unzip -q "$TMP_DIR/$ZIP_NAME" -d "$TMP_DIR"

if [[ ! -d "$TMP_DIR/cmdline-tools" ]]; then
    echo "ERROR: Android command-line tools extraction failed." >&2
    exit 1
fi

echo "==> Installing command-line tools"

rm -rf "$SDK_DIR/cmdline-tools/latest"
mv "$TMP_DIR/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"

echo "==> Configuring environment variables"

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

touch "$HOME/.bashrc"

if ! grep -q '# Android SDK setup' "$HOME/.bashrc"; then
    cat >> "$HOME/.bashrc" <<EOF

# Android SDK setup
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="\$ANDROID_HOME"
export PATH="\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"
EOF
fi

echo "==> Installing Android SDK packages"

sdkmanager --sdk_root="$SDK_DIR" \
    "platform-tools" \
    "platforms;android-${ANDROID_API}" \
    "build-tools;${BUILD_TOOLS_VERSION}"

echo "==> Accepting SDK licenses"

yes | sdkmanager --sdk_root="$SDK_DIR" --licenses || true

echo "==> Verifying installation"

java -version
sdkmanager --version
adb version

echo
echo "========================================"
echo "Android SDK installation completed!"
echo "========================================"
echo "SDK directory: $SDK_DIR"
echo "Android API: $ANDROID_API"
echo "Build Tools: $BUILD_TOOLS_VERSION"
echo
echo "Open a new terminal or run:"
echo "source ~/.bashrc"
echo
echo "Then build your app with:"
echo "pnpm android:install:debug"
