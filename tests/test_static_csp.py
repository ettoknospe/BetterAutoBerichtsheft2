"""Regression tests for the CSP self-compliance bug (2026-08).

The security-hardening pass added a strict CSP (default-src 'self', no
script-src) but nobody checked the app's own pages complied with it. Two
consequences shipped: login.html's inline <script> was blocked (login became
impossible, and a no-method form leaked credentials into the URL via GET
fallback), and index.html's inline onerror= was silently dead.

These tests assert the app's own static assets stay CSP-compatible:
no inline <script> blocks, no inline on*= handlers, no javascript: URLs,
and every <script src="..."> the pages depend on actually resolves.
"""
import re
from pathlib import Path

from fastapi.testclient import TestClient

from app import main

STATIC = Path(__file__).resolve().parent.parent / "static"
HTML_FILES = sorted(STATIC.glob("*.html"))
JS_FILES = sorted(STATIC.glob("js/*.js"))

# An inline <script> is any <script ...> without a src= attribute.
INLINE_SCRIPT_RE = re.compile(r"<script\b(?![^>]*\bsrc=)[^>]*>", re.IGNORECASE)
# Inline event-handler attribute in markup: ` onclick="`, ` onerror='`, etc.
# The leading space + name + `=` + quote form is markup; a JS property
# assignment (`img.onerror = fn`) has a dot and spaces and won't match.
INLINE_HANDLER_RE = re.compile(r"""\son[a-z]+=["']""", re.IGNORECASE)
JS_URL_RE = re.compile(r"""["'(]\s*javascript:""", re.IGNORECASE)
SCRIPT_SRC_RE = re.compile(r"""<script\b[^>]*\bsrc=["']([^"']+)["']""", re.IGNORECASE)


def test_found_static_files():
    # Guard against the globs silently matching nothing (wrong path in CI).
    assert HTML_FILES, "no static/*.html found"
    assert JS_FILES, "no static/js/*.js found"


def test_no_inline_script_blocks():
    offenders = [f.name for f in HTML_FILES if INLINE_SCRIPT_RE.search(f.read_text())]
    assert not offenders, f"inline <script> blocks (CSP-blocked) in: {offenders}"


def test_no_inline_event_handlers():
    offenders = []
    for f in HTML_FILES + JS_FILES:
        if INLINE_HANDLER_RE.search(f.read_text()):
            offenders.append(f.name)
    assert not offenders, f"inline on*= handlers (CSP-blocked) in: {offenders}"


def test_no_javascript_urls():
    offenders = [f.name for f in HTML_FILES + JS_FILES if JS_URL_RE.search(f.read_text())]
    assert not offenders, f"javascript: URLs (CSP-blocked) in: {offenders}"


def test_every_script_src_resolves():
    """Every external script an HTML page depends on must actually be served.
    This is the assertion that would have caught the original login break and
    catches it if js/login.js is ever renamed or dropped from the image."""
    client = TestClient(main.app)
    checked = 0
    for f in HTML_FILES:
        for src in SCRIPT_SRC_RE.findall(f.read_text()):
            if src.startswith(("http://", "https://", "//")):
                continue  # external origin, not our asset (and CSP would block it)
            r = client.get(src)
            assert r.status_code == 200, f"{f.name} references {src} -> HTTP {r.status_code}"
            checked += 1
    assert checked, "no local <script src> found to verify"
