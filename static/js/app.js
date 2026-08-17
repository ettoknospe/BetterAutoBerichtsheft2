// Shell: auth guard, sidebar drawer, hash router, logout.
// Exports helpers the view modules build on. Views wait on `ready`
// (which resolves to the current user) before doing any network work,
// so the single 401 guard here runs before every view.

export const $ = (id) => document.getElementById(id);

// HTML-escape untrusted text before it goes into innerHTML. WebUntis lesson
// content and admin usernames are attacker-influenceable, so escape them.
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ROUTES = ["week", "import", "settings", "help"];
const NAV_LABELS = { week: "Wochen", import: "Datenimport", settings: "Einstellungen", help: "Hilfe" };

// ---- cache ownership (week:*/scrapedAt:* are keyed only by week id, not
// by account - on a shared browser a different user must never see a
// previous account's cached lesson content) ----
function clearWeekCache() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("week:") || key.startsWith("scrapedAt:")) {
      localStorage.removeItem(key);
    }
  }
}

async function ensureCacheOwnership(username) {
  if (localStorage.getItem("cacheOwner") !== username) {
    clearWeekCache();
    localStorage.setItem("cacheOwner", username);
  }
}

// fetch wrapper that bounces to login on session expiry. Views use this
// for every authenticated call so a mid-session 401 never fails silently.
export async function authFetch(url, opts) {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Not authenticated");
  }
  return res;
}

function logout() {
  clearWeekCache();
  localStorage.removeItem("cacheOwner");
  fetch("/api/auth/logout", { method: "POST" }).then(() => {
    window.location.href = "/login.html";
  });
}

// ---- mobile drawer ----
function openDrawer() { document.body.classList.add("drawer-open"); }
function closeDrawer() { document.body.classList.remove("drawer-open"); }

// ---- collapsible sidebar (desktop) ----
function toggleSidebar() {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false");
}
// Restore persisted state at module load (harmless on mobile - the collapse
// CSS is gated to >=769px). Done before the async auth guard to avoid a flash.
if (localStorage.getItem("sidebarCollapsed") === "true") {
  document.body.classList.add("sidebar-collapsed");
}

// ---- router ----
function routeFromHash() {
  const r = window.location.hash.replace(/^#\/?/, "");
  return ROUTES.includes(r) ? r : "week";
}

function showRoute(r) {
  ROUTES.forEach((name) => {
    const view = $("view-" + name);
    if (view) view.classList.toggle("active", name === r);
  });
  document.querySelectorAll(".sidebar-nav a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === r);
  });
  const tb = $("topbarTitle");
  if (tb) tb.textContent = NAV_LABELS[r] || "";
  closeDrawer();
  const cw = document.querySelector(".content-wrapper");
  if (cw) cw.scrollTop = 0;
}

window.addEventListener("hashchange", () => showRoute(routeFromHash()));

async function whoami() {
  const res = await fetch("/api/auth/whoami");
  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Not authenticated");
  }
  return res.json();
}

// Bootstrap: wire shell chrome, guard auth once, hide admin-only bits,
// then route. Views await this before running.
export const ready = (async () => {
  $("logoutBtn").addEventListener("click", logout);
  const hb = $("hamburger");
  if (hb) hb.addEventListener("click", openDrawer);
  const bd = $("backdrop");
  if (bd) bd.addEventListener("click", closeDrawer);
  // Close the mobile drawer on any nav tap - hashchange->showRoute already
  // closes it when the route changes, but tapping the current route fires no
  // hashchange, so close here too.
  document.querySelectorAll(".sidebar-nav a[data-route]").forEach((a) =>
    a.addEventListener("click", closeDrawer)
  );
  const tog = $("sidebarToggle");
  if (tog) tog.addEventListener("click", toggleSidebar);
  // Hide the sidebar logo if the (user-local, gitignored) logo.svg is absent.
  // Was an inline onerror= attribute, which the CSP blocks - wire it here.
  const logo = document.querySelector(".sidebar-logo-img");
  if (logo) {
    const hideLogo = () => { logo.style.display = "none"; };
    logo.addEventListener("error", hideLogo);
    if (logo.complete && logo.naturalWidth === 0) hideLogo();
  }

  const user = await whoami();
  await ensureCacheOwnership(user.username);
  if (!user.is_admin) {
    document.querySelectorAll(".admin-only").forEach((el) => el.remove());
  }
  showRoute(routeFromHash());
  return user;
})();
