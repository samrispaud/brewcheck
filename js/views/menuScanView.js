// Menu scan view: file/camera input → Tesseract OCR → batch beer match.

import { recognizeText, extractSearchTerms } from "../services/textRecognizer.js";
import { searchMultiple } from "../data/beerDatabase.js";
import { safetyFor } from "../services/recommendationEngine.js";

const els = {
  empty: null,
  input: null,
  working: null,
  preview: null,
  progressText: null,
  results: null,
  matches: null,
  noMatches: null,
  summary: null,
  reset: null,
};

let onSelectBeer = null;

export function initMenuScanView(opts) {
  onSelectBeer = opts.onSelectBeer;

  els.empty = document.getElementById("scan-empty");
  els.input = document.getElementById("scan-input");
  els.working = document.getElementById("scan-working");
  els.preview = document.getElementById("scan-preview");
  els.progressText = document.getElementById("scan-progress-text");
  els.results = document.getElementById("scan-results");
  els.matches = document.getElementById("scan-matches");
  els.noMatches = document.getElementById("scan-no-matches");
  els.summary = document.getElementById("scan-summary");
  els.reset = document.getElementById("scan-reset");

  els.input.addEventListener("change", handleFile);
  els.reset.addEventListener("click", reset);

  els.matches.addEventListener("click", (e) => {
    const row = e.target.closest(".result-row");
    if (!row) return;
    onSelectBeer?.(row.dataset.beerId);
  });
}

export function resetMenuScanView() {
  reset();
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  els.preview.src = objectUrl;

  els.empty.hidden = true;
  els.results.hidden = true;
  els.working.hidden = false;
  els.progressText.textContent = "Loading OCR engine…";

  try {
    const lines = await recognizeText(file, {
      onProgress: ({ status, progress }) => {
        const pct = Math.round(progress * 100);
        els.progressText.textContent = `${formatStatus(status)}… ${pct}%`;
      },
    });

    const terms = extractSearchTerms(lines);
    const matches = searchMultiple(terms);
    renderResults(matches, terms.length);
  } catch (err) {
    console.error(err);
    renderError(err);
  } finally {
    URL.revokeObjectURL(objectUrl);
    // Allow re-selecting the same file
    els.input.value = "";
  }
}

function renderResults(matches, termCount) {
  els.working.hidden = true;
  els.results.hidden = false;

  if (matches.length === 0) {
    els.summary.textContent = `Read ${termCount} candidate ${termCount === 1 ? "line" : "lines"}.`;
    els.matches.innerHTML = "";
    els.noMatches.hidden = false;
    return;
  }

  els.noMatches.hidden = true;
  els.summary.textContent = `Found ${matches.length} ${matches.length === 1 ? "match" : "matches"} from ${termCount} candidate lines.`;
  els.matches.innerHTML = matches.map(rowHtml).join("");
}

function renderError(err) {
  els.working.hidden = true;
  els.results.hidden = false;
  els.summary.textContent = "";
  els.matches.innerHTML = "";
  els.noMatches.hidden = false;
  els.noMatches.querySelector("strong").textContent = "Couldn't read the image";
  els.noMatches.querySelector("span").textContent = err?.message || "Try again with a clearer photo.";
}

function reset() {
  els.results.hidden = true;
  els.working.hidden = true;
  els.empty.hidden = false;
  els.matches.innerHTML = "";
  els.noMatches.hidden = true;
  els.preview.src = "";
  els.input.value = "";
  // Restore default no-matches text in case of prior error
  els.noMatches.querySelector("strong").textContent = "No beers matched";
  els.noMatches.querySelector("span").textContent = "The OCR couldn't find any names in our database. Try a clearer photo or use search.";
}

function formatStatus(s) {
  // Tesseract emits "loading tesseract core", "initializing tesseract",
  // "loading language traineddata", "initializing api", "recognizing text"
  if (!s) return "Working";
  return s.charAt(0).toUpperCase() + s.slice(1);
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
