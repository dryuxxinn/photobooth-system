import io
import pytest
from pathlib import Path
from PIL import Image
from backend.app.services.camera.simulated import SimulatedCamera
from backend.app.services.camera.wifi import WifiCamera

def test_simulated_camera_connection():
    camera = SimulatedCamera(capture_delay=0.0)
    assert camera.is_connected() is True

    status = camera.get_status()
    assert status["connected"] is True
    assert status["driver"] == "simulation"

    camera.disconnect()
    assert camera.is_connected() is False
    assert camera.get_status()["connected"] is False

    camera.connect()
    assert camera.is_connected() is True

def test_simulated_camera_capture(tmp_path):
    camera = SimulatedCamera(capture_delay=0.0)
    target_file = tmp_path / "test_photo.jpg"

    result = camera.capture_image(target_file)
    assert result["success"] is True
    assert target_file.exists()
    assert result["width"] == 1800
    assert result["height"] == 1200
    assert result["capture_number"] == 1

    # Verify that the generated file is a valid image with matching dimensions
    with Image.open(target_file) as img:
        assert img.format == "JPEG"
        assert img.size == (1800, 1200)

def test_capture_when_disconnected(tmp_path):
    camera = SimulatedCamera(capture_delay=0.0)
    camera.disconnect()
    target_file = tmp_path / "fail.jpg"

    with pytest.raises(RuntimeError, match="disconnected"):
        camera.capture_image(target_file)

def test_capture_when_hardware_failure_simulated(tmp_path):
    camera = SimulatedCamera(capture_delay=0.0)
    camera.set_simulate_failure(True)
    target_file = tmp_path / "fail.jpg"

    with pytest.raises(RuntimeError, match="Simulated camera hardware capture failure"):
        camera.capture_image(target_file)


def test_wifi_camera_fallback_and_status(tmp_path):
    camera = WifiCamera(
        model_name="Sony Alpha a6400 (Wi-Fi)",
        wifi_ip="192.168.122.1",
        wifi_port=8080,
        protocol="sony_http",
        timeout=0.2,
        allow_simulation_fallback=True,
    )
    assert camera.connect() is True
    status = camera.get_status()
    assert status["connected"] is True
    assert status["driver"] == "wifi"
    assert status["wifi_ip"] == "192.168.122.1"
    assert status["wifi_protocol"] == "sony_http"

    target_file = tmp_path / "wifi_fallback.jpg"
    res = camera.capture_image(target_file)
    assert res["success"] is True
    assert target_file.exists()
    assert res["wifi_ip"] == "192.168.122.1"


def test_wifi_camera_sony_http_mocked_capture(tmp_path, monkeypatch):
    camera = WifiCamera(
        model_name="Sony Alpha a6400",
        wifi_ip="192.168.122.1",
        wifi_port=8080,
        protocol="sony_http",
        allow_simulation_fallback=False,
    )

    def fake_sony_rpc(method: str, params=None, version="1.0", port_override=None, timeout_override=None):
        if method == "getVersions":
            return {"result": [["1.0"]], "id": 1}
        if method == "getAvailableApiList":
            return {"result": [["getVersions", "actHalfPressShutter", "actTakePicture", "cancelHalfPressShutter"]], "id": 1}
        if method == "startRecMode":
            return {"result": [0], "id": 1}
        if method in ("actHalfPressShutter", "cancelHalfPressShutter"):
            return {"result": [], "id": 1}
        if method == "startLiveview":
            return {"result": ["http://192.168.122.1:60152/liveviewstream"], "id": 1}
        if method == "actTakePicture":
            return {
                "result": [["http://192.168.122.1:60152/pict0001.JPG"]],
                "id": 1,
            }
        raise AssertionError(f"Unexpected RPC method {method}")

    buf = io.BytesIO()
    Image.new("RGB", (1800, 1200), (120, 160, 210)).save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def read(self):
            return jpeg_bytes

    monkeypatch.setattr(camera, "_sony_rpc", fake_sony_rpc)
    monkeypatch.setattr("urllib.request.urlopen", lambda url, timeout=10.0: DummyResponse())

    assert camera.connect() is True
    assert camera.hardware_reachable is True

    target_file = tmp_path / "sony_a6400.jpg"
    res = camera.capture_image(target_file)
    assert res["success"] is True
    assert res["protocol"] == "sony_http"
    assert res["width"] == 1800
    assert res["height"] == 1200
    assert target_file.exists()
