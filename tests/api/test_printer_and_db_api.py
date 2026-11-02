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
