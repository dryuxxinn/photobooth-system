import pytest
from PIL import Image
from pathlib import Path

from backend.app.services.ar.detector import FaceDetector
from backend.app.services.ar.engine import StickerEngine
from backend.app.services.ar.models import EffectInstance


@pytest.fixture
def test_image():
    """Create a synthetic 800x1000 portrait test image."""
    return Image.new("RGB", (800, 1000), color=(250, 235, 230))


@pytest.fixture
def ar_engine():
    return StickerEngine()


def test_detector_initialization():
    detector = FaceDetector()
    assert detector is not None
    assert detector.model_path.exists(), f"Landmarker model task file should exist at {detector.model_path}"


def test_detector_detect_faces_fallback(test_image):
    detector = FaceDetector()
    faces = detector.detect_faces(test_image)
    assert len(faces) >= 1
    face = faces[0]
    assert face.face_id == 0
    # Check that all 11 anchors are populated
    for anchor_name in [
        "head_top",
        "forehead",
        "eyes_center",
        "left_eye",
        "right_eye",
        "nose",
        "left_cheek",
        "right_cheek",
        "mouth",
        "chin",
        "face_center",
    ]:
        coords = getattr(face.anchors, anchor_name)
        assert len(coords) == 2
        assert 0.0 <= coords[0] <= 1.0
        assert 0.0 <= coords[1] <= 1.0


def test_engine_load_manifest(ar_engine):
    assert len(ar_engine.assets) >= 10
    assert len(ar_engine.presets) >= 5

    # Check that required presets exist
    for pid in [
        "pink_bunny_sweet",
        "cute_glasses_blush",
        "kitty_whiskers",
        "royal_princess",
        "sakura_fairy",
    ]:
        preset = ar_engine.get_preset(pid)
        assert preset is not None
        assert preset.id == pid
        assert len(preset.asset_ids) >= 2


def test_engine_get_assets_filter(ar_engine):
    all_assets = ar_engine.get_assets()
    assert len(all_assets) >= 10

    face_acc = ar_engine.get_assets(category="face-accessories")
    assert len(face_acc) >= 3
    for a in face_acc:
        assert a.category == "face-accessories"

    floating = ar_engine.get_assets(category="floating")
    assert len(floating) >= 1


def test_engine_render_effects_face_anchored(ar_engine, test_image):
    effects = [
        EffectInstance(asset_id="pink_bunny", anchor="head_top", scale=1.0),
        EffectInstance(asset_id="pastel_blush", anchor="left_cheek", scale=0.8),
    ]
    orig_copy = test_image.copy()
    rendered = ar_engine.render_effects(test_image, effects=effects, seed=123)

    assert rendered is not None
    assert rendered.size == test_image.size
    # Verify non-destructive behavior: original test_image was not modified
    assert test_image.tobytes() == orig_copy.tobytes()


def test_engine_render_effects_random_scatter(ar_engine, test_image):
    effects = [
        EffectInstance(asset_id="floating_stars", scale=0.8),
    ]
    rendered1 = ar_engine.render_effects(test_image, effects=effects, seed=42)
    rendered2 = ar_engine.render_effects(test_image, effects=effects, seed=42)
    # Deterministic scatter: same seed must produce identical pixel output
    assert rendered1.tobytes() == rendered2.tobytes()


def test_engine_render_all_presets(ar_engine, test_image):
    for pid in [
        "pink_bunny_sweet",
        "cute_glasses_blush",
        "kitty_whiskers",
        "royal_princess",
        "sakura_fairy",
    ]:
        rendered = ar_engine.render_preset(test_image, preset_id=pid, seed=100)
        assert rendered is not None
        assert rendered.size == test_image.size


def test_engine_color_grading_inheritance(ar_engine, test_image):
    """Verify Section 13.5: filter_name='bw' makes photo grayscale while inherit_color_grading=False keeps AR stickers colorful."""
    # Render pink_bunny_sweet with bw filter and inherit_color_grading=False (default)
    rendered_vibrant = ar_engine.render_preset(
        test_image,
        preset_id="pink_bunny_sweet",
        seed=100,
        filter_name="bw",
        inherit_color_grading=False,
    )
    # Render pink_bunny_sweet with bw filter and inherit_color_grading=True
    rendered_inherited = ar_engine.render_preset(
        test_image,
        preset_id="pink_bunny_sweet",
        seed=100,
        filter_name="bw",
        inherit_color_grading=True,
    )
    assert rendered_vibrant.size == test_image.size
    assert rendered_inherited.size == test_image.size
    # When inherit_color_grading=True under 'bw', every pixel must have R == G == B (grayscale)
    r, g, b = rendered_inherited.split()
    assert r.tobytes() == g.tobytes() == b.tobytes()
    # When inherit_color_grading=False under 'bw', pink stickers introduce color differences (R != G)
    rv, gv, _ = rendered_vibrant.split()
    assert rv.tobytes() != gv.tobytes()
