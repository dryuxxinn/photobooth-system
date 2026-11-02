from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

def test_full_photobooth_e2e_simulation(test_client: TestClient):
    """
    Simulates the exact end-to-end user experience on the iPad Kiosk:
    1. Kiosk checks health and camera readiness.
    2. Customer initiates a 3-photo booth session.
    3. Three sequential captures occur (with countdowns on iPad).
    4. Photos are stored in captures/ and thumbnails/ folders.
    5. Photostrip is automatically compiled in processed/ folder.
    6. Customer previews the strip.
    7. Customer confirms and session completes, leaving system ready for the next customer.
    """
    # Step 1: Health & Camera Check
    health = test_client.get("/health")
    assert health.status_code == 200
    assert health.json()["session_state"] == "IDLE"

    cam_status = test_client.get("/camera/status")
    assert cam_status.status_code == 200
    assert cam_status.json()["connected"] is True

    # Step 2: Start Session for 3 photos
    start = test_client.post(
        "/session/start",
        json={
            "customer_name": "Dryu Customer 1",
            "photos_required": 3,
            "template_id": "classic_strip_3"
        }
    )
    assert start.status_code == 201
    session_id = start.json()["session_id"]
    assert start.json()["status"] == "STARTED"

    # Step 3: Sequential Captures
    for photo_idx in range(1, 4):
        cap = test_client.post(f"/session/{session_id}/capture")
        assert cap.status_code == 200
        photo_info = cap.json()
        assert photo_info["index"] == photo_idx

        # Verify physical files exist on disk
        orig_file = Path(photo_info["original_path"])
        thumb_file = Path(photo_info["thumbnail_path"])
        assert orig_file.exists(), f"Original capture file {orig_file} does not exist!"
        assert thumb_file.exists(), f"Thumbnail file {thumb_file} does not exist!"

        # Verify thumbnail is actually a valid image
        with Image.open(thumb_file) as t_img:
            assert t_img.size[0] <= 400

    # Step 4: Verify Session is now in PREVIEW state and photostrip is ready
    session_info = test_client.get(f"/session/{session_id}").json()
    assert session_info["status"] == "PREVIEW"
    assert session_info["photos_taken"] == 3

    processed_path = Path(session_info["processed_image_path"])
    assert processed_path.exists(), "Compiled photostrip file was not created!"

    with Image.open(processed_path) as strip_img:
        assert strip_img.format == "JPEG"
        assert strip_img.size[0] == 860  # Width conforming to photostrip spec

    # Step 5: Customer completes session
    complete = test_client.post(f"/session/{session_id}/complete")
    assert complete.status_code == 200

    # Step 6: System is back in IDLE
    final_health = test_client.get("/health").json()
    assert final_health["session_state"] == "IDLE"
