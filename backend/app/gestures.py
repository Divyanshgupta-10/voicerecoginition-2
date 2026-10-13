from .config import load_gestures


def get_gesture(command: str):
    for gesture in load_gestures().get("gestures", []):
        if gesture["command"] == command:
            return gesture
    return None
