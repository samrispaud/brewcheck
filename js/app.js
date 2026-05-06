// App bootstrap: load DB, hash routing, tab nav.

import { loadDatabase } from "./data/beerDatabase.js";
import { initSearchView, focusSearch } from "./views/searchView.js";
import { initBeerDetailView, renderBeer } from "./views/beerDetailView.js";
import { initMenuScanView } from "./views/menuScanView.js";

const views = {
  search: document.getElementById("view-search"),
  scan: document.getElementById("view-scan"),
  detail: document.getElementById("view-detail"),
  loading: document.getElementById("view-loading"),
  error: document.getElementById("view-error"),
};

const navTabs = document.querySelectorAll(".nav-tab");

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
    el.classList.toggle("view--active", key === name);
  }
  // Sync nav tabs (only for search/scan; detail/loading/error don't change tab)
  if (name === "search" || name === "scan") {
    navTabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }
}

function navigateToBeer(id) {
  location.hash = `#/beer/${encodeURIComponent(id)}`;
}

function handleRoute() {
  const hash = location.hash;
  const beerMatch = hash.match(/^#\/beer\/(.+)$/);
  if (beerMatch) {
    const id = decodeURIComponent(beerMatch[1]);
    renderBeer(id);
    showView("detail");
    return;
  }
  if (hash === "#/scan") {
    showView("scan");
    return;
  }
  showView("search");
}

function setupNav() {
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      if (target === "search") {
        if (location.hash) {
          history.pushState(null, "", location.pathname + location.search);
        }
        showView("search");
        focusSearch();
      } else if (target === "scan") {
        location.hash = "#/scan";
      }
    });
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Service workers require https or localhost; skip otherwise to avoid noise.
  const isLocalhost = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (location.protocol !== "https:" && !isLocalhost) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((err) => console.warn("SW registration failed:", err));
  });
}

function setupDisclaimer() {
  const btn = document.getElementById("info-btn");
  const sheet = document.getElementById("disclaimer-sheet");
  const close = document.getElementById("disclaimer-close");
  if (!btn || !sheet) return;
  const open = () => { sheet.hidden = false; close?.focus(); };
  const dismiss = () => { sheet.hidden = true; btn.focus(); };
  btn.addEventListener("click", open);
  close?.addEventListener("click", dismiss);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) dismiss(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) dismiss();
  });
}

async function main() {
  showView("loading");

  initSearchView({ onSelectBeer: navigateToBeer });
  initBeerDetailView({ onBack: () => history.back() });
  initMenuScanView({ onSelectBeer: navigateToBeer });
  setupNav();
  setupDisclaimer();

  try {
    await loadDatabase();
  } catch (err) {
    console.error(err);
    document.getElementById("error-message").textContent = err.message || String(err);
    showView("error");
    return;
  }

  window.addEventListener("hashchange", handleRoute);
  handleRoute();

  if (!location.hash) focusSearch();

  registerServiceWorker();
}

main();
