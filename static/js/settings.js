// Settings: one flat grouped page (Konto / WebUntis / Berichtsheft /
// IHK / Admin). No tabs. Handlers wired via addEventListener because
// module scope is not global (inline on* attributes can't reach these).
import { $, authFetch, ready } from "./app.js";

let currentSettings = null;

function setMsg(id, text, ok) {
  const el = $(id);
  el.textContent = text;
  el.className = "message " + (ok ? "success" : "error");
}

async function loadSettings() {
  try {
    const res = await authFetch("/api/me/settings");
    currentSettings = await res.json();
    const s = currentSettings;
    $("untis_host").value = s.untis_host || "";
    $("untis_user").value = s.untis_user || "";
    $("scrape_day").value = s.scrape_day || "off";
    $("scrape_time").value = s.scrape_time || "18:00";
    $("start_date").value = s.start_date || "";
    $("ihk_host").value = s.ihk_host || "";
    $("ihk_user").value = s.ihk_user || "";
    $("ihk_ausbabschnitt").value = s.ihk_ausbabschnitt || "";
    $("ihk_ausb_mail").value = s.ihk_ausb_mail || "";
    $("ihk_use_settings").checked = s.ihk_use_settings_for_abschnitt !== false;
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

async function loadUsers() {
  try {
    const res = await authFetch("/api/admin/users");
    const users = await res.json();
    $("usersTableBody").innerHTML = users.map((u) => `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.is_admin ? "Admin" : "Benutzer"}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
      </tr>`).join("");
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}

// PUT /api/me/settings for a subset of fields; `msgId` gets the result.
async function saveSettings(msgId, data, btn) {
  btn.classList.add("loading");
  btn.disabled = true;
  try {
    const res = await authFetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setMsg(msgId, "Einstellungen gespeichert!", true);
    } else {
      const err = await res.json();
      setMsg(msgId, "Fehler: " + (err.detail || "Unbekannter Fehler"), false);
    }
  } catch (err) {
    setMsg(msgId, "Netzwerkfehler: " + err.message, false);
  } finally {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

function submitBtn(form) { return form.querySelector('button[type="submit"]'); }

$("untisForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveSettings("untis-msg", {
    untis_host: $("untis_host").value,
    untis_user: $("untis_user").value,
    untis_pass: $("untis_pass").value || null,
  }, submitBtn(e.target));
  $("untis_pass").value = "";
});

$("scraperForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveSettings("scraper-msg", {
    scrape_day: $("scrape_day").value,
    scrape_time: $("scrape_time").value,
    start_date: $("start_date").value,
  }, submitBtn(e.target));
});

$("ihkForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveSettings("ihk-msg", {
    ihk_host: $("ihk_host").value,
    ihk_user: $("ihk_user").value,
    ihk_pass: $("ihk_pass").value || null,
    ihk_ausbabschnitt: $("ihk_ausbabschnitt").value,
    ihk_ausb_mail: $("ihk_ausb_mail").value,
    ihk_use_settings_for_abschnitt: $("ihk_use_settings").checked,
  }, submitBtn(e.target));
  $("ihk_pass").value = "";
});

$("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = submitBtn(e.target);
  btn.classList.add("loading");
  btn.disabled = true;
  try {
    const res = await authFetch("/api/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: $("current_password").value,
        new_password: $("new_password").value,
      }),
    });
    if (res.ok) {
      setMsg("account-msg", "Passwort geändert!", true);
      $("passwordForm").reset();
    } else {
      const err = await res.json();
      setMsg("account-msg", "Fehler: " + (err.detail || "Unbekannter Fehler"), false);
    }
  } catch (err) {
    setMsg("account-msg", "Netzwerkfehler: " + err.message, false);
  } finally {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
});

async function testConnection(kind, msgId, body, btn) {
  btn.classList.add("loading");
  btn.disabled = true;
  try {
    const res = await authFetch(`/api/test/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMsg(msgId, "✓ Verbindung erfolgreich!", true);
    } else {
      const err = await res.json();
      setMsg(msgId, "✗ Verbindung fehlgeschlagen: " + (err.detail || "Unbekannter Fehler"), false);
    }
  } catch (err) {
    setMsg(msgId, "✗ Netzwerkfehler: " + err.message, false);
  } finally {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

$("testUntisBtn").addEventListener("click", (e) => testConnection("untis", "untis-msg", {
  untis_host: $("untis_host").value,
  untis_user: $("untis_user").value,
  untis_pass: $("untis_pass").value || null,
}, e.target));

$("testIhkBtn").addEventListener("click", (e) => testConnection("ihk", "ihk-msg", {
  ihk_host: $("ihk_host").value,
  ihk_user: $("ihk_user").value,
  ihk_pass: $("ihk_pass").value || null,
}, e.target));

// createUserBtn only exists for admins (the .admin-only group is removed
// for non-admins in app.js bootstrap), so guard the wiring.
const createBtn = $("createUserBtn");
if (createBtn) {
  createBtn.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    btn.classList.add("loading");
    btn.disabled = true;
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: $("new_user_name").value,
          password: $("new_user_pass").value,
          is_admin: $("new_user_admin").checked,
        }),
      });
      if (res.ok) {
        setMsg("admin-msg", "Benutzer erstellt!", true);
        $("new_user_name").value = "";
        $("new_user_pass").value = "";
        $("new_user_admin").checked = false;
        await loadUsers();
      } else {
        const err = await res.json();
        setMsg("admin-msg", "Fehler: " + (err.detail || "Unbekannter Fehler"), false);
      }
    } catch (err) {
      setMsg("admin-msg", "Netzwerkfehler: " + err.message, false);
    } finally {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  });
}

ready.then(async (user) => {
  await loadSettings();
  if (user.is_admin) await loadUsers();
});
