// Map each beer's freeform `style` string into one of a small set of buckets
// the user can filter on. Keep this list short — too many chips overwhelm
// the mobile UI. Add new raw styles to the keyword lists as they appear in
// the dataset; anything unmatched falls into "other".

export const STYLE_BUCKETS = [
  { key: "lager",   label: "Lager" },
  { key: "ipa",     label: "IPA / Pale Ale" },
  { key: "stout",   label: "Stout / Porter" },
  { key: "wheat",   label: "Wheat" },
  { key: "belgian", label: "Belgian / Sour" },
  { key: "other",   label: "Other" },
];

export function bucketForStyle(rawStyle) {
  const s = (rawStyle || "").toLowerCase().trim();
  if (!s) return "other";

  // Belgian/sour first — many of these contain "ale" so they'd otherwise
  // miss the more specific bucket.
  if (s.includes("belgian") || s.includes("abbey") || s.includes("tripel") ||
      s.includes("dubbel") || s.includes("gueuze") || s.includes("sour")) {
    return "belgian";
  }

  if (s.includes("wheat") || s.includes("weiss") || s.includes("white ale") ||
      s.includes("hefe")) {
    return "wheat";
  }

  if (s.includes("stout") || s.includes("porter")) {
    return "stout";
  }

  if (s.includes("ipa") || s.includes("pale ale") || s.includes("amber ale") ||
      s.includes("red ale")) {
    return "ipa";
  }

  // Pilsners are pale lagers — bucket together to keep chip count tight.
  if (s.includes("lager") || s.includes("pilsner") || s.includes("pilsener") ||
      s.includes("helles") || s.includes("märzen") || s.includes("marzen") ||
      s.includes("oktoberfest") || s.includes("bock") || s.includes("zwickel")) {
    return "lager";
  }

  return "other";
}
