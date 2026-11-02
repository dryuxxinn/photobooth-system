from fastapi.testclient import TestClient

def test_get_camera_status(test_client: TestClient):
    response = test_client.get("/camera/status")
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True
    assert data["driver"] == "simulation"
    assert "Canon" in data["model"]

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
