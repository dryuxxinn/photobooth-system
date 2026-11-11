from fastapi.testclient import TestClient


def test_custom_filters_api(test_client: TestClient):
    # 1. Login as admin to get token
    login = test_client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    admin_token = login.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Get presets list
    presets_res = test_client.get("/filters/presets")
    assert presets_res.status_code == 200
    assert "presets" in presets_res.json()

    # 3. Create a custom preset
    create_res = test_client.post(
        "/filters/presets",
        headers=admin_headers,
        json={
            "name": "Korean Warm Latte",
            "brightness": 1.08,
            "contrast": 1.15,
            "saturation": 1.12,
            "temperature": 1.15,
            "tint": 1.02,
            "smoothness": 0.30,
        },
    )
    assert create_res.status_code == 200
    preset_data = create_res.json()["preset"]
    preset_id = preset_data["id"]
    assert preset_data["name"] == "Korean Warm Latte"
    assert preset_data["brightness"] == 1.08

    # 4. Preview filter with parameters
    prev_res = test_client.post(
        "/filters/preview",
        json={
            "brightness": 1.10,
            "contrast": 1.15,
            "saturation": 1.10,
            "temperature": 1.12,
            "tint": 1.0,
            "smoothness": 0.20,
        },
    )
    assert prev_res.status_code == 200
    assert prev_res.json()["preview_url"].startswith("data:image/jpeg;base64,")

    # 5. Delete preset
    del_res = test_client.delete(f"/filters/presets/{preset_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_finance_settlement_and_exports(test_client: TestClient):
    login = test_client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    admin_token = login.json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Get rules
    rules_res = test_client.get("/finance/rules")
    assert rules_res.status_code == 200
    assert "rules" in rules_res.json()

    # 2. Add custom deduction rule
    add_rule = test_client.post(
        "/finance/rules",
        headers=admin_headers,
        json={
            "name": "Biaya Pemeliharaan Harian",
            "basis": "PER_SETTLEMENT",
            "deduction_type": "FIXED",
            "value": 50000.0,
            "min_threshold": 100000.0,
        },
    )
    assert add_rule.status_code == 200
    rule_id = add_rule.json()["rule"]["id"]

    # 3. Calculate settlement
    calc_res = test_client.post(
        "/finance/settlement-calculate",
        json={},
    )
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert "gross_revenue" in calc_data
    assert "total_deductions" in calc_data
    assert "net_profit" in calc_data
    assert "net_margin_pct" in calc_data
    assert "deductions_breakdown" in calc_data

    # 4. Export Excel (.xlsx)
    excel_res = test_client.post("/finance/export/excel", json={})
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 1000
    assert "application/vnd.openxmlformats" in excel_res.headers["content-type"]

    # 5. Export PDF (.pdf)
    pdf_res = test_client.post("/finance/export/pdf", json={})
    assert pdf_res.status_code == 200
    assert len(pdf_res.content) > 500
    assert "application/pdf" in pdf_res.headers["content-type"]

    # 6. Delete test rule
    del_rule = test_client.delete(f"/finance/rules/{rule_id}", headers=admin_headers)
    assert del_rule.status_code == 200
