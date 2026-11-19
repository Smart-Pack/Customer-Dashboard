"""
SmartPack Bluetooth Classic SPP Test Server.

Advertises an RFCOMM Serial Port Profile (SPP) service and accepts
connections from Android devices.

After a client connects, the server:
    - Sends simulated sensor measurements every 5 seconds.
    - Sends the current SmartPack configuration.
    - Receives CSV configuration commands from Android devices.
    - Updates configuration values when valid commands are received.
    - Prints an ISO 8601 timestamp before every transmitted or received message.

Configuration command format:
    parameter,value_1[,value_2]

Supported commands:
    weight_limit,20000
    delay,55
    com_mode,0
    wifi_settings,ssid,password
    bluetooth_name,SmartPack

Requirements:
    - Linux with BlueZ Bluetooth stack.
    - PyBluez.
    - Bluetooth Classic adapter.
    - RFCOMM channel 1 available.

Run:
    sudo python3 scripts/bluetooth_server.py
"""

import bluetooth
import csv
import io
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

# SmartPack configuration.
WEIGHT_LIMIT = 20000
CONFIGURATION_DELAY = 55
COM_MODE = 0  # 0 = GSM, 1 = Wi-Fi

WIFI_SETTINGS = {
    "ssid": "Animus",
    "password": "123",
}

BLUETOOTH_NAME = "SmartPack"

# Protect configuration reads and updates across threads.
CONFIGURATION_LOCK = threading.Lock()


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


def get_configuration_message() -> dict:
    """
    Return a snapshot of the current SmartPack configuration.

    Returns:
        dict: SmartPack configuration payload.
    """
    with CONFIGURATION_LOCK:
        return {
            "weight_limit": WEIGHT_LIMIT,
            "delay": CONFIGURATION_DELAY,
            "com_mode": COM_MODE,
            "wifi_settings": WIFI_SETTINGS.copy(),
            "bluetooth_name": BLUETOOTH_NAME,
        }


def handle_configuration_command(command: str) -> None:
    """
    Parse and apply an incoming CSV configuration command.

    Expected format:
        parameter,value_1[,value_2]

    Supported parameters:
        weight_limit:
            weight_limit,20000

        delay:
            delay,55

        com_mode:
            com_mode,0

        wifi_settings:
            wifi_settings,ssid,password

        bluetooth_name:
            bluetooth_name,SmartPack

    Args:
        command: CSV configuration command.
    """
    global WEIGHT_LIMIT
    global CONFIGURATION_DELAY
    global COM_MODE
    global WIFI_SETTINGS
    global BLUETOOTH_NAME

    try:
        reader = csv.reader(io.StringIO(command), strict=True)
        parts = next(reader)

        if len(parts) not in (2, 3):
            raise ValueError(
                "Expected two or three CSV fields: " "parameter,value_1[,value_2]."
            )

        parameter = parts[0].strip()
        value_1 = parts[1].strip()
        value_2 = parts[2].strip() if len(parts) == 3 else None

        if not parameter:
            raise ValueError("Configuration parameter cannot be empty.")

        if not value_1:
            raise ValueError(f"Value for {parameter} cannot be empty.")

        with CONFIGURATION_LOCK:
            if parameter == "weight_limit":
                if value_2 is not None:
                    raise ValueError("Unexpected second value for weight_limit.")

                value = int(value_1)

                if value <= 0:
                    raise ValueError("Weight limit must be greater than zero.")

                WEIGHT_LIMIT = value

            elif parameter == "delay":
                if value_2 is not None:
                    raise ValueError("Unexpected second value for delay.")

                value = int(value_1)

                if value <= 0:
                    raise ValueError("Delay must be greater than zero.")

                CONFIGURATION_DELAY = value

            elif parameter == "com_mode":
                if value_2 is not None:
                    raise ValueError("Unexpected second value for com_mode.")

                value = int(value_1)

                if value not in (0, 1):
                    raise ValueError("Communication mode must be 0 (GSM) or 1 (Wi-Fi).")

                COM_MODE = value

            elif parameter == "wifi_settings":
                WIFI_SETTINGS = {
                    "ssid": value_1,
                    "password": value_2 or "",
                }

            elif parameter == "bluetooth_name":
                if value_2 is not None:
                    raise ValueError("Unexpected second value for bluetooth_name.")

                BLUETOOTH_NAME = value_1

            else:
                raise ValueError(f"Unknown configuration parameter: {parameter}")

        log_message(f"CONFIGURATION UPDATED: {parameter}")

    except (ValueError, csv.Error, StopIteration) as error:
        log_message(f"INVALID CONFIGURATION COMMAND: {error}")


def send_sensor_data(
    client: socket.socket,
    stop_event: threading.Event,
) -> None:
    """
    Send simulated sensor measurements and configuration periodically.

    Each cycle sends:
        1. Sensor measurements.
        2. Current SmartPack configuration.

    Both messages are newline-delimited JSON.

    Args:
        client: Connected native RFCOMM socket.
        stop_event: Event used to signal the sending thread to stop.
    """
    weight = WEIGHT_MIN
    steps = STEPS_MIN

    weight_direction = INCREASING
    steps_direction = INCREASING

    while not stop_event.is_set():
        messages = [
            {
                "type": "sensors",
                "data": {
                    "weight": weight,
                    "steps": steps,
                },
            },
            get_configuration_message(),
        ]

        try:
            for message in messages:
                payload = (json.dumps(message) + "\n").encode("utf-8")

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


def handle_client(
    py_client: bluetooth.BluetoothSocket,
    address: tuple,
) -> None:
    """
    Handle an individual Android Bluetooth connection.

    Converts the accepted PyBluez socket into a native Python socket,
    starts a background sensor-data sender, and continuously receives
    and processes CSV configuration commands.

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

        # Receive and process newline-delimited CSV commands.
        receive_buffer = ""

        while not stop_event.is_set():
            data = client.recv(1024)

            if not data:
                log_message("DISCONNECTED: Android closed the connection.")
                break

            received = data.decode("utf-8", errors="replace")

            log_message(f"RECEIVED RAW: {received!r}")

            receive_buffer += received

            # Process every complete command in the receive buffer.
            while "\n" in receive_buffer:
                command, receive_buffer = receive_buffer.split("\n", 1)

                command = command.strip()

                if not command:
                    continue

                log_message(f"RECEIVED: {command}")

                handle_configuration_command(command)

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
