# Graph Report - BetterAutoBerichtsheft2  (2026-08-07)

## Corpus Check
- 22 files · ~28,301 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 384 nodes · 663 edges · 19 communities (11 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4ce48ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Auth & Bulk Ops API
- IHK Backfill & Portal Client
- Scraper Tests
- IHK Client CLI
- Database Layer
- Encrypted Storage
- Auth & Sessions
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

## God Nodes (most connected - your core abstractions)
1. `UserSettings` - 34 edges
2. `IhkError` - 23 edges
3. `IhkClient` - 23 edges
4. `AuthedUser` - 22 edges
5. `get_connection()` - 18 edges
6. `_saved()` - 16 edges
7. `UntisClient` - 12 edges
8. `ScrapeError` - 11 edges
9. `scrape_week()` - 10 edges
10. `_dump_debug()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `test_submit_ihk_error_maps_to_502()` --calls--> `IhkError`  [EXTRACTED]
  tests/test_api.py → app/ihk_client.py
- `test_untis_style_missing_credentials_raises()` --calls--> `IhkClient`  [EXTRACTED]
  tests/test_ihk_submitter.py → app/ihk_client.py
- `IhkError` --uses--> `UserSettings`  [INFERRED]
  app/ihk_client.py → app/settings.py
- `BulkBackfillIhkRequest` --uses--> `IhkError`  [INFERRED]
  app/main.py → app/ihk_client.py
- `BulkScrapeRequest` --uses--> `IhkError`  [INFERRED]
  app/main.py → app/ihk_client.py

## Import Cycles
- None detected.

## Communities (19 total, 8 thin omitted)

### Community 0 - "Auth & Bulk Ops API"
Cohesion: 0.06
Nodes (68): AuthedUser, Authenticated user with basic info., BulkBackfillIhkRequest, bulkops_backfill_ihk(), bulkops_scrape_progress(), bulkops_scrape_weeks(), BulkScrapeRequest, change_password() (+60 more)

### Community 1 - "IHK Backfill & Portal Client"
Cohesion: 0.08
Nodes (38): IHK tibrosBB portal client - plain HTTP, no browser. Classic JSP/Tomcat webapp,…, load_history(), load_local_fields(), load_status(), _next_week_id(), IHK tibrosBB submission orchestration - separate from scraper.py since it's a…, Read the locally-remembered ausbinhalt1/2 map, or {} if none saved yet., Read the one-time archived ausbinhalt1/2 content per week, or {} if the… (+30 more)

### Community 2 - "Scraper Tests"
Cohesion: 0.07
Nodes (30): fake_untis(), _period(), fixture, _raise_boundary(), _raise_holidays_error(), _raise_no_allowed_date(), WebUntis can return real (non-empty) periods that are all 'cancelled' — e.g. a…, Stub out network I/O in UntisClient; user_settings already carries real… (+22 more)

### Community 3 - "IHK Client CLI"
Cohesion: 0.05
Nodes (29): main(), One-time backfill: scrape ausbinhalt1/ausbinhalt2 text for every existing IHK…, IhkClient, IhkError, Exception, Shared field extraction for both an existing entry's edit page and a fresh…, POST the "Neuer Eintrag" form. Doesn't persist anything by itself - returns a…, Save text into an entry's three content fields and return its real lfdnr.… (+21 more)

### Community 4 - "Database Layer"
Cohesion: 0.08
Nodes (39): bootstrap_admin_if_needed(), create_session(), create_user(), _create_user_dek(), delete_session(), get_connection(), get_ihk_history_row(), get_ihk_status_row() (+31 more)

### Community 6 - "Encrypted Storage"
Cohesion: 0.12
Nodes (23): _decrypt_json(), _encrypt_json(), _has_real_lessons(), list_week_ids(), load_ihk_history(), load_ihk_status(), load_local_fields(), load_week_data() (+15 more)

### Community 7 - "Auth & Sessions"
Cohesion: 0.16
Nodes (12): hash_password(), Request, Authentication: password hashing, session management, FastAPI dependencies., Hash password in self-describing format:…, Verify password against stored hash., FastAPI dependency: extract and validate session cookie. Returns AuthedUser or…, FastAPI dependency: require authenticated admin user., require_admin() (+4 more)

### Community 8 - "Crypto (Fernet)"
Cohesion: 0.20
Nodes (11): decrypt(), decrypt_with_key(), encrypt(), encrypt_with_key(), generate_dek(), Reversible encryption for WebUntis/IHK credentials and per-user data. Used to…, Generate a new random per-user data-encryption key (a Fernet key)., Encrypt plaintext to bytes via Fernet, using an explicit key. (+3 more)

### Community 9 - "Test Fixtures"
Cohesion: 0.27
Nodes (10): admin_client(), app_client(), new_user(), fixture, Create + log in a fresh non-admin test user via the real HTTP API., A client with no session cookie, for testing 401 behavior., A UserSettings for tests that call scraper/ihk_submitter/storage functions…, TestUser (+2 more)

### Community 13 - "SQLite Database File"
Cohesion: 0.20
Nodes (9): API, Berichtsheft, Einmaliger Historie-Import, Funktionen, IHK-Einreichung im Detail, Installation, Tests, Wie das Scraping funktioniert (+1 more)

## Knowledge Gaps
- **14 isolated node(s):** `Funktionen`, `Installation`, `Wie das Scraping funktioniert`, `Wochen ohne Stunden`, `Einmaliger Historie-Import` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserSettings` connect `IHK Backfill & Portal Client` to `Auth & Bulk Ops API`, `IHK Client CLI`, `Database Layer`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `IhkError` connect `IHK Client CLI` to `Auth & Bulk Ops API`, `IHK Backfill & Portal Client`, `API Integration Tests`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `IhkClient` connect `IHK Client CLI` to `Auth & Bulk Ops API`, `IHK Backfill & Portal Client`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `UserSettings` (e.g. with `IhkClient` and `IhkError`) actually correct?**
  _`UserSettings` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `IhkError` (e.g. with `UserSettings` and `BulkBackfillIhkRequest`) actually correct?**
  _`IhkError` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Funktionen`, `Installation`, `Wie das Scraping funktioniert` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Bulk Ops API` be split into smaller, more focused modules?**
  _Cohesion score 0.05754475703324808 - nodes in this community are weakly interconnected._