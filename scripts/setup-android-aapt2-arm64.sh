#!/usr/bin/env bash
set -Eeuo pipefail

AAPT2_DIR="$HOME/tools"
AAPT2_BIN="$AAPT2_DIR/aapt2"
GRADLE_PROPERTIES="$HOME/.gradle/gradle.properties"
AAPT2_URL="https://github.com/ReVanced/aapt2/releases/latest/download/aapt2-arm64-v8a"
PROPERTY="android.aapt2FromMavenOverride"

[[ "$(uname -m)" == "aarch64" ]] || {
    echo "ERROR: This script requires ARM64." >&2
    exit 1
}

command -v wget >/dev/null || {
    echo "ERROR: Install wget with: sudo apt install wget" >&2
    exit 1
}

mkdir -p "$AAPT2_DIR" "$HOME/.gradle"

if [[ ! -x "$AAPT2_BIN" ]] || ! "$AAPT2_BIN" version >/dev/null 2>&1; then
    tmp="${AAPT2_BIN}.download"
    trap 'rm -f "${tmp:-}"' EXIT

    wget -O "$tmp" "$AAPT2_URL"
    chmod +x "$tmp"

    file "$tmp" | grep -Eqi 'ARM aarch64|ARM64' || {
        echo "ERROR: Downloaded file is not ARM64." >&2
        exit 1
    }

    "$tmp" version
    mv "$tmp" "$AAPT2_BIN"
    trap - EXIT
fi

chmod +x "$AAPT2_BIN"
"$AAPT2_BIN" version

touch "$GRADLE_PROPERTIES"

if grep -qE "^[[:space:]]*${PROPERTY}[[:space:]]*=" "$GRADLE_PROPERTIES"; then
    sed -i \
        "s|^[[:space:]]*${PROPERTY}[[:space:]]*=.*|${PROPERTY}=${AAPT2_BIN}|" \
        "$GRADLE_PROPERTIES"
else
    printf '\n%s=%s\n' "$PROPERTY" "$AAPT2_BIN" >> "$GRADLE_PROPERTIES"
fi

echo "Configured: $(grep -F "${PROPERTY}=" "$GRADLE_PROPERTIES")"
echo "ARM64 AAPT2 setup completed."
