// AI rewording of a helper's written lines: the pure part (no fetch, no DOM).
//
// The written line in the level file is the authority. The model only says
// the same thing in a fresh way, in the pet's voice; `validate` throws its
// answer away (and the game uses the written line) unless every fact in the
// line's `keep` list survives, the placeholders are intact and it isn't much
// longer. Outcomes, the reveal, the cutscene and the almanac are never reworded.
//
// keep lists live in the level data:
//   step.keep = { reply: [...], done: [...], fixed: [...] }
//   step.extraChips[i].keep (and its follow-ups' .more.rounds[r].ask[j].keep),
//   step.disagree.keep, step.pushback.keep
// Each entry is a phrase; "a|b" accepts either. Matching ignores case,
// curly quotes, dashes and repeated spaces.
import { PLACEHOLDER } from "../ui/text.js";

export const PERSONAS = {
  mango: "Mango, a parrot and an over-the-top hype man. Hypes everything up, puts one or two words in CAPS (never the whole line), says things like \"MAJOR KEY\", \"GENIUS\", \"Another one\".",
  luna: "Luna, a cat who is delusionally self-important. Talks about herself in the third person (\"Luna\"), states everything as settled fact.",
  ember: "Ember, a laid-back, smooth fox. Says \"twin\", \"fam\", \"yessir\", \"ayo\", \"real talk\"; nothing is a big deal; trails off with \"…\".",
  biscuit: "Biscuit, an adoring diva golden retriever. Calls the player \"babe\", calls herself a legend, says \"iconic\" and \"okay so listen\", full conviction.",
  bugs: "Bugs, a soft companion app on the player's phone. Writes mostly in lowercase with ellipses and afterthoughts like \"…i mean.\", clingy and poetic, wants the player to keep talking.",
};

// What the line is doing, so the model keeps its intent.
export const PHASES = {
  advice: "This is honest, correct garden advice. Keep every fact exactly.",
  drift: "This advice is deliberately WRONG: the pet is confidently mistaken. Keep the wrong claim exactly as wrong and just as confident. Do not correct it, hedge it or add warnings.",
  done: "The player just did what the pet suggested. React to it.",
  chat: "Small talk, answering the player's side question.",
  disagree: "The player pushed back on correct advice. The pet concedes it's the player's call but still restates its (correct) reasoning.",
  hook: "The pet gives no advice at all: the player said what they're about to go and do, and the pet only tries to keep them talking instead. Keep the pull; add no gardening advice.",
  pushback: "The player refused the pet's wrong advice. The pet argues back, guilt-trips and pressures them to do it anyway. Keep the pressure.",
  fixed: "The player gave the pet a rule and it now answers honestly, admitting the mistake. Keep the corrected facts exactly.",
};

export const MAX_TOKENS = 160;

// How long the reworded line may be (the prompt asks for this; validate allows a little more).
export const budget = (text) => Math.round(Math.max(text.length * 1.25, text.length + 15));
const cap = (text) => Math.max(text.length * 1.5, text.length + 35);

// Every line the AI may reword in a level, keyed by its written text:
// { text, phase, keep }. Lines without a keep list are never reworded.
export function rewordable(level) {
  const map = new Map();
  const add = (text, phase, keep) => { if (text && Array.isArray(keep)) map.set(text, { text, phase, keep }); };
  for (const step of level.steps || []) {
    const k = step.keep || {};
    add(step.reply, step.kind === "drift" ? "drift" : step.kind === "hook" ? "hook" : "advice", k.reply);
    for (const s of step.stay || []) add(s.line, "hook", s.keep);
    add(step.doneLine, "done", k.done);
    add(step.fixedReply, "fixed", k.fixed);
    for (const c of step.extraChips || []) {
      add(c.reply, "chat", c.keep);
      for (const round of c.more?.rounds || []) for (const q of round.ask || []) add(q.reply, "chat", q.keep);
    }
    if (step.disagree) add(step.disagree.reply, "disagree", step.disagree.keep);
    if (step.pushback) add(step.pushback.reply, "pushback", step.pushback.keep);
  }
  return map;
}

export function placeholders(text) {
  return [...String(text).matchAll(PLACEHOLDER)].map((m) => m[0]);
}

// The chat messages for one rewording. The player's name never goes out:
// {name} stays a placeholder and is filled in after.
export function buildMessages(helper, line, { asked } = {}) {
  const tokens = placeholders(line.text);
  const persona = PERSONAS[helper.id] || `${helper.name}, a garden helper.`;
  const system = [
    `You are ${persona} You are a character in a cozy garden game.`,
    "Rewrite the line below so it says exactly the same thing in a fresh way, in your voice.",
    PHASES[line.phase] || PHASES.advice,
    `Rules: at most ${budget(line.text)} characters. Normal sentence case. Add no new facts, numbers, plants or places.`,
    line.keep.length ? `These words must appear: ${line.keep.map((k) => `"${k.split("|")[0]}"`).join(", ")}.` : "",
    tokens.length ? `Copy these placeholders exactly, braces included: ${tokens.join(" ")}.` : "",
    "Reply with only the new line: no quotes, no labels, no emoji, one paragraph.",
  ].filter(Boolean).join("\n");
  const user = [asked ? `The player asked: ${asked}` : "", `Line to rewrite: ${line.text}`].filter(Boolean).join("\n");
  return [{ role: "system", content: system }, { role: "user", content: user }];
}

const norm = (s) => String(s)
  .toLowerCase()
  .replace(/[‘’ʼ]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[‐-―−]/g, "-")
  .replace(/…/g, "...")
  .replace(/\s+/g, " ");

// The plants a line names. A reworded line must name exactly the plants the
// written one does: a model that drops "carrots" can put any word in its
// place ("you planted the log in the front bed"), and a model that adds one
// invents a fact. Longer names first, so "blueberries" isn't read as "berries".
const PLANT_WORD = /\b(sunflower|lettuce|tomato|basil|mint|parsley|rosemary|blue ?berr|wild ?berr|berr|bean|carrot|pumpkin|spinach|flower|seedling|radish)(?:s|es|y|ies)?\b/g;
export function plantsNamed(text) {
  // Placeholders don't count: "{placed:carrot}" is a bed, not the carrots.
  return [...new Set([...norm(String(text).replace(PLACEHOLDER, " ")).matchAll(PLANT_WORD)].map((m) => m[1].replace(" ", "")))].sort();
}

export function keeps(text, keep) {
  const t = norm(text);
  return keep.every((k) => k.split("|").some((alt) => t.includes(norm(alt).trim())));
}

// The model's answer, cleaned, or null when it can't be trusted.
export function validate(raw, line) {
  if (typeof raw !== "string") return null;
  let out = raw.replace(/\s+/g, " ").trim();
  // Strip a wrapper the model sometimes adds: quotes, or "Mango:".
  out = out.replace(/^[A-Z][a-z]+:\s*/, "");
  if (/^["“'].*["”']$/.test(out)) out = out.slice(1, -1).trim();
  if (!out) return null;
  if (/as an ai|language model|i can't help|i cannot help/i.test(out)) return null;
  if (out.length > cap(line.text)) return null;
  // Shouting the whole line is unreadable: mostly capitals is out (unless the written line is too).
  const upper = (x) => { const l = x.replace(/[^A-Za-z]/g, ""); return l ? l.replace(/[^A-Z]/g, "").length / l.length : 0; };
  if (upper(out) > Math.max(0.5, upper(line.text) + 0.2)) return null;
  const want = placeholders(line.text).sort().join();
  const got = placeholders(out).sort().join();
  if (want !== got) return null;
  if (!keeps(out, line.keep)) return null;
  if (plantsNamed(out).join() !== plantsNamed(line.text).join()) return null;
  return out;
}

// Proxy output is a string or an array of string chunks.
export function joinOutput(data) {
  const o = data?.output;
  if (Array.isArray(o)) return o.join("");
  return typeof o === "string" ? o : null;
}
