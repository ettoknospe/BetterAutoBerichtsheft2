// Datenimport view: bulk week scrape + IHK history backfill.
import { $, authFetch, ready } from "./app.js";

function setStatus(el, msg, cls = "") {
  el.textContent = msg;
  el.className = cls;
}

// Parse dd.mm.yyyy -> Date
function parseDate(str) {
  const parts = str.trim().split(".");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

// Date -> ISO week (YYYY-Www)
function dateToWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

$("endDateTodayBtn").onclick = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  $("endDate").value = `${dd}.${mm}.${today.getFullYear()}`;
};

$("bulkScrapeBtn").onclick = async () => {
  const btn = $("bulkScrapeBtn");
  const status = $("scrapeStatus");
  const startDateStr = $("startDate").value.trim();
  const endDateStr = $("endDate").value.trim();

  if (!startDateStr || !endDateStr) {
    setStatus(status, "Bitte beide Daten eingeben", "err");
    return;
  }

  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  if (!startDate || !endDate) {
    setStatus(status, "Ungültiges Datumsformat. Verwende dd.mm.yyyy (z.B. 01.08.2026)", "err");
    return;
  }

  const startWeek = dateToWeek(startDate);
  const endWeek = dateToWeek(endDate);

  btn.disabled = true;
  setStatus(status, "Rufe Wochen ab...", "loading");

  const poll = setInterval(async () => {
    try {
      const res = await fetch("/api/bulkops/scrape-progress");
      const p = await res.json();
      if (p.total > 0) {
        const pct = Math.round((p.current / p.total) * 100);
        setStatus(status, `Rufe ab: ${p.current} / ${p.total} (${pct}%)${p.week ? " – " + p.week : ""}`, "loading");
      }
    } catch (e) { /* transient poll failure - next tick retries */ }
  }, 500);

  try {
    const res = await authFetch("/api/bulkops/scrape-weeks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startWeek, endWeek }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Anfrage fehlgeschlagen");

    setStatus(status, `Fertig: ${data.weeks_scraped} Wochen abgerufen`, "ok");
  } catch (e) {
    setStatus(status, `Fehler: ${e.message}`, "err");
  } finally {
    clearInterval(poll);
    btn.disabled = false;
  }
};

$("backfillBtn").onclick = async () => {
  const btn = $("backfillBtn");
  const status = $("backfillStatus");

  btn.disabled = true;
  setStatus(status, "Rufe IHK-Einträge ab...", "loading");

  try {
    const res = await authFetch("/api/bulkops/backfill-ihk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Anfrage fehlgeschlagen");

    setStatus(status, `Fertig: ${data.entries_scraped} Einträge abgerufen`, "ok");
  } catch (e) {
    setStatus(status, `Fehler: ${e.message}`, "err");
  } finally {
    btn.disabled = false;
  }
};

// no async init needed; kept for symmetry / future auth-gated setup
ready.catch(() => {});
