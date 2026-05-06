// Tesseract.js wrapper — lazy-loaded from CDN on first use.
//
// Best-effort OCR for beer menus. Slow on mobile (~5–15s for a typical
// menu photo) and dependent on lighting/angle. Caller should show a
// progress UI during recognize().

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

let tesseractReady = null;

function loadTesseract() {
  if (tesseractReady) return tesseractReady;
  tesseractReady = new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error("Tesseract loaded but global is missing"));
    };
    script.onerror = () => reject(new Error("Failed to load Tesseract.js from CDN"));
    document.head.appendChild(script);
  });
  return tesseractReady;
}

export async function recognizeText(imageSource, { onProgress } = {}) {
  const Tesseract = await loadTesseract();
  const result = await Tesseract.recognize(imageSource, "eng", {
    logger: (m) => {
      if (m.status && typeof m.progress === "number") {
        onProgress?.({ status: m.status, progress: m.progress });
      }
    },
  });
  const text = result?.data?.text || "";
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// Strip menu noise so the fuzzy matcher gets reasonable candidate strings.
// Drops:
//   - prices like "$8", "$12.99", "12.50"
//   - bare numbers / ABV percentages
//   - ALL-CAPS section headers ≥4 chars (TAP, DRAFT, IPAS, BOTTLES…)
//     unless mixed-case beer text follows on the same line
//   - very short tokens (<3 chars after trimming punctuation)
export function extractSearchTerms(rawLines) {
  const terms = new Set();

  for (const line of rawLines) {
    // Strip leading/trailing dots used as ellipses on menus
    let cleaned = line.replace(/[.…\-_=~]{2,}/g, " ").trim();

    // Drop pure prices and bare numbers / ABV
    if (/^\$?\d+([.,]\d+)?\s*%?$/.test(cleaned)) continue;

    // Strip trailing prices ("Corona Extra ... $8" → "Corona Extra")
    cleaned = cleaned.replace(/\$\s*\d+([.,]\d+)?\s*$/g, "").trim();
    cleaned = cleaned.replace(/\s\d+([.,]\d+)?\s*%?\s*$/g, "").trim();

    if (!cleaned) continue;

    // Skip ALL-CAPS section headers of 4+ chars with no lowercase
    if (cleaned.length >= 4 && /^[A-Z0-9\s&'-]+$/.test(cleaned) && !/[a-z]/.test(cleaned)) {
      // unless 4+ words (usually a beer name in caps like "BLUE MOON BELGIAN WHITE")
      if (cleaned.split(/\s+/).filter(Boolean).length < 3) continue;
    }

    // Drop too-short tokens
    const stripped = cleaned.replace(/[^A-Za-z]/g, "");
    if (stripped.length < 3) continue;

    terms.add(cleaned);
  }

  return [...terms];
}
