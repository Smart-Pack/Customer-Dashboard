#!/usr/bin/env bash

#
# SmartPack Bluetooth Classic SPP Setup
#
# Supported OS: Ubuntu 24.04 LTS
#
# Installs:
#   - BlueZ Bluetooth stack
#   - Python 3
#   - PyBluez
#   - Bluetooth development libraries
#
# Configures:
#   - Bluetooth system service
#   - BlueZ compatibility mode for legacy SDP
#   - Bluetooth adapter power
#
# Usage:
#   sudo ./scripts/setup-bluetooth.sh
#

set -Eeuo pipefail

readonly SCRIPT_NAME="SmartPack Bluetooth Setup"
readonly BLUEZ_OVERRIDE="/etc/systemd/system/bluetooth.service.d/compat.conf"

log() {
    echo -e "\n[INFO] $1"
}

success() {
    echo -e "[SUCCESS] $1"
}

warn() {
    echo -e "[WARNING] $1"
}

error() {
    echo -e "[ERROR] $1" >&2
    exit 1
}

# Ensure the script runs as root.
if [[ "${EUID}" -ne 0 ]]; then
    error "Run this script with sudo: sudo $0"
fi

echo "========================================"
echo "       ${SCRIPT_NAME}"
echo "========================================"

# Check operating system.
if [[ ! -f /etc/os-release ]]; then
    error "Cannot identify the operating system."
fi

source /etc/os-release

if [[ "${ID}" != "ubuntu" ]]; then
    error "This script supports Ubuntu only."
fi

# Check Bluetooth hardware.
log "Checking Bluetooth hardware..."

if ! command -v rfkill >/dev/null 2>&1; then
    log "rfkill will be installed through the system dependencies."
fi

# Update package lists.
log "Updating package lists..."

apt-get update

# Install dependencies.
log "Installing Bluetooth and Python dependencies..."

apt-get install -y \
    bluez \
    rfkill \
    python3 \
    python3-bluez \
    libbluetooth-dev

success "Dependencies installed."

# Verify Bluetooth daemon.
if ! command -v bluetoothd >/dev/null 2>&1; then
    error "bluetoothd was not found after installation."
fi

BLUETOOTHD="$(command -v bluetoothd)"

log "Using Bluetooth daemon: ${BLUETOOTHD}"

# Configure BlueZ compatibility mode.
log "Configuring BlueZ compatibility mode..."

mkdir -p "$(dirname "${BLUEZ_OVERRIDE}")"

cat > "${BLUEZ_OVERRIDE}" <<EOF
[Service]
ExecStart=
ExecStart=${BLUETOOTHD} --compat
EOF

systemctl daemon-reload

success "BlueZ compatibility mode configured."

# Unblock Bluetooth.
log "Unblocking Bluetooth..."

rfkill unblock bluetooth || warn "Could not unblock Bluetooth."

# Enable and start Bluetooth service.
log "Enabling Bluetooth service..."

systemctl enable bluetooth
systemctl restart bluetooth

sleep 2

if ! systemctl is-active --quiet bluetooth; then
    error "Bluetooth service failed to start. Check: journalctl -u bluetooth"
fi

success "Bluetooth service is running."

# Power on available Bluetooth adapters.
log "Powering on Bluetooth adapters..."

if command -v bluetoothctl >/dev/null 2>&1; then
    bluetoothctl power on || warn "Could not power on Bluetooth automatically."
else
    warn "bluetoothctl was not found."
fi

# Check adapter availability.
log "Checking Bluetooth adapters..."

if bluetoothctl list | grep -q "Controller"; then
    success "Bluetooth adapter detected."

    bluetoothctl show
else
    warn "No Bluetooth controller detected."
    warn "Connect a Bluetooth Classic USB adapter and check its driver."
fi

# Verify Python Bluetooth support.
log "Verifying PyBluez installation..."

if /usr/bin/python3 -c "import bluetooth; print('PyBluez:', bluetooth.__file__)" 2>/dev/null; then
    success "PyBluez is available in system Python."
else
    error "PyBluez installation could not be verified."
fi

# Verify required commands.
log "Checking Bluetooth utilities..."

for utility in bluetoothctl rfkill sdptool rfcomm; do
    if command -v "${utility}" >/dev/null 2>&1; then
        success "${utility} is available."
    else
        warn "${utility} was not found."
    fi
done

echo
echo "========================================"
echo "       SETUP COMPLETED"
echo "========================================"

echo
echo "Bluetooth daemon:"
bluetoothd --version

echo
echo "Bluetooth service:"
systemctl is-active bluetooth

echo
echo "Available adapters:"
bluetoothctl list

echo
echo "Python:"
/usr/bin/python3 --version

echo
echo "PyBluez:"
/usr/bin/python3 -c "import bluetooth; print(bluetooth.__file__)"

echo
echo "Next steps:"
echo "  1. Pair your Android phone with Ubuntu."
echo "  2. Enable Bluetooth discoverability if needed."
echo "  3. Run your SmartPack SPP server:"
echo
echo "     pnpm bluetooth:server"
echo
echo "To inspect Bluetooth logs:"
echo "  sudo journalctl -u bluetooth -f"
echo
