from backend.app.services.session.manager import SessionManager, SessionTransitionError

_session_manager_instance: SessionManager = None

def get_session_manager() -> SessionManager:
    global _session_manager_instance
    if _session_manager_instance is None:
        _session_manager_instance = SessionManager()
    return _session_manager_instance

def set_session_manager(manager: SessionManager) -> None:
    global _session_manager_instance
    _session_manager_instance = manager
