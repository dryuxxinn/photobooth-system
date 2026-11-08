import base64
import io
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

from backend.app.core.config import settings


def _generate_test_image_b64(width: int = 640, height: int = 480) -> str:
    im = Image.new("RGB", (width, height), color=(255, 230, 235))
    buf = io.BytesIO()
    im.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def test_get_ar_assets(test_client: TestClient):
    res = test_client.get("/ar/assets")
    assert res.status_code == 200
    assets = res.json()
    assert isinstance(assets, list)
    assert len(assets) >= 10
    # Check fields
    first = assets[0]
    assert "id" in first
    assert "name" in first
    assert "category" in first
    assert "preview_url" in first


def test_get_ar_assets_category_filter(test_client: TestClient):
    res = test_client.get("/ar/assets?category=face-accessories")
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) >= 3
    for a in assets:
        assert a["category"] == "face-accessories"


def test_get_ar_presets(test_client: TestClient):
    res = test_client.get("/ar/presets")
    assert res.status_code == 200
    presets = res.json()
    assert len(presets) >= 5
    ids = [p["id"] for p in presets]
    assert "pink_bunny_sweet" in ids
    assert "cute_glasses_blush" in ids
    assert "kitty_whiskers" in ids
    assert "royal_princess" in ids
    assert "sakura_fairy" in ids


def test_get_ar_preset_detail(test_client: TestClient):
    res = test_client.get("/ar/presets/pink_bunny_sweet")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "pink_bunny_sweet"
    assert "pink_bunny" in data["asset_ids"]

    # 404 for unknown preset
    res404 = test_client.get("/ar/presets/unknown_preset_xyz")
    assert res404.status_code == 404


def test_post_ar_analyze(test_client: TestClient):
    b64_img = _generate_test_image_b64()
    res = test_client.post("/ar/analyze", json={"image_data": b64_img})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["image_width"] == 640
    assert data["image_height"] == 480
    assert data["faces_detected"] >= 1
    assert len(data["faces"]) >= 1
    face = data["faces"][0]
    assert "anchors" in face
    assert "head_top" in face["anchors"]


def test_post_ar_preview(test_client: TestClient):
    b64_img = _generate_test_image_b64()
    res = test_client.post(
        "/ar/preview",
        json={"image_data": b64_img, "preset_id": "pink_bunny_sweet", "seed": 42},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["rendered_image_url"].startswith("/storage/processed/preview_ar_")
    assert data["effects_applied"] >= 1


def test_post_ar_render(test_client: TestClient):
    b64_img = _generate_test_image_b64()
    res = test_client.post(
        "/ar/render",
        json={"image_data": b64_img, "preset_id": "cute_glasses_blush", "seed": 77},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["rendered_image_url"].startswith("/storage/processed/ar_")
    # Verify rendered file exists on disk
    filename = data["rendered_image_url"].replace("/storage/processed/", "")
    file_path = settings.PROCESSED_DIR / filename
    assert file_path.exists()
    assert file_path.stat().st_size > 0


def test_session_integration_with_ar_preset(test_client: TestClient):
    # 1. Start a session with an AR preset
    start_res = test_client.post(
        "/session/start",
        json={
            "customer_name": "AR Tester",
            "photos_required": 2,
            "template_id": "strip_2",
            "frame_color": "pink",
            "ar_preset_id": "pink_bunny_sweet",
        },
    )
    assert start_res.status_code == 201
    sess_id = start_res.json()["session_id"]
    assert start_res.json()["ar_preset_id"] == "pink_bunny_sweet"

    # 2. Capture 2 photos
    b64_img = _generate_test_image_b64()
    cap1 = test_client.post(f"/session/{sess_id}/capture", json={"image_data": b64_img})
    assert cap1.status_code == 200
    cap2 = test_client.post(f"/session/{sess_id}/capture", json={"image_data": b64_img})
    assert cap2.status_code == 200

    # 3. Process session with a different AR preset
    proc_res = test_client.post(
        "/image/process",
        json={
            "session_id": sess_id,
            "ar_preset_id": "royal_princess",
            "frame_color": "lavender",
        },
    )
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["ar_preset_id"] == "royal_princess"
    assert proc_data["frame_color"] == "lavender"
    assert proc_data["processed_image_path"] is not None

    # Check strip was written
    strip_p = Path(proc_data["processed_image_path"])
    assert strip_p.exists()

    # 4. Clean up / complete session
    comp = test_client.post(f"/session/{sess_id}/complete")
    assert comp.status_code == 200
