from app.commands import match_command


def test_matches_case_and_surrounding_words():
    gestures = {"gestures": [{"command": "OPEN_HAND", "phrases": ["open hand"]}]}
    assert match_command("Please OPEN HAND now", gestures) == ("OPEN_HAND", None)


def test_no_partial_word_match():
    gestures = {"gestures": [{"command": "NO", "phrases": ["no"]}]}
    assert match_command("knowledge", gestures) == (None, None)


def test_ambiguous_longest_alias_is_rejected():
    gestures = {"gestures": [
        {"command": "ONE", "phrases": ["open hand"]},
        {"command": "TWO", "phrases": ["open hand"]},
    ]}
    assert match_command("open hand", gestures) == (None, "ambiguous")
