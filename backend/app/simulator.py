"""A deterministic, safe stand-in for the serial robotic hand."""
from datetime import datetime, timezone


class HandSimulator:
    def __init__(self):
        self.connected = True
        self.fingers = {"thumb": 20, "index": 20, "middle": 20, "ring": 20, "pinky": 20}
        self.last_command = None
        self.last_seen = datetime.now(timezone.utc).isoformat()

    def execute(self, gesture):
        self.fingers.update(gesture["fingers"])
        self.last_command = gesture["command"]
        self.last_seen = datetime.now(timezone.utc).isoformat()
        return {"mode": "simulator", "command": self.last_command, "fingers": self.fingers.copy()}

    def set_finger(self, finger, angle):
        self.fingers[finger] = angle
        self.last_seen = datetime.now(timezone.utc).isoformat()
        return self.fingers.copy()

    def status(self):
        return {"connected": self.connected, "mode": "simulator", "port": "Virtual device", "fingers": self.fingers.copy(), "last_seen": self.last_seen}
