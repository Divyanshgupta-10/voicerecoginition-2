"""Phrase matching with whole-word aliases and conservative ambiguity handling."""
import re
import unicodedata


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return " ".join(re.findall(r"[a-z0-9]+", text))


def match_command(text: str, gestures: dict) -> tuple[str | None, str | None]:
    normalized = f" {normalize(text)} "
    matches = []
    for gesture in gestures.get("gestures", []):
        for phrase in gesture.get("phrases", []):
            alias = normalize(phrase)
            if alias and f" {alias} " in normalized:
                matches.append((len(alias.split()), gesture["command"]))
    if not matches:
        return None, None
    longest = max(length for length, _ in matches)
    commands = {command for length, command in matches if length == longest}
    if len(commands) != 1:
        return None, "ambiguous"
    return commands.pop(), None

