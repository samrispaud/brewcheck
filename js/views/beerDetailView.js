// Beer detail view: hero with safety level, assessment, test results.

import { getBeer } from "../data/beerDatabase.js";
import {
  safetyFor,
  generateExplanation,
  isNegative,
  isPositive,
  formatDate,
} from "../services/recommendationEngine.js";

const els = {
  back: null,
  content: null,
};

export function initBeerDetailView({ onBack }) {
  els.back = document.getElementById("back-btn");
  els.content = document.getElementById("detail-content");
  els.back.addEventListener("click", onBack);
}

export function renderBeer(id) {
  const beer = getBeer(id);
  if (!beer) {
    els.content.innerHTML = `<p class="no-matches"><strong>Beer not found</strong></p>`;
    return;
  }

  const safety = safetyFor(beer);
  const explanation = generateExplanation(beer);

  els.content.innerHTML = `
    <div class="detail-hero">
      <h1 class="detail-hero__name">${escapeHtml(beer.name)}</h1>
      <p class="detail-hero__brewery">${escapeHtml(beer.brewery)}${beer.style ? " · " + escapeHtml(beer.style) : ""}</p>
      <span class="detail-hero__safety">
        <span class="safety-dot" data-safety="${safety.key}"></span>
        ${escapeHtml(safety.label)}
        <span class="detail-hero__score">${beer.gfConfidenceScore}/5</span>
      </span>
    </div>

    <section class="detail-section">
      <h2>Safety assessment</h2>
      <p class="assessment">${escapeHtml(explanation)}</p>
    </section>

    <section class="detail-section">
      <h2>Test results (${beer.testResults.length})</h2>
      <ul class="test-list">
        ${beer.testResults.map(testItemHtml).join("")}
      </ul>
    </section>

    <p class="disclaimer">
      Personal use only — not medical advice. Test results reflect specific batches and may not represent current production.
      The FDA gluten-free standard is &lt; 20 ppm.
    </p>
  `;

  els.content.scrollIntoView({ block: "start" });
}

function testItemHtml(t) {
  const neg = isNegative(t);
  const pos = isPositive(t);
  const cls = neg ? "test-item--negative" : pos ? "test-item--positive" : "";
  const resultCls = neg ? "test-item__result--negative" : pos ? "test-item__result--positive" : "";

  return `
    <li class="test-item ${cls}">
      <div class="test-item__row">
        <span class="test-item__type">${escapeHtml(t.testType || "Test")}</span>
        <span class="test-item__date">${escapeHtml(formatDate(t.testDate))}</span>
      </div>
      <p class="test-item__result ${resultCls}">${escapeHtml(t.testResult || "")}</p>
      ${t.testNotes ? `<p class="test-item__notes">${escapeHtml(t.testNotes)}</p>` : ""}
      ${t.testLink ? `<a class="test-item__link" href="${escapeAttr(t.testLink)}" target="_blank" rel="noopener noreferrer">View source ↗</a>` : ""}
    </li>
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

function escapeAttr(s) {
  return escapeHtml(s);
}
