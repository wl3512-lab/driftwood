// The pets' live voice: asks the NYU ITP/IMA proxy (gpt-4o-mini) to reword a
// written line, and always comes back with something sayable: the AI's line
// if it passes engine/reword.js's checks, else the written one.
//
// On by default. Off with ?ai=0 in the URL, localStorage dw2_ai = "0", or
// window.__dwAI = false (the test harnesses set this via scripts/test-mute.js,
// so their runs stay word-for-word). Nothing is cached.
import { buildMessages, validate, joinOutput, MAX_TOKENS } from "../engine/reword.js";

export const PROXY = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
export const MODEL = "openai/gpt-4o-mini";
export const TIMEOUT_MS = 5000;

export function aiEnabled() {
  try {
    if (window.__dwAI === false) return false;
    if (new URLSearchParams(location.search).get("ai") === "0") return false;
    if (localStorage.getItem("dw2_ai") === "0") return false;
    if (navigator.onLine === false) return false;
  } catch (_) { /* fine */ }
  return typeof fetch === "function";
}

// Resolves to { text, ai } where ai says whether the line is the model's.
export async function reword(helper, line, { asked, timeoutMs = TIMEOUT_MS } = {}) {
  const fallback = { text: line.text, ai: false };
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    const res = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl?.signal,
      body: JSON.stringify({
        model: MODEL,
        input: { messages: buildMessages(helper, line, { asked }), temperature: 0.9, max_tokens: MAX_TOKENS },
      }),
    });
    if (!res.ok) return fallback;
    const text = validate(joinOutput(await res.json()), line);
    return text ? { text, ai: true } : fallback;
  } catch (_) {
    return fallback; // offline, aborted at the timeout, or bad JSON
  } finally {
    clearTimeout(timer);
  }
}
