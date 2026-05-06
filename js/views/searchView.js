// Search view: input handling, voice search, filter chips, result list.

import { searchAndFilter } from "../data/beerDatabase.js";
import { safetyFor, summaryFor } from "../services/recommendationEngine.js";
import { TIERS, LIMITED, TIER_ORDER } from "../services/scoreEngine.js";
import { STYLE_BUCKETS } from "../utils/styleBuckets.js";
import { isSupported as voiceSupported, createRecognizer } from "../services/speechRecognizer.js";

const TIER_LABELS = (() => {
  const t = {};
  for (const tier of Object.values(TIERS)) t[tier.key] = tier.label;
  t[LIMITED.key] = LIMITED.label;
  return t;
})();

const els = {
  input: null,
  clearBtn: null,
  micBtn: null,
  voiceStatus: null,
  results: null,
  resultsSummary: null,
  emptyState: null,
  filterToggle: null,
  filterCount: null,
  filterClear: null,
  filterPanel: null,
  tierChips: null,
  styleChips: null,
};

const state = {
  tiers: new Set(),
  styles: new Set(),
};

let recognizer = null;
let debounceTimer = null;

function debouncedRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(render, 250);
}

export function initSearchView({ onSelectBeer }) {
  els.input = document.getElementById("search-input");
  els.clearBtn = document.getElementById("clear-btn");
  els.micBtn = document.getElementById("mic-btn");
  els.voiceStatus = document.getElementById("voice-status");
  els.results = document.getElementById("results");
  els.resultsSummary = document.getElementById("results-summary");
  els.emptyState = document.getElementById("empty-state");
  els.filterToggle = document.getElementById("filter-toggle");
  els.filterCount = document.getElementById("filter-count");
  els.filterClear = document.getElementById("filter-clear");
  els.filterPanel = document.getElementById("filter-panel");
  els.tierChips = document.getElementById("tier-chips");
  els.styleChips = document.getElementById("style-chips");

  els.input.addEventListener("input", () => {
    els.clearBtn.hidden = els.input.value.length === 0;
    debouncedRender();
  });
  els.clearBtn.addEventListener("click", () => {
    els.input.value = "";
    els.clearBtn.hidden = true;
    render();
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

  initFilters();
  initVoiceSearch();
}

export function renderSearch() {
  render();
}

function initFilters() {
  els.tierChips.innerHTML = TIER_ORDER.map(key => chipHtml({
    group: "tier",
    key,
    label: TIER_LABELS[key],
    safety: key,
  })).join("");

  els.styleChips.innerHTML = STYLE_BUCKETS.map(b => chipHtml({
    group: "style",
    key: b.key,
    label: b.label,
  })).join("");

  els.filterToggle.addEventListener("click", () => {
    const open = !els.filterPanel.hidden;
    els.filterPanel.hidden = open;
    els.filterToggle.setAttribute("aria-expanded", String(!open));
  });

  els.filterClear.addEventListener("click", () => {
    state.tiers.clear();
    state.styles.clear();
    syncChipPressedState();
    updateFilterMeta();
    render();
  });

  const onChipClick = (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const { group, key } = btn.dataset;
    const set = group === "tier" ? state.tiers : state.styles;
    if (set.has(key)) set.delete(key); else set.add(key);
    btn.setAttribute("aria-pressed", String(set.has(key)));
    updateFilterMeta();
    render();
  };
  els.tierChips.addEventListener("click", onChipClick);
  els.styleChips.addEventListener("click", onChipClick);
}

function chipHtml({ group, key, label, safety }) {
  const safetyAttr = safety ? ` data-safety="${safety}"` : "";
  return `<button type="button" class="chip" data-group="${group}" data-key="${key}"${safetyAttr} aria-pressed="false">${escapeHtml(label)}</button>`;
}

function syncChipPressedState() {
  els.tierChips.querySelectorAll(".chip").forEach(btn => {
    btn.setAttribute("aria-pressed", String(state.tiers.has(btn.dataset.key)));
  });
  els.styleChips.querySelectorAll(".chip").forEach(btn => {
    btn.setAttribute("aria-pressed", String(state.styles.has(btn.dataset.key)));
  });
}

function updateFilterMeta() {
  const total = state.tiers.size + state.styles.size;
  if (total > 0) {
    els.filterCount.textContent = String(total);
    els.filterCount.hidden = false;
    els.filterClear.hidden = false;
  } else {
    els.filterCount.hidden = true;
    els.filterClear.hidden = true;
  }
}

function initVoiceSearch() {
  if (!voiceSupported()) {
    els.micBtn.hidden = true;
    return;
  }

  els.micBtn.hidden = false;

  recognizer = createRecognizer({
    onResult: ({ transcript }) => {
      if (!transcript) return;
      els.input.value = transcript;
      els.clearBtn.hidden = false;
      render();
    },
    onEnd: () => {
      setMicState("idle");
    },
    onError: ({ kind }) => {
      setMicState("idle");
      if (kind === "not-allowed" || kind === "service-not-allowed") {
        showVoiceStatus(
          "Microphone access denied. Enable it in your browser's site settings to use voice search.",
          "error"
        );
      } else if (kind === "no-speech") {
        showVoiceStatus("Didn't catch that — try again?", "info");
      } else if (kind === "audio-capture") {
        showVoiceStatus("No microphone found.", "error");
      } else if (kind === "network") {
        showVoiceStatus("Voice search needs a network connection.", "error");
      }
    },
  });

  els.micBtn.addEventListener("click", () => {
    if (recognizer.isListening()) {
      recognizer.stop();
      return;
    }
    clearVoiceStatus();
    setMicState("listening");
    recognizer.start();
  });
}

function setMicState(state) {
  els.micBtn.dataset.state = state;
  els.micBtn.setAttribute(
    "aria-label",
    state === "listening" ? "Stop voice search" : "Search by voice"
  );
}

function showVoiceStatus(text, tone = "info") {
  els.voiceStatus.textContent = text;
  els.voiceStatus.dataset.tone = tone;
  els.voiceStatus.hidden = false;
}

function clearVoiceStatus() {
  els.voiceStatus.hidden = true;
  els.voiceStatus.textContent = "";
}

export function focusSearch() {
  els.input?.focus();
}

function render() {
  const query = els.input.value;
  const matches = searchAndFilter({
    query,
    tiers: [...state.tiers],
    styleBuckets: [...state.styles],
  });

  const trimmed = query.trim();
  const filterCount = state.tiers.size + state.styles.size;

  if (matches.length === 0) {
    els.results.innerHTML = "";
    if (trimmed.length >= 2) {
      els.results.innerHTML = `
        <div class="no-matches">
          <strong>No matches</strong>
          <span>Nothing matched "${escapeHtml(trimmed)}"${filterCount ? " with the current filters" : ""}. Try a shorter query or clear filters.</span>
        </div>
      `;
      els.emptyState.hidden = true;
    } else {
      els.emptyState.hidden = false;
    }
    els.resultsSummary.textContent = "";
    return;
  }

  els.emptyState.hidden = true;
  els.resultsSummary.textContent = summaryLine(matches.length, trimmed, filterCount);
  els.results.innerHTML = matches.map(rowHtml).join("");
}

function summaryLine(n, query, filterCount) {
  const beers = `${n} beer${n === 1 ? "" : "s"}`;
  if (query.length >= 2 && filterCount > 0) return `${beers} matching "${query}" · filtered`;
  if (query.length >= 2) return `${beers} matching "${query}"`;
  if (filterCount > 0) return `${beers} after filters · sorted by safety`;
  return `${beers} · sorted by safety`;
}

function rowHtml(match) {
  const { beer } = match;
  const safety = safetyFor(beer);
  const summary = summaryFor(beer);
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
        <p class="result-row__summary">${escapeHtml(summary)}</p>
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
