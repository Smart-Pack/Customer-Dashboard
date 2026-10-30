et -Eeuo pipefail

SDK_DIR="${ANDROID_HOME:-$HOME/Android/Sdk}"
CMDLINE_TOOLS_VERSION="13114758"
ANDROID_API="36"
BUILD_TOOLS_VERSION="36.0.0"
ZIP_NAME="commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"
DOWNLOAD_URL="https://dl.google.com/android/repository/${ZIP_NAME}"

echo "==> Installing prerequisites"
sudo apt update
sudo apt install -y openjdk-21-jdk curl unzip

echo "==> Creating SDK directories"
mkdir -p "$SDK_DIR/cmdline-tools"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Downloading Android command-line tools"
curl -fL "$DOWNLOAD_URL" -o "$TMP_DIR/$ZIP_NAME"

echo "==> Extracting command-line tools"
unzip -q "$TMP_DIR/$ZIP_NAME" -d "$TMP_DIR"

mkdir -p "$SDK_DIR/cmdline-tools/latest"

# Replace an existing installation safely.
# rm -rf "$SDK_DIR/cmdline-tools/latest"
# mv "$TMP_DIR/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
#
# echo "==> Configuring environment variables"
# touch "$HOME/.bashrc"
#
# if ! grep -q '# Android SDK setup' "$HOME/.bashrc"; then
#   cat >> "$HOME/.bashrc" <<'EOF'
#
#   # Android SDK setup
#   export ANDROID_HOME="$HOME/Android/Sdk"
#   export ANDROID_SDK_ROOT="$ANDROID_HOME"
#   export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
#   EOF
#   fi
#
#   export ANDROID_HOME="$SDK_DIR"
#   export ANDROID_SDK_ROOT="$SDK_DIR"
#   export PATH="$PATH:$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools"
#
#   echo "==> Installing Android SDK packages"
#   sdkmanager --sdk_root="$SDK_DIR" \
#     "platform-tools" \
#       "platforms;android-${ANDROID_API}" \
#         "build-tools;${BUILD_TOOLS_VERSION}"
#
#         echo "==> Accepting SDK licenses"
#         yes | sdkmanager --sdk_root="$SDK_DIR" --licenses || true
#
#         echo "==> Verifying installation"
#         java -version
#         sdkmanager --version
#         adb version
#
#         echo
#         echo "Android SDK installed at: $SDK_DIR"
#         echo "API platform: Android $ANDROID_API"
#         echo "Build Tools: $BUILD_TOOLS_VERSION"
#         echo
#         echo "Open a new terminal or run: source ~/.bashrc"
#         echo "Then build your app with: pnpm android:install:debug"
