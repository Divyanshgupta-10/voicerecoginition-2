"""USB serial transport for the HandControl ESP32 line protocol."""
import time
import threading


class SerialController:
    def __init__(self):
        self.connection = None
        self.port = None
        self.board_ready = False
        self.lock = threading.Lock()

    def connect(self, port: str, baud: int = 115200):
        connection = None
        try:
            import serial
            connection = serial.Serial(port, baud, timeout=0.5, write_timeout=1)
            # Opening USB serial often resets the ESP32. Wait for firmware and
            # its servo driver before enabling commands in the dashboard.
            deadline = time.monotonic() + 6
            last_message = ""
            ready = False
            while time.monotonic() < deadline:
                last_message = connection.readline().decode("ascii", errors="replace").strip()
                if last_message.startswith("READY HandControl PCA9685"):
                    ready = True
                    break
                if last_message.startswith("ERR PCA9685"):
                    raise RuntimeError(f"ESP32 found, but {last_message}. Check I2C wiring and address 0x40.")
            if not ready:
                raise RuntimeError(f"No HandControl READY response from {port}. Upload the project firmware and verify the PCA9685 connection. Last message: {last_message or 'none'}")
            self.connection = connection
            self.port = port
            self.board_ready = True
            return True
        except Exception:
            if connection and connection.is_open:
                connection.close()
            self.connection = None
            self.port = None
            self.board_ready = False
            raise

    def disconnect(self):
        if self.connection and self.connection.is_open:
            self.connection.close()
        self.connection = None
        self.port = None
        self.board_ready = False

    def send_command(self, command: str):
        with self.lock:
            self._send_and_confirm(command, command.split()[1] if command.startswith("POSE ") else None)

    def _send_and_confirm(self, line: str, expected_id: str | None):
        if not self.connection or not self.connection.is_open:
            raise RuntimeError("No serial device is connected")
        self.connection.reset_input_buffer()
        self.connection.write((line + "\n").encode("ascii"))
        self.connection.flush()
        deadline = time.monotonic() + 2.0
        while time.monotonic() < deadline:
            response = self.connection.readline().decode("ascii", errors="replace").strip()
            if not response:
                continue
            if response.startswith("ERR "):
                raise RuntimeError(f"ESP32 rejected command: {response}")
            if expected_id and response == f"OK {expected_id}":
                return
            if response.startswith("OK SET "):
                return
        raise RuntimeError("ESP32 did not acknowledge the command within 2 seconds")

    def send_gesture(self, gesture: dict):
        """Send the command and its five configured servo positions."""
        order = ("thumb", "index", "middle", "ring", "pinky")
        positions = [int(gesture["fingers"][finger]) for finger in order]
        line = f"POSE {gesture['command']} " + " ".join(map(str, positions))
        with self.lock:
            self._send_and_confirm(line, gesture["command"])

    def set_finger(self, finger: str, angle: int):
        with self.lock:
            self._send_and_confirm(f"SET {finger.upper()} {angle}", None)

    def status(self):
        return {"connected": bool(self.connection and self.connection.is_open), "ready": self.board_ready,
                "port": self.port, "mode": "hardware"}
