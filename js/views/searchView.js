// Search view: input handling + result list rendering.

import { search } from "../data/beerDatabase.js";
import { safetyFor } from "../services/recommendationEngine.js";

const els = {
  input: null,
  clearBtn: null,
  results: null,
  emptyState: null,
};

export function initSearchView({ onSelectBeer }) {
  els.input = document.getElementById("search-input");
  els.clearBtn = document.getElementById("clear-btn");
  els.results = document.getElementById("results");
  els.emptyState = document.getElementById("empty-state");

  els.input.addEventListener("input", handleInput);
  els.clearBtn.addEventListener("click", () => {
    els.input.value = "";
    handleInput();
    els.input.focus();
  });

  els.results.addEventListener("click", (e) => {
    const row = e.target.closest(".result-row");
    if (!row) return;
    const id = row.dataset.beerId;
    if (id) onSelectBeer(id);
  });

  els.results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest(".result-row");
    if (!row) return;
    e.preventDefault();
    onSelectBeer(row.dataset.beerId);
  });
}

export function focusSearch() {
  els.input?.focus();
}

function handleInput() {
  const q = els.input.value;
  els.clearBtn.hidden = q.length === 0;

  if (q.trim().length < 2) {
    els.results.innerHTML = "";
    els.emptyState.hidden = false;
    return;
  }

  const matches = search(q);
  renderResults(matches, q);
}

function renderResults(matches, query) {
  els.emptyState.hidden = true;

  if (matches.length === 0) {
    els.results.innerHTML = `
      <div class="no-matches">
        <strong>No matches</strong>
        <span>Nothing matched "${escapeHtml(query)}". Try a shorter or simpler query.</span>
      </div>
    `;
    return;
  }

  els.results.innerHTML = matches.map(rowHtml).join("");
}

function rowHtml(match) {
  const { beer } = match;
  const safety = safetyFor(beer);
  const stylePill = beer.style ? `<span class="style-pill">${escapeHtml(beer.style)}</span>` : "";

  return `
    <button
      type="button"
      class="result-row"
      data-beer-id="${escapeHtml(beer.id)}"
      data-safety="${safety.key}"
      aria-label="${escapeHtml(beer.name)} by ${escapeHtml(beer.brewery)}, ${escapeHtml(safety.label)}"
    >
      <div class="result-row__body">
        <p class="result-row__name">${escapeHtml(beer.name)}</p>
        <p class="result-row__meta">
          <span>${escapeHtml(beer.brewery)}</span>
          ${stylePill}
          <span class="result-row__score" data-safety="${safety.key}">${escapeHtml(safety.label)}</span>
        </p>
      </div>
      <span class="result-row__chev" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <polyline points="9,5 16,12 9,19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </button>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
