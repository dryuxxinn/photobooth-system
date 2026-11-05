from fastapi.testclient import TestClient

def test_get_camera_status(test_client: TestClient):
    response = test_client.get("/camera/status")
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True
    assert data["driver"] in ("simulation", "wifi")

def test_capture_test_photo(test_client: TestClient):
    response = test_client.post("/camera/capture")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "file_path" in data
    assert data["width"] == 1800
    assert data["height"] == 1200

def test_camera_disconnect_and_connect(test_client: TestClient):
    # Disconnect
    dis_res = test_client.post("/camera/disconnect")
    assert dis_res.status_code == 200

    # Status should report disconnected
    status_res = test_client.get("/camera/status")
    assert status_res.json()["connected"] is False

    # Capture should fail with 503
    cap_res = test_client.post("/camera/capture")
    assert cap_res.status_code == 503

    # Reconnect
    con_res = test_client.post("/camera/connect")
    assert con_res.status_code == 200

    # Status should report connected
    status_res = test_client.get("/camera/status")
    assert status_res.json()["connected"] is True


def test_camera_config_switch_to_wifi_and_back(test_client: TestClient):
    # Switch runtime driver to Sony a6400 Wi-Fi
    cfg_res = test_client.post(
        "/camera/config",
        json={
            "driver": "wifi",
            "model": "Sony Alpha a6400 (Wi-Fi)",
            "wifi_ip": "192.168.122.1",
            "wifi_port": 8080,
            "wifi_protocol": "sony_http",
        },
    )
    assert cfg_res.status_code == 200
    data = cfg_res.json()
    assert data["driver"] == "wifi"
    assert data["model"] == "Sony Alpha a6400 (Wi-Fi)"
    assert data["wifi_ip"] == "192.168.122.1"
    assert data["wifi_protocol"] == "sony_http"
    assert data["connected"] is True

    # Test capture in Wi-Fi mode (uses simulation fallback when physical Sony is offline)
    cap_res = test_client.post("/camera/capture")
    assert cap_res.status_code == 200
    assert cap_res.json()["success"] is True

    # Switch back to simulation
    back_res = test_client.post(
        "/camera/config",
        json={
            "driver": "simulation",
            "model": "Canon EOS 700D",
        },
    )
    assert back_res.status_code == 200
    assert back_res.json()["driver"] == "simulation"
