import pytest
from pathlib import Path
from PIL import Image
from backend.app.services.camera.simulated import SimulatedCamera

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
