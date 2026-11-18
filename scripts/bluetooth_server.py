"""
SmartPack Bluetooth Classic SPP Test Server.

Advertises an RFCOMM Serial Port Profile (SPP) service and accepts
connections from Android devices.

After a client connects, the server:
    - Sends simulated sensor measurements every 5 seconds.
    - Receives and prints messages from the connected Android device.
    - Prints an ISO 8601 timestamp before every transmitted or received message.

Requirements:
    - Linux with BlueZ Bluetooth stack.
    - PyBluez.
    - Bluetooth Classic adapter.
    - RFCOMM channel 1 available.

Run:
    sudo python3 scripts/bluetooth_server.py
"""

import bluetooth
import json
import socket
import threading
from datetime import datetime, timezone

SERVER_NAME = "SmartPack SPP Test"
RFCOMM_CHANNEL = 1
SEND_INTERVAL = 5

WEIGHT_MIN = 500
WEIGHT_MAX = 8000
WEIGHT_STEP = 250

STEPS_MIN = 0
STEPS_MAX = 10000
STEPS_STEP = 100

INCREASING = 1
DECREASING = -1


def get_timestamp() -> str:
    """
    Return the current UTC timestamp in ISO 8601 format.

    Returns:
        str: Current UTC timestamp.
    """
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def log_message(message: str) -> None:
    """
    Print a message prefixed with the current timestamp.

    Args:
        message: Message to print.
    """
    print(f"[{get_timestamp()}] {message}", flush=True)


def send_sensor_data(
    client: socket.socket,
    stop_event: threading.Event,
) -> None:
    """
    Send simulated sensor measurements every SEND_INTERVAL seconds.

    Weight and steps increase gradually until their maximum thresholds
    are reached, then decrease gradually until their minimum thresholds
    are reached. The cycle repeats continuously.

    Args:
        client: Connected native RFCOMM socket.
        stop_event: Event used to signal the sending thread to stop.
    """
    weight = WEIGHT_MIN
    steps = STEPS_MIN

    weight_direction = INCREASING
    steps_direction = INCREASING

    while not stop_event.is_set():

        message = {
            "type": "sensors",
            "data": {
                "weight": weight,
                "steps": steps,
            },
        }

        payload = (json.dumps(message) + "\n").encode("utf-8")

        try:
            client.sendall(payload)
            log_message(f"SENT: {payload.decode('utf-8').strip()}")

        except OSError as error:
            log_message(f"SEND ERROR: {error}")
            stop_event.set()
            break

        # Update weight.
        weight += WEIGHT_STEP * weight_direction

        if weight >= WEIGHT_MAX:
            weight = WEIGHT_MAX
            weight_direction = DECREASING

        elif weight <= WEIGHT_MIN:
            weight = WEIGHT_MIN
            weight_direction = INCREASING

        # Update steps.
        steps += STEPS_STEP * steps_direction

        if steps >= STEPS_MAX:
            steps = STEPS_MAX
            steps_direction = DECREASING

        elif steps <= STEPS_MIN:
            steps = STEPS_MIN
            steps_direction = INCREASING

        stop_event.wait(SEND_INTERVAL)


def handle_client(py_client: bluetooth.BluetoothSocket, address: tuple) -> None:
    """
    Handle an individual Android Bluetooth connection.

    Converts the accepted PyBluez socket into a native Python socket,
    starts a background sensor-data sender, and continuously receives
    messages from the Android device.

    Args:
        py_client: Accepted PyBluez RFCOMM socket.
        address: Remote Bluetooth device address.
    """
    client = None
    sender_thread = None
    stop_event = threading.Event()

    try:
        log_message(f"CONNECTED: {address}")

        # Duplicate the accepted RFCOMM socket as a native socket.
        client = socket.fromfd(
            py_client.fileno(),
            socket.AF_BLUETOOTH,
            socket.SOCK_STREAM,
            socket.BTPROTO_RFCOMM,
        )

        py_client.close()

        log_message(f"SOCKET: {client.getpeername()}")

        # Start periodic sensor-data transmission.
        sender_thread = threading.Thread(
            target=send_sensor_data,
            args=(client, stop_event),
            daemon=True,
        )
        sender_thread.start()

        # Receive messages from Android.
        while not stop_event.is_set():
            data = client.recv(1024)

            if not data:
                log_message("DISCONNECTED: Android closed the connection.")
                break

            log_message(f"RECEIVED: {data.decode('utf-8', errors='replace').strip()}")

    except OSError as error:
        log_message(f"CLIENT SOCKET ERROR: {error}")

    finally:
        stop_event.set()

        if client is not None:
            client.close()

        py_client.close()

        if sender_thread is not None:
            sender_thread.join(timeout=1)

        log_message("CONNECTION CLOSED")


def main() -> None:
    """
    Start the SmartPack Bluetooth SPP server.

    Binds to the configured RFCOMM channel, advertises the Serial Port
    Profile service, and continuously accepts incoming connections.
    """
    server = bluetooth.BluetoothSocket(bluetooth.RFCOMM)

    try:
        server.bind(("", RFCOMM_CHANNEL))
        server.listen(1)

        bluetooth.advertise_service(
            server,
            SERVER_NAME,
            service_id=bluetooth.SERIAL_PORT_CLASS,
            service_classes=[bluetooth.SERIAL_PORT_CLASS],
            profiles=[bluetooth.SERIAL_PORT_PROFILE],
        )

        log_message(f"{SERVER_NAME} listening on RFCOMM channel {RFCOMM_CHANNEL}")
        log_message("WAITING: Android Bluetooth connection...")

        while True:
            client, address = server.accept()

            handle_client(client, address)

            log_message("WAITING: Android Bluetooth connection...")

    except KeyboardInterrupt:
        log_message("STOPPING: Bluetooth server interrupted.")

    finally:
        server.close()
        log_message("SERVER CLOSED")


if __name__ == "__main__":
    main()
