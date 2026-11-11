from fastapi.testclient import TestClient


def test_printer_status_and_templates(test_client: TestClient):
    prn_res = test_client.get("/printer/status")
    assert prn_res.status_code == 200
    assert prn_res.json()["ready"] is True
    assert prn_res.json()["driver"] == "simulation"

    tpl_res = test_client.get("/templates")
    assert tpl_res.status_code == 200
    assert len(tpl_res.json()["templates"]) >= 3


def test_session_print_and_sqlite_history(test_client: TestClient):
    # Start 2-photo session
    start_res = test_client.post(
        "/session/start",
        json={"customer_name": "Budi", "photos_required": 2, "template_id": "classic_strip_3"},
    )
    assert start_res.status_code == 201
    session_id = start_res.json()["session_id"]

    # Capture 2 photos
    test_client.post(f"/session/{session_id}/capture")
    test_client.post(f"/session/{session_id}/capture")

    # Apply B&W filter via POST /image/process
    proc_res = test_client.post(
        "/image/process",
        json={"session_id": session_id, "filter_name": "bw"},
    )
    assert proc_res.status_code == 200
    assert proc_res.json()["filter_name"] == "bw"
    assert proc_res.json()["status"] == "PREVIEW"

    # Print 2 copies via POST /print
    print_res = test_client.post(
        "/print",
        json={"session_id": session_id, "copies": 2},
    )
    assert print_res.status_code == 200
    assert print_res.json()["success"] is True
    assert print_res.json()["print_job"]["copies"] == 2

    # Session is now completed and system is back to IDLE
    curr_res = test_client.get("/session/current")
    assert curr_res.json()["active"] is False

    # Verify session was persisted in SQLite history
    hist_res = test_client.get("/session/history")
    assert hist_res.status_code == 200
    sessions = hist_res.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["session_id"] == session_id
    assert sessions[0]["customer_name"] == "Budi"
    assert sessions[0]["photos_taken"] == 2

    # Verify print job was recorded in SQLite
    jobs_res = test_client.get("/printer/jobs")
    assert jobs_res.status_code == 200
    assert len(jobs_res.json()["jobs"]) == 1


def test_gif_generation_overlay_payment_and_liveview(test_client: TestClient):
    import base64
    import io
    from PIL import Image

    # 1. Live view preview frame endpoint
    frame_res = test_client.get("/camera/preview-frame")
    assert frame_res.status_code == 200
    assert frame_res.headers["content-type"] == "image/jpeg"
    assert len(frame_res.content) > 500

    # 2. Custom PNG overlay upload & delete
    png_buf = io.BytesIO()
    overlay_img = Image.new("RGBA", (200, 400), (255, 192, 203, 90))
    overlay_img.save(png_buf, format="PNG")
    b64_png = "data:image/png;base64," + base64.b64encode(png_buf.getvalue()).decode("ascii")

    up_res = test_client.post(
        "/templates/classic_strip_3/overlay",
        json={"image_data": b64_png},
    )
    assert up_res.status_code == 200
    assert up_res.json()["success"] is True

    del_res = test_client.delete("/templates/classic_strip_3/overlay")
    assert del_res.status_code == 200
    assert del_res.json()["removed"] is True

    # 3. Payment QRIS (Production DOKU API + Webhook Notification) & Voucher verification
    from unittest.mock import patch

    with patch("backend.app.services.payment.doku.DokuPaymentService.is_configured", True), patch(
        "backend.app.services.payment.doku.DokuPaymentService._call_doku_post",
        return_value={"qris_data": {"qr_content": "00020101021226580014ID.CO.QRIS.WWW"}},
    ):
        qris_res = test_client.post("/session/payment/qris", json={"amount": 35000})
        assert qris_res.status_code == 200
        tx_id = qris_res.json()["transaction_id"]
        assert qris_res.json()["status"] == "PENDING"
        assert qris_res.json()["provider"] == "DOKU"

        notify_res = test_client.post(
            "/payment/doku/notify",
            json={
                "order": {"invoice_number": tx_id, "amount": 35000},
                "transaction": {"status": "SUCCESS"},
            },
        )
        assert notify_res.status_code == 200
        status_res = test_client.get(f"/session/payment/qris/{tx_id}")
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "PAID"

    v_ok = test_client.post("/session/payment/voucher", json={"code": "sweet2026"})
    assert v_ok.status_code == 200
    assert v_ok.json()["valid"] is True

    v_bad = test_client.post("/session/payment/voucher", json={"code": "INVALIDCODE"})
    assert v_bad.status_code == 400

    # 4. Dynamic Operator Config (sessionPriceIdr & voucherCodes persisted in SQLite)
    cfg_res = test_client.post(
        "/session/config",
        json={"sessionPriceIdr": 15000, "requirePayment": True, "voucherCodes": ["PROMO15K"]},
    )
    assert cfg_res.status_code == 200
    assert cfg_res.json()["sessionPriceIdr"] == 15000

    get_cfg = test_client.get("/session/config")
    assert get_cfg.status_code == 200
    assert get_cfg.json()["sessionPriceIdr"] == 15000

    with patch("backend.app.services.payment.doku.DokuPaymentService.is_configured", True), patch(
        "backend.app.services.payment.doku.DokuPaymentService._call_doku_post",
        return_value={"qris_data": {"qr_content": "00020101021226580014ID.CO.QRIS.WWW"}},
    ):
        dynamic_qris = test_client.post("/session/payment/qris", json={})
        assert dynamic_qris.status_code == 200
        assert dynamic_qris.json()["amount"] == 15000

    v_dyn = test_client.post("/session/payment/voucher", json={"code": "promo15k"})
    assert v_dyn.status_code == 200
    assert v_dyn.json()["valid"] is True
