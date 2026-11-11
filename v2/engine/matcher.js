// Typed questions in the scripted slice: if the text is about the current
// step, treat it as asking that step's question; otherwise the helper replies
// in character and steers back. Pure functions, no DOM.

export function matchTyped(step, text) {
  const t = String(text).toLowerCase();
  return step.keywords.some((k) => t.includes(k)) ? "ask" : "redirect";
}

export function pickRedirect(level, count) {
  return level.redirects[count % level.redirects.length];
}
