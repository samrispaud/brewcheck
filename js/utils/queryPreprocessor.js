// Strips natural-language scaffolding so a query like
// "is coors light gluten free?" becomes "coors light".

const QUESTION_WORDS = new Set([
  "is", "are", "can", "could", "should", "would",
  "what", "how", "when", "where", "why", "which",
  "does", "do", "did", "has", "have", "had",
]);

const FILLER_WORDS = new Set([
  "the", "a", "an", "this", "that", "these", "those",
  "i", "me", "my", "we", "us", "our",
  "you", "your",
  "it", "its",
  "about", "tell", "know", "find", "lookup", "look", "up",
]);

const GLUTEN_PHRASES = [
  "gluten free",
  "gluten-free",
  "safe for celiac",
  "celiac safe",
  "gf",
  "gluten",
  "safe",
  "drink",
  "have",
];

export function extractBeerName(query) {
  let cleaned = query.toLowerCase()
    .replace(/[?!,.]/g, "");

  for (const phrase of GLUTEN_PHRASES) {
    cleaned = cleaned.split(phrase).join("");
  }

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !QUESTION_WORDS.has(w))
    .filter(w => !FILLER_WORDS.has(w));

  const result = words.join(" ").trim();
  return result || query.trim();
}

export function normalize(query) {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
