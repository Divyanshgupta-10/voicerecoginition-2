"""Configuration and paths for the robotic hand backend."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = ROOT / "config"
GESTURES_FILE = CONFIG_DIR / "gestures.json"
SETTINGS_FILE = CONFIG_DIR / "settings.json"
MODEL_DIR = ROOT / "models" / "vosk-model-small-en-us-0.15"


def load_settings():
    """Load user settings, falling back to the checked-in example."""
    source = SETTINGS_FILE if SETTINGS_FILE.exists() else CONFIG_DIR / "settings.example.json"
    with source.open(encoding="utf-8") as handle:
        settings = json.load(handle)
    model_path = Path(os.getenv("VOSK_MODEL_PATH", str(MODEL_DIR)))
    if not model_path.is_absolute():
        model_path = ROOT / model_path
    settings["model_path"] = str(model_path.resolve())
    settings["serial_port"] = os.getenv("HAND_SERIAL_PORT", settings.get("serial_port", ""))
    return settings


def load_gestures():
    with GESTURES_FILE.open(encoding="utf-8") as handle:
        return json.load(handle)


def save_gestures(data):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with GESTURES_FILE.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
