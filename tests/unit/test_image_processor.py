import pytest
from pathlib import Path
from PIL import Image
from backend.app.services.image.processor import ImageProcessor


def test_create_thumbnail(tmp_path):
    source = tmp_path / "source.jpg"
    img = Image.new("RGB", (1800, 1200), color=(100, 150, 200))
    img.save(source, "JPEG")

    thumb = tmp_path / "thumb.jpg"
    res = ImageProcessor.create_thumbnail(source, thumb, max_size=(300, 200))

    assert res.exists()
    with Image.open(thumb) as thumb_img:
        assert thumb_img.size[0] <= 300
        assert thumb_img.size[1] <= 200


def test_compose_photostrip(tmp_path):
    photos = []
    for i in range(3):
        p = tmp_path / f"p{i}.jpg"
        img = Image.new("RGB", (1200, 800), color=(50 * (i + 1), 60, 70))
        img.save(p, "JPEG")
        photos.append(p)

    out = tmp_path / "photostrip.jpg"
    result = ImageProcessor.compose_photostrip(photos, out, branding_text="TEST BOOTH")

    assert result.exists()
    with Image.open(out) as strip:
        assert strip.format == "JPEG"
        # Total width = 800 + 60 = 860
        assert strip.size[0] == 860
        # Height should accommodate 3 photos + margins + footer
        assert strip.size[1] > 1600


def test_compose_all_new_layouts(tmp_path):
    photos = []
    for i in range(4):
        p = tmp_path / f"pose_{i}.jpg"
        img = Image.new("RGB", (1200, 800), color=(40 * (i + 1), 90, 140))
        img.save(p, "JPEG")
        photos.append(p)

    # 1. Twin 2x6 Strip (Doubled)
    out_twin = tmp_path / "twin.jpg"
    ImageProcessor.compose_photostrip(
        photos[:3],
        out_twin,
        template_id="ourbooth_twin_3",
        frame_color="cream",
        customer_name="Rina & Dika",
    )
    assert out_twin.exists()
    with Image.open(out_twin) as img:
        assert img.size[0] == 860 * 2 + 20

    # 2. Vintage Cinema Ticket
    out_ticket = tmp_path / "ticket.jpg"
    ImageProcessor.compose_photostrip(
        photos,
        out_ticket,
        template_id="cinema_ticket_4",
        frame_color="burgundy",
        customer_name="Rina",
    )
    assert out_ticket.exists()

    # 3. Engagement / Wedding Gold Event Strip
    out_event = tmp_path / "event.jpg"
    ImageProcessor.compose_photostrip(
        photos[:3],
        out_event,
        template_id="engagement_event_3",
        frame_color="gold",
        customer_name="Gina & Mark",
    )
    assert out_event.exists()

    # 4. Landscape Trio
    out_land = tmp_path / "landscape.jpg"
    ImageProcessor.compose_photostrip(
        photos[:3],
        out_land,
        template_id="landscape_trio_3",
        frame_color="pink",
    )
    assert out_land.exists()

    # 5. Widescreen Recap 1-pose
    out_wide = tmp_path / "wide.jpg"
    ImageProcessor.compose_photostrip(
        photos[:1],
        out_wide,
        template_id="wide_recap_1",
        frame_color="black",
    )
    assert out_wide.exists()


def test_compose_photostrip_empty_raises(tmp_path):
    out = tmp_path / "empty.jpg"
    with pytest.raises(ValueError, match="No photo paths provided"):
        ImageProcessor.compose_photostrip([], out)
