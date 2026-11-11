import pytest
from backend.app.schemas.session import SessionState
from backend.app.services.session.manager import SessionManager, SessionTransitionError
from backend.app.services.camera.simulated import SimulatedCamera

def test_session_lifecycle():
    manager = SessionManager()
    assert manager.state == SessionState.IDLE
    assert manager.get_current_session() is None

    # Start session
    session = manager.start_session(customer_name="Test User", photos_required=2)
    assert manager.state == SessionState.STARTED
    assert session["session_id"].startswith("SESS-")
    assert "GMT" in session["session_id"]
    assert session["photos_required"] == 2
    assert session["photos_taken"] == 0

    # Capture 1st photo
    camera = SimulatedCamera(capture_delay=0.0)
    photo1 = manager.capture_next_photo(camera)
    assert photo1["index"] == 1
    assert session["photos_taken"] == 1
    assert manager.state == SessionState.CAPTURING

    # Capture 2nd photo (should reach quota and transition to PREVIEW)
    photo2 = manager.capture_next_photo(camera)
    assert photo2["index"] == 2
    assert session["photos_taken"] == 2
    assert manager.state == SessionState.PREVIEW
    assert session["processed_image_path"] is not None

    # Complete session
    completed = manager.complete_session()
    assert completed["completed_at"] is not None
    assert manager.state == SessionState.IDLE
    assert manager.get_current_session() is None

def test_prevent_concurrent_sessions():
    manager = SessionManager()
    manager.start_session(photos_required=3)

    # Trying to start another session while one is active should raise SessionTransitionError
    with pytest.raises(SessionTransitionError, match="Cannot start a new session"):
        manager.start_session(photos_required=3)

def test_abort_session():
    manager = SessionManager()
    manager.start_session(photos_required=3)
    assert manager.state == SessionState.STARTED

    res = manager.abort_session(reason="User cancelled")
    assert res["message"] == "Session aborted and reset to IDLE"
    assert manager.state == SessionState.IDLE
    assert manager.get_current_session() is None

def test_invalid_transition_raises_error():
    manager = SessionManager()
    # Cannot complete when in IDLE
    with pytest.raises(SessionTransitionError):
        manager.complete_session()
