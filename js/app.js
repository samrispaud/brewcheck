// App bootstrap: load DB, hash-routing between search + detail views.

import { loadDatabase } from "./data/beerDatabase.js";
import { initSearchView, focusSearch } from "./views/searchView.js";
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

function navigateToSearch() {
  if (location.hash) {
    history.pushState(null, "", location.pathname + location.search);
  }
  showView("search");
}

function handleRoute() {
  const hash = location.hash;
  const beerMatch = hash.match(/^#\/beer\/(.+)$/);
  if (beerMatch) {
    const id = decodeURIComponent(beerMatch[1]);
    renderBeer(id);
    showView("detail");
  } else {
    showView("search");
  }
}

async function main() {
  showView("loading");

  initSearchView({ onSelectBeer: navigateToBeer });
  initBeerDetailView({ onBack: () => history.back() });

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
}

main();
