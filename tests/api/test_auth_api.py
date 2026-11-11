from fastapi.testclient import TestClient


def test_auth_login_and_me(test_client: TestClient):
    # 1. Login as admin
    admin_res = test_client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["success"] is True
    assert admin_data["user"]["role"] == "admin"
    admin_token = admin_data["token"]

    # 2. Login as employee user
    user_res = test_client.post(
        "/auth/login",
        json={"username": "user", "password": "user"},
    )
    assert user_res.status_code == 200
    user_data = user_res.json()
    assert user_data["success"] is True
    assert user_data["user"]["role"] == "user"
    user_token = user_data["token"]

    # 3. Wrong password
    bad_res = test_client.post(
        "/auth/login",
        json={"username": "admin", "password": "wrongpassword"},
    )
    assert bad_res.status_code == 401

    # 4. Check profile with token
    me_admin = test_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert me_admin.status_code == 200
    assert me_admin.json()["user"]["username"] == "admin"
    assert me_admin.json()["user"]["role"] == "admin"

    me_user = test_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert me_user.status_code == 200
    assert me_user.json()["user"]["username"] == "user"
    assert me_user.json()["user"]["role"] == "user"

    # 5. Check profile without token
    me_anon = test_client.get("/auth/me")
    assert me_anon.status_code == 401
