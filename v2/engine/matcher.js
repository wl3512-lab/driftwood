// Typed questions in the scripted slice: if the text is about the current
// step, treat it as asking that step's question; otherwise the helper replies
// in character and steers back. Pure functions, no DOM.

// step.keywords is an array of groups. EVERY group must match; a group is a
// string or an array of alternatives (any one matches). Matching is whole-word:
// the text is split on non-letters and compared token by token.
export function matchTyped(step, text) {
  const words = new Set(String(text).toLowerCase().split(/[^a-z']+/).filter(Boolean));
  const groupMatches = (group) => [].concat(group).some((k) => words.has(String(k).toLowerCase()));
  return step.keywords.every(groupMatches) ? "ask" : "redirect";
}

export function pickRedirect(level, count) {
  return level.redirects[count % level.redirects.length];
}
