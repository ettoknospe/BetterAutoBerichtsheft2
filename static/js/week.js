// Week viewer: lesson cards + IHK submit form. Ported from the old
// single-page index.html; auth/cache/logout now live in app.js.
import { $, authFetch, ready } from "./app.js";

let weeks = [];
let selected = null;
let currentWeek = null;
let startWeek = null;
let ihkStatus = {};
let ihkHistory = {};
let ihkFieldsCache = {};
let ihkFields = { ausbinhalt1: "", ausbinhalt2: "" };
let weekText = "";
let ihkUseSettingsForAbschnitt = true;
const IHK_BADGE_LABELS = {
  "genehmigt": ["genehmigt", "genehmigt"],
  "in_bearbeitung": ["in Bearbeitung", "in-bearbeitung"],
  "warten_auf_genehmigung": ["warten auf Genehmigung", "warten-auf-genehmigung"],
  "abgelehnt": ["abgelehnt", "abgelehnt"],
};

function weekBounds(id) {
  const [y, w] = id.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (w - 1) * 7);
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

function shiftWeek(id, delta) {
  const [start] = weekBounds(id);
  const d = new Date(start + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta * 7);
  const t = new Date(d); t.setUTCDate(t.getUTCDate() + 3);
  const isoYear = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const week1Mon = new Date(jan4); week1Mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const wk = Math.round((d - week1Mon) / (7 * 864e5)) + 1;
  return `${isoYear}-W${String(wk).padStart(2, "0")}`;
}

function fmtShort(iso) { const [y, m, d] = iso.split("-"); return `${d}.${m}.`; }

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
function fmtDayHeading(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS_DE[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${fmtShort(iso)}`;
}

function nextSubmittableWeek() {
  const known = Object.keys(ihkStatus);
  if (!known.length) return null;
  return shiftWeek([...known].sort().at(-1), 1);
}

function renderIhkBadge() {
  const badge = $("ihkBadge");
  const entry = ihkStatus[selected];
  const mapped = entry && IHK_BADGE_LABELS[entry.status];
  if (!mapped) {
    badge.textContent = "";
    badge.className = "";
    return;
  }
  const [label, cls] = mapped;
  badge.textContent = `· IHK: ${label}`;
  badge.className = cls;
}

let statusTimer = null;
function setStatus(msg, cls = "") {
  clearTimeout(statusTimer);
  const s = $("status");
  s.textContent = msg;
  s.className = cls;
  // Auto-dismiss finished notifications ("ok"/"err") after a few seconds.
  // In-progress messages (no class, e.g. "Daten werden abgerufen…") are left
  // until their result replaces them.
  if (cls === "ok" || cls === "err") {
    statusTimer = setTimeout(() => { s.textContent = ""; s.className = ""; }, cls === "err" ? 7000 : 4000);
  }
}
function clearStatus() {
  clearTimeout(statusTimer);
  const s = $("status");
  s.textContent = "";
  s.className = "";
}

function renderSelect() {
  const all = new Set(weeks);
  all.add(selected);
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...all].sort().filter((w) => {
    const [s, e] = weekBounds(w);
    return s <= today && (!startWeek || w >= startWeek);
  });
  $("weekSelect").innerHTML = sorted.map((w) => {
    const [s, e] = weekBounds(w);
    const label = `${w} (${fmtShort(s)} – ${fmtShort(e)})${weeks.includes(w) ? "" : " · keine Daten"}`;
    return `<option value="${w}" ${w === selected ? "selected" : ""}>${label}</option>`;
  }).join("");
}

function formattedText(data) {
  const bySubject = new Map();
  for (const day of data.days) {
    for (const l of day.lessons) {
      if (!l.content) continue;
      const key = l.subjectLong || l.subject;
      bySubject.set(key, (bySubject.get(key) || "") + l.content + "\n");
    }
  }
  return [...bySubject.entries()].map(([k, v]) => k + ": " + v).join("\n");
}

function loadWeek(wid) {
  selected = wid;
  renderSelect();

  // Can navigate forward up to the latest (current) ISO week, never past
  // it. Backward cap at the user's configured Berichtsheft start date.
  $("next").disabled = !currentWeek || selected >= currentWeek;
  $("prev").disabled = !!startWeek && selected <= startWeek;

  const cached = ihkFieldsCache[wid];
  ihkFields = { ausbinhalt1: cached?.ausbinhalt1 ?? "", ausbinhalt2: cached?.ausbinhalt2 ?? "" };

  const data = JSON.parse(localStorage.getItem(`week:${wid}`));
  renderIhkBadge();
  if (data) {
    renderWeek(data, wid);
  } else {
    $("content").innerHTML = `<div class="placeholder">Noch keine Daten für diese Woche.</div>`;
  }
}

function renderWeek(data, wid) {
  const el = $("content");
  const [s, e] = weekBounds(wid);
  $("weekMeta").textContent = weekBounds(wid).join(" – ") + " · Abgerufen am: " + (weeks.includes(wid) ? new Date(localStorage.getItem(`scrapedAt:${wid}`)).toLocaleString() : "—");

  const days = data.days;
  const noSchedule = data.holiday || data.schoolYearBoundary || data.allCancelled;

  if (!noSchedule && !days.length) {
    el.innerHTML = `<div class="placeholder">Keine Stunden in dieser Woche gefunden.</div>`;
    return;
  }

  weekText = data.holiday
    ? "Schulferien"
    : data.schoolYearBoundary
    ? "Wahrscheinlich Schuljahrwechsel"
    : data.allCancelled
    ? "Alle Stunden abgesagt"
    : formattedText(data);
  const text = weekText;

  const ihkEntry = ihkStatus[wid];
  const nextWeek = nextSubmittableWeek();
  let ihkState, ihkReason;

  if (wid > currentWeek) {
    ihkState = "hidden";
  } else if (ihkEntry) {
    if (ihkEntry.status === "genehmigt") {
      ihkState = "hidden";
      $("scrapeBtn").hidden = true;
    } else if (ihkEntry.status === "warten_auf_genehmigung") {
      ihkState = "disabled";
      ihkReason = "Wartet auf Genehmigung durch Betreuer";
      $("scrapeBtn").hidden = false;
    } else {
      ihkState = "enabled";
      $("scrapeBtn").hidden = false;
    }
  } else if (wid === nextWeek || (nextWeek === null && wid === currentWeek)) {
    ihkState = "enabled";
    $("scrapeBtn").hidden = false;
  } else if (nextWeek && wid > nextWeek) {
    ihkState = "disabled";
    ihkReason = `Zuerst ${nextWeek} einreichen`;
    $("scrapeBtn").hidden = false;
  } else {
    ihkState = "hidden";
    $("scrapeBtn").hidden = false;
  }

  el.innerHTML = noSchedule ? "" : days.map((d) => `<div class="day"><h2>${fmtDayHeading(d.date)}</h2>${d.lessons.map((l) => `<div class="lesson"><div class="head"><span class="subj">${l.subjectLong || l.subject}</span><span class="meta">${l.start}–${l.end}${l.teacher ? " · " + l.teacher : ""}</span></div>` + (l.content ? `<div class="content">${l.content}</div>` : `<div class="empty">(kein Inhalt)</div>`) + `</div>`).join("")}</div>`).join("");

  if (text) {
    const showForm = ihkState !== "hidden";
    const hist = !showForm ? ihkHistory[wid] : null;
    el.insertAdjacentHTML("afterbegin", `
      <div class="summary ihk-form">
        ${showForm ? `
          <h2>Bei IHK einreichen</h2>
          <label for="ihkField1">Betriebliche Tätigkeiten</label>
          <textarea id="ihkField1" rows="4"></textarea>
          <label for="ihkField2">Unterweisungen, betrieblicher Unterricht, sonstige Schulungen</label>
          <textarea id="ihkField2" rows="4"></textarea>
          ${!ihkUseSettingsForAbschnitt ? `
            <label for="ihkAbschnitt">Ausbildungsabschnitt</label>
            <input type="text" id="ihkAbschnitt" placeholder="z.B. 1">
            <label for="ihkAusbMail">Ausbilder Mail</label>
            <input type="email" id="ihkAusbMail" placeholder="ausbilder@example.com">
          ` : ''}
          <label for="berufsschuleText">Berufsschule</label>
        ` : hist ? `
          <h2>IHK Eintrag</h2>
          <label>Betriebliche Tätigkeiten</label>
          <pre id="ihkHist1"></pre>
          <label>Unterweisungen, betrieblicher Unterricht, sonstige Schulungen</label>
          <pre id="ihkHist2"></pre>
          <label for="berufsschuleText">Berufsschule</label>
        ` : `<h2>Berufsschule</h2>`}
        <pre id="berufsschuleText"></pre>
      </div>`);

    $("berufsschuleText").textContent = text;
    if (showForm) {
      $("ihkField1").value = ihkFields.ausbinhalt1;
      $("ihkField2").value = ihkFields.ausbinhalt2;
    } else if (hist) {
      $("ihkHist1").textContent = hist.ausbinhalt1 || "–";
      $("ihkHist2").textContent = hist.ausbinhalt2 || "–";
    }

    if (text && ihkState !== "hidden") {
      const btn = $("ihkBtn");
      btn.hidden = false;
      btn.disabled = ihkState === "disabled";
      btn.title = ihkReason || "";
    } else {
      $("ihkBtn").hidden = true;
    }
  }
}

async function refreshIhkStatus() {
  const res = await authFetch("/api/ihk-status");
  const data = res.ok ? await res.json() : { status: {}, fields: {} };
  ihkStatus = data.status || {};
  ihkFieldsCache = data.fields || {};
}

async function refreshIhkHistory() {
  const res = await authFetch("/api/ihk-history");
  ihkHistory = res.ok ? await res.json() : {};
}

async function loadUserSettings() {
  try {
    const res = await authFetch("/api/me/settings");
    const settings = await res.json();
    ihkUseSettingsForAbschnitt = settings.ihk_use_settings_for_abschnitt !== false;
  } catch (err) {
    console.error("Failed to load user settings:", err);
  }
}

// After a manual "Jetzt Abrufen", pull this week's existing IHK entry (if
// any) so the two editable boxes show what is already on the portal - lets
// the user update rather than blind-overwrite it. READ-ONLY; best-effort;
// never clobbers text the user has already started typing, and bails if the
// user navigated to another week mid-fetch.
async function prefillFromIhk(wid) {
  // Returns true if an existing IHK entry with content was found (and, if the
  // user is still on this week, filled into the boxes). Reports no status
  // itself - the scrape flow owns the messaging. Never throws: if IHK isn't
  // configured, or login/network fails, it just returns false.
  try {
    const res = await authFetch(`/api/ihk-entry/${wid}`);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data || (!data.ausbinhalt1 && !data.ausbinhalt2)) return false;
    // remember it so re-rendering this week later keeps the content
    ihkFieldsCache[wid] = {
      ausbinhalt1: data.ausbinhalt1 || "",
      ausbinhalt2: data.ausbinhalt2 || "",
    };
    if (selected === wid) { // still on this week - fill the boxes now
      ihkFields = { ...ihkFieldsCache[wid] };
      const f1 = $("ihkField1"), f2 = $("ihkField2");
      // only fill boxes the user has not already started typing into
      if (f1 && f1.value.trim() === "" && ihkFields.ausbinhalt1) f1.value = ihkFields.ausbinhalt1;
      if (f2 && f2.value.trim() === "" && ihkFields.ausbinhalt2) f2.value = ihkFields.ausbinhalt2;
    }
    return true;
  } catch (e) {
    return false; // best-effort; leave boxes untouched on any failure
  }
}

async function init() {
  try {
    const res = await authFetch("/api/weeks");
    const json = await res.json();
    weeks = json.weeks;
    currentWeek = json.current;
    startWeek = json.startWeek;
    selected = currentWeek;
    renderSelect();

    for (const wk of weeks) {
      const weekData = await authFetch(`/api/weeks/${wk}`).then((r) => r.json());
      localStorage.setItem(`week:${wk}`, JSON.stringify(weekData));
      localStorage.setItem(`scrapedAt:${wk}`, new Date().toISOString());
    }

    await refreshIhkStatus();
    await refreshIhkHistory();
    await loadUserSettings();
    loadWeek(selected);
  } catch (err) { setStatus("Fehler: " + err.message, "err"); }
}

$("prev").onclick = () => { clearStatus(); selected = shiftWeek(selected, -1); loadWeek(selected); };
$("next").onclick = () => { clearStatus(); selected = shiftWeek(selected, +1); loadWeek(selected); };
$("weekSelect").onchange = (e) => { clearStatus(); loadWeek(e.target.value); };
$("scrapeBtn").onclick = async () => {
  const btn = $("scrapeBtn");
  const wid = selected; // pin the week so a mid-run switch can't misattribute
  btn.disabled = true;
  // Two visible stages so a green "done" box never shows before everything is
  // actually finished: (1) WebUntis scrape, then (2) IHK read-back.
  setStatus("Schritt 1/2: WebUntis wird abgerufen…");
  try {
    const res = await authFetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week: wid }) });
    if (!res.ok) {
      const err = await res.json();
      setStatus("Fehler: " + (err.detail || err.message || "Abrufen fehlgeschlagen"), "err");
      return;
    }
    const data = await res.json();
    localStorage.setItem(`week:${data.week}`, JSON.stringify(data));
    localStorage.setItem(`scrapedAt:${data.week}`, new Date().toISOString());
    if (!weeks.includes(data.week)) weeks.push(data.week);
    renderSelect();
    await refreshIhkStatus();
    loadWeek(selected);
    // Stage 2: check IHK for an existing entry. Non-fatal and silent if IHK
    // isn't configured - prefillFromIhk swallows all failures -> "abgerufen".
    setStatus("Schritt 2/2: IHK-Eintrag wird geprüft…");
    const loaded = await prefillFromIhk(wid);
    if (selected === wid) { // skip the final toast if the user moved on
      setStatus(loaded
        ? "Fertig – bestehender IHK-Eintrag geladen, vor dem Einreichen prüfen"
        : "Fertig – abgerufen", "ok");
    }
  } catch (err) {
    setStatus("Fehler: " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
};

$("ihkBtn").onclick = async () => {
  const field1 = $("ihkField1");
  const field2 = $("ihkField2");
  if (!field1 || !field2) {
    setStatus("Fehler: Formular nicht verfügbar (Woche gewechselt)", "err");
    return;
  }

  const btn = $("ihkBtn");
  btn.disabled = true;
  setStatus(`Übertrage ${selected} an IHK…`);
  try {
    const text = weekText;
    const val1 = field1.value.trim();
    const val2 = field2.value.trim();
    const ausbinhalt1 = val1 ? val1 : null;
    const ausbinhalt2 = val2 ? val2 : null;

    const payload = { week: selected, text, ausbinhalt1, ausbinhalt2 };

    if (!ihkUseSettingsForAbschnitt) {
      const abschnittField = $("ihkAbschnitt");
      const ausbMailField = $("ihkAusbMail");
      if (!abschnittField || !ausbMailField) {
        setStatus("Fehler: Ausbildungsabschnitt und Ausbilder Mail erforderlich", "err");
        btn.disabled = false;
        return;
      }
      payload.ihk_abschnitt_override = abschnittField.value.trim();
      payload.ihk_ausb_mail_override = ausbMailField.value.trim();
    }

    const res = await authFetch("/api/submit-ihk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body.detail || res.statusText);
    setStatus("Bei IHK gespeichert.", "ok");
    await refreshIhkStatus();
    await refreshIhkHistory();
    loadWeek(selected);
  } catch (e) {
    setStatus("Fehler: " + e.message, "err");
    btn.disabled = false;
  }
};

ready.then(init);
