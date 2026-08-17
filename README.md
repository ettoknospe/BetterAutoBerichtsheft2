# Berichtsheft

Automatisches Berichtsheft für Azubis, die WebUntis nutzen: die App holt sich
selbstständig den Lehrstoff (Unterrichtsinhalt) aus WebUntis, fasst ihn pro
Fach zu einem fertigen, copy-paste-tauglichen Text zusammen — und kann diesen
Text auf Wunsch direkt in den echten IHK-Ausbildungsnachweis-Portal
(tibrosBB) eintragen, ohne dass du selbst etwas abtippen musst.

Mehrbenutzerfähig: jede Person meldet sich mit eigenem Account an, mit
eigenen WebUntis- und IHK-Zugangsdaten (verschlüsselt gespeichert). Läuft als
ein Docker-Container, auf amd64 wie auf dem Raspberry Pi (arm64).

## Funktionen

- **Automatischer Wochenabruf**: jede Woche wird der Lehrstoff aus WebUntis
  gescraped und zu einem fertigen Berufsschule-Text zusammengefasst — Doppel-
  stunden mit gleichem Inhalt werden automatisch zusammengefasst.
- **IHK-Direkteinreichung**: ein Klick auf **Bei IHK einreichen** trägt den
  Text zusammen mit optionalen Feldern ("Betriebliche Tätigkeiten",
  "Unterweisungen …") direkt ins echte IHK-Portal ein — nie automatisch
  "Speichern & Senden", das machst immer du selbst.
- **Statusanzeige**: ein farbiges Badge zeigt live den echten IHK-Status
  einer Woche (in Bearbeitung, genehmigt, wartet auf Genehmigung, abgelehnt).
- **Ferien- und Lückenerkennung**: eine leere Woche wird nicht einfach
  ignoriert — die App unterscheidet Schulferien, Schuljahreswechsel,
  komplett abgesagten Unterricht und "noch nicht abrufbar".
- **Automatischer Zeitplan**: pro Nutzer einstellbar, wann automatisch
  gescraped wird (z.B. jeden Sonntag 18 Uhr) — holt dabei immer die aktuelle
  *und* die vorherige Woche, falls Lehrer Inhalte nachträglich eintragen.
- **Mehrbenutzerfähig**: jeder Account hat eigene WebUntis-/IHK-Zugangsdaten,
  verschlüsselt in einer SQLite-Datenbank, kein gemeinsames `.env` mit echten
  Passwörtern.
- **Massenabruf**: mehrere Wochen auf einmal abrufen, und einmalig alle
  bereits bei IHK eingereichten Einträge archivieren.

## Installation

```bash
cp .env.example .env
```

In `.env` müssen nur zwei Werte gesetzt werden — das reicht für einen
echten Betrieb:

```
SECRET_ENCRYPTION_KEY=   # Befehl zum Generieren siehe unten
ADMIN_PASSWORD=          # Passwort für den ersten (Admin-)Account
```

Verschlüsselungsschlüssel generieren:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Dann:

```bash
docker compose up -d --build
```

Öffne `http://localhost:8001/login.html` (auf dem Pi:
`http://<pi-ip>:8001/login.html`) und melde dich als `admin` mit dem
gesetzten Passwort an.

WebUntis- und IHK-Zugangsdaten werden **nicht** in `.env` eingetragen —
jeder Nutzer trägt seine eigenen unter **Einstellungen** ein, nachdem er
sich angemeldet hat.

Weitere Nutzer anlegen: **Einstellungen → Admin → Benutzer verwalten**.
Volle Details, DB-Schema und Verschlüsselungsmodell:
[DEVELOPER.md](DEVELOPER.md).

## Wie das Scraping funktioniert

1. JSON-RPC `authenticate` → Session + personId
2. `/WebUntis/api/token/new` → Bearer-Token
3. JSON-RPC `getTimetable` → Stunden der Woche
4. Pro Stunde `GET .../calendar-entry/detail` → der eigentliche Lehrstoff

## Wochen ohne Stunden

Nicht jede leere Woche heißt "noch nicht abgerufen" — die App versucht zu
erklären, woran es liegt:

- **Schulferien** — bestätigt über WebUntis' eigene Ferien-/Schuljahresdaten
  (keine fest einprogrammierten Daten).
- **Wahrscheinlich Schuljahrwechsel** — die Woche liegt zwischen zwei
  Schuljahren, WebUntis kann nicht sicher sagen, ob es Ferien sind.
- **Alle Stunden abgesagt** — es gab Stunden, aber alle wurden abgesagt (z.B.
  erste Woche eines neuen Schuljahres, bevor der Stundenplan aktiv ist).
  Trotzdem einreichbar — das Berufsschule-Feld enthält dann genau diesen
  Hinweistext statt einer Stundenliste.
- **Kann noch nicht abgerufen werden** — die Woche liegt weiter in der
  Zukunft, als WebUntis aktuell erlaubt; später erneut versuchen.

## IHK-Einreichung im Detail

- **Nur einseitig**: die App schreibt nur zu IHK, liest Inhalte nie zurück,
  um sie in der eigenen Oberfläche vorzubefüllen — was du hier siehst, sind
  immer deine eigenen WebUntis-Daten, nie etwas vom Portal Übernommenes.
- **Sendet nie automatisch ab**: klickt immer nur "Speichern", nie
  "Speichern & Senden" — das Absenden zur Genehmigung machst du selbst auf
  der echten Seite.
- Der Button erscheint nur für Wochen, die gerade wirklich einreichbar sind
  — entweder ein bestehender, nicht gesperrter Eintrag, oder genau die
  nächste Woche in der Reihenfolge (das Portal erlaubt kein Überspringen).
  Weiter zurückliegende Wochen zeigen einen deaktivierten Button mit Hinweis,
  was zuerst eingereicht werden muss.

### Einmaliger Historie-Import

Genehmigte (gesperrte) Wochen können nicht erneut eingereicht werden, ihr
Text ist also sicher zum Anzeigen — dieser Befehl archiviert einmalig jeden
bestehenden IHK-Eintrag verschlüsselt in die Historie des jeweiligen Nutzers:

```bash
docker compose run --rm --entrypoint python berichtsheft app/backfill_ihk_history.py <user_id>
```

Oder direkt in der Oberfläche: **Einstellungen → Datenimport (Massenabruf)**.

## API

Alle Endpunkte außer `POST /api/auth/login` benötigen ein gültiges
`session`-Cookie; Admin-Endpunkte zusätzlich Admin-Rechte.

| Methode & Pfad | Auth | Zweck |
|---|---|---|
| `POST /api/auth/login` | — | Anmelden, setzt Session-Cookie |
| `POST /api/auth/logout` | Nutzer | Session beenden |
| `GET /api/auth/whoami` | Nutzer | Aktueller Benutzername + Admin-Flag |
| `POST /api/admin/users` | Admin | Neuen Nutzer anlegen |
| `GET /api/admin/users` | Admin | Alle Nutzer auflisten |
| `GET /api/me/settings` | Nutzer | Eigene WebUntis-/IHK-/Zeitplan-Einstellungen abrufen |
| `PUT /api/me/settings` | Nutzer | Eigene Einstellungen aktualisieren (teilweise) |
| `PUT /api/me/password` | Nutzer | Eigenes Passwort ändern |
| `POST /api/test/untis` | Nutzer | WebUntis-Login testen, ohne zu speichern |
| `POST /api/test/ihk` | Nutzer | IHK-Login testen, ohne zu speichern |
| `GET /api/weeks` | Nutzer | Gespeicherte Wochen + aktuelle Woche + Startwoche |
| `GET /api/weeks/{week_id}` | Nutzer | Daten einer Woche (404 falls nicht abgerufen) |
| `POST /api/scrape` | Nutzer | Eine Woche abrufen (Standard: aktuelle Woche) |
| `GET /api/ihk-status` | Nutzer | Letzter IHK-Status + lokal gemerkte Felder |
| `GET /api/ihk-history` | Nutzer | Archivierte IHK-Historie (aus dem Import) |
| `POST /api/submit-ihk` | Nutzer | Eintrag bei IHK einreichen |
| `POST /api/bulkops/scrape-weeks` | Nutzer | Zeitraum von Wochen abrufen |
| `GET /api/bulkops/scrape-progress` | Nutzer | Fortschritt eines laufenden Massenabrufs |
| `POST /api/bulkops/backfill-ihk` | Nutzer | Wie der CLI-Import, aus der Oberfläche |

Beispiele:

```
POST /api/scrape
{"week": "2026-W29"}   # optional, Standard ist die aktuelle Woche

POST /api/submit-ihk
{"week": "2026-W29", "text": "...", "ausbinhalt1": null, "ausbinhalt2": null}
# die letzten beiden sind optional; null lässt den bestehenden IHK-Wert unangetastet
```

Vollständige Request-/Response-Formate für jeden Endpunkt:
[DEVELOPER.md](DEVELOPER.md).

## Tests

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

95 Tests, alle über den echten HTTP-Login-Flow gegen eine isolierte
Test-Datenbank — Details und die Docker-Variante in
[DEVELOPER.md](DEVELOPER.md#run-tests).
