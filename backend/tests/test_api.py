from fastapi.testclient import TestClient
from app.main import app


def test_status_starts_in_simulator_mode():
    with TestClient(app) as client:
        response = client.get("/api/status")
        assert response.status_code == 200
        assert response.json()["mode"] == "simulator"
        assert response.json()["device"]["connected"] is True


def test_manual_command_runs_in_simulator_without_hardware():
    with TestClient(app) as client:
        response = client.post("/api/commands", json={"command": "OPEN_HAND", "source": "manual"})
        assert response.status_code == 200
        assert response.json()["command"] == "OPEN_HAND"
        assert response.json()["result"] == "simulated"


def test_calibration_enforces_safe_range():
    with TestClient(app) as client:
        assert client.post("/api/calibration", json={"finger": "index", "angle": 80}).status_code == 200
        assert client.post("/api/calibration", json={"finger": "index", "angle": 180}).status_code == 422

