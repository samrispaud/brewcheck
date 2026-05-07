// App bootstrap: load DB, hash routing.

import { loadDatabase } from "./data/beerDatabase.js";
import { initSearchView, focusSearch, renderSearch } from "./views/searchView.js";
import { initBeerDetailView, renderBeer } from "./views/beerDetailView.js";

const views = {
  search: document.getElementById("view-search"),
  detail: document.getElementById("view-detail"),
  loading: document.getElementById("view-loading"),
  error: document.getElementById("view-error"),
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
    el.classList.toggle("view--active", key === name);
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
  showView("search");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
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
  setupDisclaimer();

  try {
    await loadDatabase();
  } catch (err) {
    console.error(err);
    document.getElementById("error-message").textContent = err.message || String(err);
    showView("error");
    return;
  }

  renderSearch();
  window.addEventListener("hashchange", handleRoute);
  handleRoute();

  if (!location.hash) focusSearch();

  registerServiceWorker();
}

main();
