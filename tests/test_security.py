"""Tests for the 2026-08 security hardening pass. See wiki
berichtsheft-security-audit-2026-08 for the findings these cover."""
import pytest
from fastapi.testclient import TestClient

from app import main
from app.ihk_client import IhkClient
from app.netcheck import validate_external_host, validate_redirect_target, HostNotAllowed


# ---- SSRF host guard (finding #2) ----

@pytest.mark.parametrize("host", [
    "localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254",
    "10.0.0.5", "192.168.1.1", "172.16.0.1", "::1",
])
def test_netcheck_rejects_non_public(host):
    with pytest.raises(HostNotAllowed):
        validate_external_host(host)


class _FakeRedirectResponse:
    def __init__(self, url, location, status_code=302):
        self.url = url
        self.status_code = status_code
        self.headers = {"Location": location}

    @property
    def is_redirect(self):
        return "location" in {k.lower() for k in self.headers} and self.status_code in (301, 302, 303, 307, 308)


@pytest.mark.parametrize("location", [
    "https://127.0.0.1/admin",
    "https://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/",
    "/relative-path-on-192.168.1.1",  # relative Location, resolved against response.url below
])
def test_validate_redirect_target_blocks_private_hop(location):
    if location.startswith("/"):
        resp = _FakeRedirectResponse("https://192.168.1.1/start", location)
    else:
        resp = _FakeRedirectResponse("https://example.com/start", location)
    with pytest.raises(HostNotAllowed):
        validate_redirect_target(resp)


def test_validate_redirect_target_allows_public_hop():
    resp = _FakeRedirectResponse("https://example.com/start", "https://example.org/next")
    validate_redirect_target(resp)  # must not raise


def test_validate_redirect_target_ignores_non_redirects():
    resp = _FakeRedirectResponse("https://example.com/start", "https://127.0.0.1/admin", status_code=200)
    validate_redirect_target(resp)  # 200 is not a redirect - must not raise


def test_ihk_client_registers_redirect_revalidation_hook(user_settings):
    client = IhkClient(user_settings)
    assert validate_redirect_target in client.s.hooks["response"]


def test_netcheck_allows_public_ip_literal():
    # IP literal so no DNS is needed (works offline).
    validate_external_host("8.8.8.8")


def test_netcheck_rejects_empty():
    with pytest.raises(HostNotAllowed):
        validate_external_host("")


# ---- Password policy (finding #6) ----

def test_admin_create_rejects_short_password(admin_client):
    r = admin_client.post("/api/admin/users", json={"username": "shorty", "password": "abc"})
    assert r.status_code == 400
    assert "at least" in r.json()["detail"]


def test_password_change_rejects_short(new_user):
    r = new_user.client.put("/api/me/password",
                            json={"current_password": "test-user-password", "new_password": "abc"})
    assert r.status_code == 400


# ---- Login rate limiting + timing (findings #5, #12) ----

def test_login_rate_limited(new_user):
    client = TestClient(main.app)
    for _ in range(8):
        r = client.post("/api/auth/login",
                        json={"username": new_user.username, "password": "wrong-password"})
        assert r.status_code == 401
    r = client.post("/api/auth/login",
                    json={"username": new_user.username, "password": "wrong-password"})
    assert r.status_code == 429


def test_login_unknown_user_is_401_not_leaky(unauth_client):
    r = unauth_client.post("/api/auth/login",
                           json={"username": "nobody-here-xyz", "password": "whatever12"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid credentials"


# ---- Session invalidation on password change (finding #9) ----

def test_password_change_invalidates_session(new_user):
    r = new_user.client.put("/api/me/password",
                            json={"current_password": "test-user-password",
                                  "new_password": "a-new-strong-password"})
    assert r.status_code == 200
    r2 = new_user.client.get("/api/auth/whoami")
    assert r2.status_code == 401


# ---- Bulk-scrape range cap (finding #1) ----

def test_bulk_scrape_rejects_future_start(new_user, monkeypatch):
    monkeypatch.setattr(main.scraper, "scrape_week", lambda *a, **k: pytest.fail("should not scrape"))
    r = new_user.client.post("/api/bulkops/scrape-weeks",
                             json={"startWeek": "9999-W52", "endWeek": "9999-W52"})
    assert r.status_code == 400


def test_bulk_scrape_rejects_oversized_range(new_user, monkeypatch):
    monkeypatch.setattr(main.scraper, "scrape_week", lambda *a, **k: pytest.fail("should not scrape"))
    r = new_user.client.post("/api/bulkops/scrape-weeks",
                             json={"startWeek": "1000-W01", "endWeek": "9999-W52"})
    assert r.status_code == 400
    assert "too large" in r.json()["detail"]


# ---- Security headers + docs gating (findings #15, #16) ----

def test_security_headers_present(unauth_client):
    r = unauth_client.get("/login.html")
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert "default-src 'self'" in r.headers.get("Content-Security-Policy", "")


def test_api_docs_disabled_by_default(unauth_client):
    assert unauth_client.get("/openapi.json").status_code == 404
    assert unauth_client.get("/docs").status_code == 404


# ---- Bulk-scrape abort (stop button) ----

def test_bulk_scrape_can_be_cancelled(new_user, monkeypatch):
    """Cancelling mid-run stops the loop at the next week boundary."""
    calls = []
    def fake_scrape(wk, **k):
        calls.append(wk)
        # request cancellation after the first week is scraped
        with main._bulk_scrape_cancel_lock:
            main._bulk_scrape_cancel.add(new_user.user_id)
    monkeypatch.setattr(main.scraper, "scrape_week", fake_scrape)
    r = new_user.client.post("/api/bulkops/scrape-weeks",
                             json={"startWeek": "2025-W01", "endWeek": "2025-W10"})
    assert r.status_code == 200
    body = r.json()
    assert body["cancelled"] is True
    assert len(calls) == 1  # stopped after the first, not all 10


def test_scrape_cancel_requires_auth(unauth_client):
    assert unauth_client.post("/api/bulkops/scrape-cancel").status_code == 401


def test_bulk_scrape_surfaces_lock_conflict_instead_of_swallowing_it(new_user, monkeypatch):
    """If the per-user scrape lock is already held (e.g. by the scheduler or
    a concurrent /api/scrape), bulk scrape must abort with 409, not silently
    skip every remaining week and report success."""
    calls = []

    def fake_scrape(wk, **k):
        calls.append(wk)

    monkeypatch.setattr(main.scraper, "scrape_week", fake_scrape)

    lock = main._get_lock(new_user.user_id, "scrape")
    assert lock.acquire(blocking=False)
    try:
        r = new_user.client.post("/api/bulkops/scrape-weeks",
                                 json={"startWeek": "2025-W01", "endWeek": "2025-W10"})
    finally:
        lock.release()

    assert r.status_code == 409
    assert calls == []
