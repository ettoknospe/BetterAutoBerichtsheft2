import tempfile
from pathlib import Path

import pytest

from app import config, db


def _fresh_db_path(tmp_path_factory):
    return Path(tempfile.mkdtemp(prefix="berichtsheft-dbtest-")) / "app.db"


def test_run_migrations_is_safe_to_replay(monkeypatch, tmp_path_factory):
    """The real migration set must survive being applied twice in a row
    against a fresh database, since bootstrap runs it on every startup."""
    monkeypatch.setattr(db, "DB_PATH", _fresh_db_path(tmp_path_factory))
    db.run_migrations()
    db.run_migrations()  # must not raise


def test_run_migrations_raises_on_genuine_failure(monkeypatch, tmp_path_factory):
    """A migration that fails with a real (non-'already exists') OperationalError
    must abort startup instead of being silently skipped."""
    monkeypatch.setattr(db, "DB_PATH", _fresh_db_path(tmp_path_factory))
    broken_migrations = db.MIGRATIONS[:6] + [
        (7, "SELECT * FROM this_table_does_not_exist_xyz"),
    ]
    monkeypatch.setattr(db, "MIGRATIONS", broken_migrations)
    with pytest.raises(Exception):
        db.run_migrations()


def test_bootstrap_admin_rejects_weak_password(monkeypatch, tmp_path_factory):
    """ADMIN_PASSWORD bootstrap must enforce the same strength policy as
    every other account-creation path (POST /api/admin/users, create_admin.py)."""
    db_path = _fresh_db_path(tmp_path_factory)
    monkeypatch.setattr(db, "DB_PATH", db_path)
    monkeypatch.setattr(config, "ADMIN_PASSWORD", "short")
    db.run_migrations()
    with pytest.raises(RuntimeError):
        db.bootstrap_admin_if_needed()

    conn = db.get_connection()
    try:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
    finally:
        conn.close()
