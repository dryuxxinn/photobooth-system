import base64
import io
from PIL import Image
from fastapi.testclient import TestClient

def test_session_api_flow(test_client: TestClient):
    # 1. Initially no active session
    curr_res = test_client.get("/session/current")
    assert curr_res.status_code == 200
    assert curr_res.json()["active"] is False

    # 2. Start session
    start_res = test_client.post(
        "/session/start",
        json={"customer_name": "Alice", "photos_required": 2, "template_id": "strip_2"}
    )
    assert start_res.status_code == 201
    session_data = start_res.json()
    session_id = session_data["session_id"]
    assert session_data["status"] == "STARTED"
    assert session_data["photos_required"] == 2

    # 3. Check current session
    curr_res2 = test_client.get("/session/current")
    assert curr_res2.status_code == 200
    assert curr_res2.json()["active"] is True
    assert curr_res2.json()["session"]["session_id"] == session_id

    # 4. Capture first photo
    cap1 = test_client.post(f"/session/{session_id}/capture")
    assert cap1.status_code == 200
    assert cap1.json()["index"] == 1
    assert cap1.json()["preview_url"].startswith("/storage/thumbnails/preview_")

    # 5. Capture second photo (quota reached, auto processes to PREVIEW)
    cap2 = test_client.post(f"/session/{session_id}/capture")
    assert cap2.status_code == 200
    assert cap2.json()["index"] == 2

    # Check session details (should now be in PREVIEW)
    detail_res = test_client.get(f"/session/{session_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["status"] == "PREVIEW"
    assert detail_res.json()["processed_image_path"] is not None

    # 6. Complete session
    comp_res = test_client.post(f"/session/{session_id}/complete")
    assert comp_res.status_code == 200

    # 7. Back to IDLE
    curr_after = test_client.get("/session/current")
    assert curr_after.json()["active"] is False

def test_session_capture_with_webcam_image_data(test_client: TestClient):
    start = test_client.post(
        "/session/start",
        json={"customer_name": "Webcam Tester", "photos_required": 1, "template_id": "single_frame_1"}
    )
    assert start.status_code == 201
    session_id = start.json()["session_id"]

    buf = io.BytesIO()
    Image.new("RGB", (640, 480), color=(246, 201, 210)).save(buf, format="JPEG")
    data_url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    cap = test_client.post(
        f"/session/{session_id}/capture",
        json={"image_data": data_url},
    )
    assert cap.status_code == 200
    assert cap.json()["index"] == 1

    detail = test_client.get(f"/session/{session_id}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "PREVIEW"
    test_client.post(f"/session/{session_id}/complete")

def test_session_retake_photo(test_client: TestClient):
    start = test_client.post(
        "/session/start",
        json={"customer_name": "Retake Tester", "photos_required": 2, "template_id": "solo_duo_2"}
    )
    assert start.status_code == 201
    session_id = start.json()["session_id"]

    # 1. Capture pose 1
    cap1 = test_client.post(f"/session/{session_id}/capture")
    assert cap1.status_code == 200
    assert cap1.json()["index"] == 1

    # 2. Retake pose 1
    retake = test_client.post(f"/session/{session_id}/retake")
    assert retake.status_code == 200
    assert retake.json()["photos_taken"] == 0
    assert retake.json()["status"] == "CAPTURING"

    # 3. Capture pose 1 again
    cap1_again = test_client.post(f"/session/{session_id}/capture")
    assert cap1_again.status_code == 200
    assert cap1_again.json()["index"] == 1

    # 4. Capture pose 2 (completes session to PREVIEW)
    cap2 = test_client.post(f"/session/{session_id}/capture")
    assert cap2.status_code == 200
    assert cap2.json()["index"] == 2

    # 5. Retake pose 2 from PREVIEW
    retake2 = test_client.post(f"/session/{session_id}/retake")
    assert retake2.status_code == 200
    assert retake2.json()["photos_taken"] == 1
    assert retake2.json()["status"] == "CAPTURING"

    # Complete or abort
    test_client.post(f"/session/{session_id}/abort")

def test_session_conflict_on_start(test_client: TestClient):
    # Start session 1
    res1 = test_client.post("/session/start", json={"photos_required": 3})
    assert res1.status_code == 201

    # Attempting to start another session while active returns 409 Conflict
    res2 = test_client.post("/session/start", json={"photos_required": 3})
    assert res2.status_code == 409

def test_session_abort(test_client: TestClient):
    start = test_client.post("/session/start", json={"photos_required": 3})
    session_id = start.json()["session_id"]

    abort = test_client.post(f"/session/{session_id}/abort")
    assert abort.status_code == 200

    curr = test_client.get("/session/current")
    assert curr.json()["active"] is False
