# Graph Report - BetterAutoBerichtsheft2  (2026-10-07)

## Corpus Check
- 31 files · ~30,985 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 518 nodes · 904 edges · 24 communities (16 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4c32771`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.py
- UserSettings
- Scraper Tests
- test_ihk_submitter.py
- db.py
- Encrypted Storage
- week.js
- Crypto (Fernet)
- Test Fixtures
- Runtime Config
- Empty Week Detection
- Two-tier Encryption
- SQLite Database File
- Bulk Operations UI
- Help Documentation
- Main Viewer UI
- Login UI
- Settings UI
- test_security.py
- UntisClient
- test_db.py
- login.js

## God Nodes (most connected - your core abstractions)
1. `UserSettings` - 35 edges
2. `IhkClient` - 29 edges
3. `AuthedUser` - 24 edges
4. `IhkError` - 23 edges
5. `get_connection()` - 19 edges
6. `_saved()` - 16 edges
7. `HostNotAllowed` - 15 edges
8. `login()` - 13 edges
9. `validate_external_host()` - 13 edges
10. `authFetch()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `test_create_next_entry_raises_if_no_token_in_response()` --references--> `IhkClient`  [EXTRACTED]
  tests/test_ihk_submitter.py → app/ihk_client.py
- `test_untis_style_missing_credentials_raises()` --calls--> `IhkClient`  [EXTRACTED]
  tests/test_ihk_submitter.py → app/ihk_client.py
- `_FakeRedirectResponse` --uses--> `IhkClient`  [INFERRED]
  tests/test_security.py → app/ihk_client.py
- `test_ihk_client_registers_redirect_revalidation_hook()` --calls--> `IhkClient`  [EXTRACTED]
  tests/test_security.py → app/ihk_client.py
- `_FakeRedirectResponse` --uses--> `HostNotAllowed`  [INFERRED]
  tests/test_security.py → app/netcheck.py

## Import Cycles
- None detected.

## Communities (24 total, 8 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.05
Nodes (82): AuthedUser, Authenticated user with basic info., BulkBackfillIhkRequest, bulkops_backfill_ihk(), bulkops_scrape_cancel(), bulkops_scrape_progress(), bulkops_scrape_weeks(), BulkScrapeRequest (+74 more)

### Community 1 - "UserSettings"
Cohesion: 0.07
Nodes (47): main(), One-time backfill: scrape ausbinhalt1/ausbinhalt2 text for every existing IHK…, IhkClient, IhkError, Exception, IHK tibrosBB portal client - plain HTTP, no browser. Classic JSP/Tomcat webapp,…, Shared field extraction for both an existing entry's edit page and a fresh…, POST the "Neuer Eintrag" form. Doesn't persist anything by itself - returns a… (+39 more)

### Community 2 - "Scraper Tests"
Cohesion: 0.07
Nodes (30): fake_untis(), _period(), fixture, _raise_boundary(), _raise_holidays_error(), _raise_no_allowed_date(), WebUntis can return real (non-empty) periods that are all 'cancelled' — e.g. a…, Stub out network I/O in UntisClient; user_settings already carries real… (+22 more)

### Community 3 - "test_ihk_submitter.py"
Cohesion: 0.07
Nodes (15): fake_ihk(), fixture, Stub out network I/O in IhkClient; user_settings already carries real…, Regression test for the real bug found while building this feature: a save can…, Regression test: save_entry() used to hardcode ausbinhalt1/2 as "" on every…, Neuer Eintrag' doesn't persist anything - it returns a blank draft (lfdnr='0')…, Regression test for the actual live bug: create_next_entry() alone never…, Same scenario, but the diff genuinely finds nothing new - must fail loudly… (+7 more)

### Community 4 - "db.py"
Cohesion: 0.05
Nodes (59): dummy_verify(), hash_password(), needs_rehash(), Request, Authentication: password hashing, session management, FastAPI dependencies., FastAPI dependency: require authenticated admin user., Hash password in self-describing format:…, Verify password against stored hash. (+51 more)

### Community 6 - "Encrypted Storage"
Cohesion: 0.12
Nodes (23): _decrypt_json(), _encrypt_json(), _has_real_lessons(), list_week_ids(), load_ihk_history(), load_ihk_status(), load_local_fields(), load_week_data() (+15 more)

### Community 7 - "week.js"
Cohesion: 0.07
Nodes (40): authFetch(), clearWeekCache(), closeDrawer(), ensureCacheOwnership(), esc(), logout(), NAV_LABELS, ready (+32 more)

### Community 8 - "Crypto (Fernet)"
Cohesion: 0.20
Nodes (11): decrypt(), decrypt_with_key(), encrypt(), encrypt_with_key(), generate_dek(), Reversible encryption for WebUntis/IHK credentials and per-user data. Used to…, Generate a new random per-user data-encryption key (a Fernet key)., Encrypt plaintext to bytes via Fernet, using an explicit key. (+3 more)

### Community 9 - "Test Fixtures"
Cohesion: 0.27
Nodes (10): admin_client(), app_client(), new_user(), fixture, Create + log in a fresh non-admin test user via the real HTTP API., A client with no session cookie, for testing 401 behavior., A UserSettings for tests that call scraper/ihk_submitter/storage functions…, TestUser (+2 more)

### Community 13 - "SQLite Database File"
Cohesion: 0.20
Nodes (9): API, Berichtsheft, Einmaliger Historie-Import, Funktionen, IHK-Einreichung im Detail, Installation, Tests, Wie das Scraping funktioniert (+1 more)

### Community 19 - "test_security.py"
Cohesion: 0.08
Nodes (20): _addr_is_public(), SSRF guard: validate that a user-supplied host points at a public server. The…, Raise HostNotAllowed unless every address `host` resolves to is public. `host`…, requests 'response' hook: re-validate each redirect hop's host.…, validate_external_host(), validate_redirect_target(), parametrize, _FakeRedirectResponse (+12 more)

### Community 20 - "UntisClient"
Cohesion: 0.24
Nodes (8): _dump_debug(), Dev-only raw-response dump. Gated off unless config.DEBUG_DUMPS is set - these…, date, Exception, WebUntis JSON-RPC + REST client. Flow: 1. JSON-RPC authenticate -> session…, Fetch Lehrstoff via the calendar-entry detail endpoint (same call the WebUntis…, ScrapeError, UntisClient

### Community 21 - "test_db.py"
Cohesion: 0.36
Nodes (7): _fresh_db_path(), The real migration set must survive being applied twice in a row against a…, A migration that fails with a real (non-'already exists') OperationalError must…, ADMIN_PASSWORD bootstrap must enforce the same strength policy as every other…, test_bootstrap_admin_rejects_weak_password(), test_run_migrations_is_safe_to_replay(), test_run_migrations_raises_on_genuine_failure()

### Community 22 - "login.js"
Cohesion: 0.40
Nodes (4): errorDiv, form, loginBtn, logo

## Knowledge Gaps
- **27 isolated node(s):** `NAV_LABELS`, `logo`, `form`, `errorDiv`, `loginBtn` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserSettings` connect `UserSettings` to `main.py`, `db.py`, `UntisClient`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `IhkClient` connect `UserSettings` to `main.py`, `test_security.py`, `test_ihk_submitter.py`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `IhkError` connect `UserSettings` to `main.py`, `test_ihk_submitter.py`, `test_api.py`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `UserSettings` (e.g. with `IhkClient` and `IhkError`) actually correct?**
  _`UserSettings` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `IhkClient` (e.g. with `UserSettings` and `_FakeRedirectResponse`) actually correct?**
  _`IhkClient` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `IhkError` (e.g. with `UserSettings` and `BulkBackfillIhkRequest`) actually correct?**
  _`IhkError` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `NAV_LABELS`, `logo`, `form` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._