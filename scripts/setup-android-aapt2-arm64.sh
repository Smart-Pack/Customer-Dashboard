#!/usr/bin/env bash
set -Eeuo pipefail

AAPT2_DIR="$HOME/tools"
AAPT2_BIN="$AAPT2_DIR/aapt2"
GRADLE_DIR="$HOME/.gradle"
GRADLE_PROPERTIES="$GRADLE_DIR/gradle.properties"

AAPT2_URL="https://github.com/ReVanced/aapt2/releases/latest/download/aapt2-arm64-v8a"
PROPERTY="android.aapt2FromMavenOverride"

echo "==> Checking system architecture"

if [[ "$(uname -m)" != "aarch64" ]]; then
    echo "ERROR: This script requires ARM64 architecture." >&2
    exit 1
fi

echo "ARM64 architecture detected."

echo "==> Checking required commands"

for cmd in wget file grep sed; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "ERROR: Missing required command: $cmd" >&2
        echo "Install it using: sudo apt-get install $cmd" >&2
        exit 1
    fi
done

echo "==> Creating directories"

mkdir -p "$AAPT2_DIR" "$GRADLE_DIR"

echo "==> Checking existing AAPT2 installation"

if [[ ! -x "$AAPT2_BIN" ]] || ! "$AAPT2_BIN" version >/dev/null 2>&1; then

    echo "==> Downloading ARM64 AAPT2"

    TMP_FILE="$(mktemp "${AAPT2_DIR}/aapt2.XXXXXX")"
    trap 'rm -f "${TMP_FILE:-}"' EXIT

    wget -q --show-progress -O "$TMP_FILE" "$AAPT2_URL"

    echo "==> Verifying downloaded binary"

    if ! file "$TMP_FILE" | grep -Eqi 'ARM aarch64|ARM64'; then
        echo "ERROR: Downloaded file is not an ARM64 binary." >&2
        exit 1
    fi

    chmod +x "$TMP_FILE"

    if ! "$TMP_FILE" version; then
        echo "ERROR: Downloaded AAPT2 binary is not executable." >&2
        exit 1
    fi

    echo "==> Installing AAPT2"

    mv -f "$TMP_FILE" "$AAPT2_BIN"

    trap - EXIT
else
    echo "A valid AAPT2 installation already exists."
fi

chmod +x "$AAPT2_BIN"

echo "==> Verifying AAPT2"

"$AAPT2_BIN" version

echo "==> Configuring Gradle"

touch "$GRADLE_PROPERTIES"

if grep -qE "^[[:space:]]*${PROPERTY}[[:space:]]*=" "$GRADLE_PROPERTIES"; then

    sed -i \
        "s|^[[:space:]]*${PROPERTY}[[:space:]]*=.*|${PROPERTY}=${AAPT2_BIN}|" \
        "$GRADLE_PROPERTIES"

else

    printf '\n%s=%s\n' "$PROPERTY" "$AAPT2_BIN" \
        >> "$GRADLE_PROPERTIES"

fi

echo "==> Verifying Gradle configuration"

grep -F "${PROPERTY}=" "$GRADLE_PROPERTIES"

echo
echo "========================================"
echo "ARM64 AAPT2 setup completed!"
echo "========================================"
echo "AAPT2 binary: $AAPT2_BIN"
echo "Gradle properties: $GRADLE_PROPERTIES"
echo
echo "You can now build your Android application using:"
echo "pnpm android:assemble"
