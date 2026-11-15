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

// Asked ahead: when the question chips appear, the game asks the AI for each
// chip's answer straight away, so by the time the player taps one the
// rewording is usually back and the helper only thinks for a moment. Each
// prefetched answer is used once, so asking again gets a fresh wording.
const ahead = new Map();
const keyOf = (helper, line, asked) => `${helper?.id}|${line.text}|${asked || ""}`;
export function prefetch(helper, line, opts = {}) {
  const key = keyOf(helper, line, opts.asked);
  if (!ahead.has(key)) ahead.set(key, fetchReword(helper, line, opts));
}
// Drop answers asked ahead for chips that weren't tapped (a new step, a new screen).
export function forgetPrefetched() { ahead.clear(); }

// Resolves to { text, ai } where ai says whether the line is the model's.
export function reword(helper, line, opts = {}) {
  const key = keyOf(helper, line, opts.asked);
  const early = ahead.get(key);
  if (early) { ahead.delete(key); return early; }
  return fetchReword(helper, line, opts);
}

async function fetchReword(helper, line, { asked, timeoutMs = TIMEOUT_MS } = {}) {
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
