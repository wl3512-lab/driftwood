// Level 2: look a plant up in the almanac. Pure, so node can test it.
//
// searchAlmanac(pages, query) → the matching page, or null.
// The query is split into words (case-insensitive, punctuation ignored).
// 1. A word that IS a page's title or keyword wins ("does spearmint spread?" → mint).
//    A plural counts too ("mints" → mint).
// 2. Otherwise a word of 3+ letters that starts a title or keyword ("rose" → rosemary).
// Earlier words win, so "rosemary and mint" opens rosemary.
const wordsOf = (query) => String(query ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
const termsOf = (page) => [page.title, ...(page.keywords || [])].map((t) => String(t).toLowerCase());
const forms = (word) => (word.length > 3 && word.endsWith("s") ? [word, word.slice(0, -1)] : [word]);

export function searchAlmanac(pages, query) {
  const words = wordsOf(query);
  if (!Array.isArray(pages) || pages.length === 0 || words.length === 0) return null;
  for (const word of words) {
    const hit = pages.find((p) => termsOf(p).some((t) => forms(word).includes(t)));
    if (hit) return hit;
  }
  for (const word of words) {
    if (word.length < 3) continue;
    const hit = pages.find((p) => termsOf(p).some((t) => t.startsWith(word)));
    if (hit) return hit;
  }
  return null;
}
