// Sound: every decision, action and screen maps to a sound that exists; the
// music loops are whole bars; each pet babbles in its own voice; mute persists
// and a muted (or test) page never opens an AudioContext.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SFX, sfxNames } from "../audio/sounds.js";
import { TRACKS, trackEvents, STINGS, LEVEL_TRACK, chord } from "../audio/music.js";
import { VOICES, babble, MAX_VOICE_S } from "../audio/voices.js";
import { ACTION_SFX, actionCue, plantCue, decisionCues, driftOnScreen } from "../audio/cues.js";
import { kinds } from "../actions/registry.js";
import { LEVELS } from "../levels/index.js";
import { createRun, reduce, currentStep } from "../engine/level-runner.js";

const V2 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const exists = (name) => Object.hasOwn(SFX, name);

test("audio: every sound has a group, a description and a play function", () => {
  assert.ok(sfxNames().length >= 60, `only ${sfxNames().length} sounds`);
  for (const [name, def] of Object.entries(SFX)) {
    assert.match(name, /^[a-z0-9-]+$/, name);
    assert.equal(typeof def.play, "function", name);
    assert.ok(def.group && def.desc, name);
  }
});

test("audio: every action kind in the registry has its own sound", () => {
  for (const kind of kinds()) {
    assert.ok(Object.hasOwn(ACTION_SFX, kind), `no sound for action kind "${kind}"`);
    assert.ok(exists(actionCue(kind)), `${kind} → ${actionCue(kind)} is not a sound`);
  }
  for (const name of Object.values(ACTION_SFX)) assert.ok(exists(name), name);
});

test("audio: every plant state in the art maps to grow / wilt / rot", () => {
  const states = new Set(readdirSync(path.join(V2, "art")).map((f) => /^[a-z]+-([a-z]+)\.svg$/.exec(f)?.[1]).filter(Boolean));
  for (const s of states) {
    const cue = plantCue(s);
    assert.ok(["grow", "wilt", "rot"].includes(cue), `${s} → ${cue}`);
  }
  assert.equal(plantCue("thriving"), "grow");
  assert.equal(plantCue("wilted"), "wilt");
  assert.equal(plantCue("rotting"), "rot");
});

// Every action a player can take, on every step of every level, in every phase.
function everyDecision(fn) {
  for (const level of Object.values(LEVELS)) {
    level.steps.forEach((step, stepIndex) => {
      for (const phase of ["ask", "advice", "pushback", "disagree", "name", "fix", "reanswer"]) {
        const state = { ...createRun(level), stepIndex, phase };
        const actions = [
          { type: "ask" }, { type: "chat", reply: "…" }, { type: "doIt" }, { type: "flag" }, { type: "override" },
          ...(step.place?.beds || []).map((bed) => ({ type: "place", bed })),
          ...(step.flawOptions || []).map((o) => ({ type: "name", id: o.id })),
          ...(step.fixOptions || []).map((o) => ({ type: "fix", id: o.id })),
          ...(level.evidence || []).map((e) => ({ type: "check", id: e.id })),
        ];
        for (const action of actions) {
          let out;
          try { out = reduce(level, state, action); } catch { continue; }
          if (out.state === state && out.effects.length === 0) continue;
          fn({ level, step: currentStep(level, state), state, action, out });
        }
      }
    });
  }
}

test("audio: every decision in every level maps to sounds that exist", () => {
  let n = 0;
  everyDecision(({ level, step, state, action, out }) => {
    const heard = decisionCues(step, state, action, out, { pet: level.helper.id });
    for (const c of heard) assert.ok(exists(c.name), `${level.id} ${state.phase}/${action.type} → "${c.name}" is not a sound`);
    if (["ask", "chat", "doIt", "flag", "override", "place", "name", "fix"].includes(action.type)) {
      assert.ok(heard.some((c) => !c.react), `${level.id} step ${state.stepIndex} ${state.phase}/${action.type}: the choice itself is silent`);
    }
    n += 1;
  });
  assert.ok(n > 100, `only ${n} decisions checked`);
});

test("audio: the decisions sound like what they are", () => {
  const seen = new Map();
  everyDecision(({ level, step, state, action, out }) => {
    const names = decisionCues(step, state, action, out, { pet: level.helper.id }).map((c) => c.name);
    const key = `${state.phase}/${action.type}/${step.kind}${step.permission ? "+permit" : ""}`;
    if (!seen.has(key)) seen.set(key, new Set());
    names.forEach((x) => seen.get(key).add(x));
    if (state.phase === "advice" && action.type === "doIt" && step.kind === "trust") assert.ok(names.includes("do-it") && names.includes("pet-happy"), key);
    if (state.phase === "advice" && action.type === "flag" && step.kind === "drift" && !step.pushback) assert.ok(names.includes("pet-sheepish"), `${level.id}: caught → sheepish`);
    if (state.phase === "advice" && action.type === "flag" && step.pushback) assert.ok(names.includes("pushback"), `${level.id}: argues back`);
    if (state.phase === "pushback" && action.type === "flag") assert.ok(names.includes("stand-firm"), key);
    if (state.phase === "disagree" && action.type === "override") assert.ok(names.includes("my-way"), key);
    if (state.phase === "disagree" && action.type === "doIt") assert.ok(names.includes("their-way"), key);
    if (action.type === "name") assert.ok(names.includes(out.state.phase === "fix" ? "flaw-right" : "flaw-wrong"), key);
    if (action.type === "fix") assert.ok(names.includes(out.state.phase === "reanswer" ? "fix-right" : "fix-wrong"), key);
    if (step.kind === "hook" && state.phase === "advice" && action.type === "doIt") assert.ok(names.includes("stay-phone"), key);
    if (step.kind === "hook" && state.phase === "advice" && action.type === "flag") assert.ok(names.includes("put-down"), key);
    if (step.permission && state.phase === "advice" && action.type === "doIt") assert.ok(names.includes("allow"), key);
    if (out.state.garden < state.garden) assert.ok(names.includes("meter-down"), `${key}: the meter fell silently`);
    if (out.state.garden > state.garden) assert.ok(names.includes("meter-up"), `${key}: the meter rose silently`);
  });
  // A trust step's disagreement makes the pet concede somewhere in the game.
  assert.ok([...seen.values()].some((s) => s.has("pet-concede")), "no pet ever concedes");
  assert.ok([...seen.values()].some((s) => s.has("pet-drift")), "no drift motif");
});

test("audio: the drift layer is on exactly while a drift is on screen", () => {
  const level = LEVELS["level-1"];
  const drift = level.steps.find((s) => s.kind === "drift");
  const trust = level.steps.find((s) => s.kind === "trust");
  assert.equal(driftOnScreen(drift, { phase: "advice" }), true);
  assert.equal(driftOnScreen(drift, { phase: "pushback" }), true);
  assert.equal(driftOnScreen(drift, { phase: "name" }), false);
  assert.equal(driftOnScreen(trust, { phase: "advice" }), false);
});

test("audio: a pet stinger takes that pet's own wave", () => {
  for (const id of ["mango", "luna", "ember", "biscuit", "bugs"]) assert.ok(VOICES[id], id);
  for (const l of Object.values(LEVELS)) assert.ok(VOICES[l.helper.id], `${l.helper.id} has no voice`);
});

test("audio: every sound named in the UI code exists (sfx(\"…\"), data-sfx)", () => {
  const files = ["main.js", ...readdirSync(path.join(V2, "ui")).map((f) => `ui/${f}`), ...readdirSync(path.join(V2, "actions")).map((f) => `actions/${f}`)]
    .filter((f) => f.endsWith(".js"));
  const used = new Set();
  for (const f of files) {
    const src = readFileSync(path.join(V2, f), "utf8");
    for (const m of src.matchAll(/\bsfx\("([a-z0-9-]+)"/g)) used.add(m[1]);
    for (const m of src.matchAll(/"data-sfx": "([a-z0-9-]+)"/g)) used.add(m[1]);
  }
  assert.ok(used.size >= 20, `only ${used.size} sounds wired`);
  for (const name of used) assert.ok(exists(name), `"${name}" is used but not defined`);
  for (const s of ["caught", "fooled"]) assert.ok(STINGS[s], s);
});

test("audio: every track is 8 whole bars that loop, with a tense layer", () => {
  for (const name of Object.keys(TRACKS)) {
    const { events, loop, bar } = trackEvents(name);
    assert.ok(Math.abs(loop - bar * 8) < 1e-9, name);
    assert.ok(events.length > 40, `${name}: ${events.length} events`);
    for (const e of events) {
      assert.ok(e.t >= 0 && e.t < loop, `${name}: event at ${e.t}`);
      assert.ok(e.type === "noise" || (Number.isFinite(e.f) && e.f > 20 && e.f < 8000), `${name}: ${e.f} Hz`);
      assert.ok(e.vol > 0 && e.vol <= 0.5, `${name}: vol ${e.vol}`);
    }
    assert.ok(events.some((e) => e.layer === "tense"), `${name}: no tense layer`);
  }
  for (const id of Object.keys(LEVELS)) assert.ok(TRACKS[LEVEL_TRACK[id]], `${id} has no track`);
  assert.throws(() => chord("H7"));
});

test("audio: each speaker babbles in its own voice, quietly bounded", () => {
  const line = "Mango here! Ask me ANYTHING about your garden. You're going to crush this.";
  const plans = Object.fromEntries(Object.keys(VOICES).map((id) => [id, babble(id, line)]));
  assert.deepEqual(babble("luna", line), plans.luna, "the same line babbles the same way");
  const sig = (id) => `${VOICES[id].type}|${VOICES[id].base}|${VOICES[id].syl}`;
  assert.equal(new Set(Object.keys(VOICES).map(sig)).size, Object.keys(VOICES).length, "two speakers share a voice");
  for (const [id, p] of Object.entries(plans)) {
    assert.ok(p.blips.length > 3, id);
    assert.ok(p.length <= MAX_VOICE_S + 0.6, `${id}: ${p.length}s`);
  }
  // Bugs is slower and softer than Mango; Rowan is the lowest voice.
  const pace = (id) => plans[id].blips.length / plans[id].length;
  assert.ok(pace("bugs") < pace("mango"), "Bugs talks slower than Mango");
  assert.ok(VOICES.bugs.vol * 1 < 0.25 && VOICES.bugs.type === "sine", "Bugs is soft");
  const low = (id) => Math.min(...plans[id].blips.map((b) => b.note));
  for (const id of Object.keys(VOICES)) if (id !== "rowan") assert.ok(low("rowan") < low(id), `Rowan under ${id}`);
  assert.equal(babble("mango", "").blips.length, 0);
});

test("audio: mute persists in dw_audio_muted, and a muted or test page never opens an AudioContext", async () => {
  const data = new Map();
  let made = 0;
  globalThis.window = {
    localStorage: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) },
    AudioContext: function () { made += 1; throw new Error("no audio in tests"); },
  };
  try {
    const a = await import("../audio/index.js?mute-1");
    assert.equal(a.isMuted(), false);
    a.setMuted(true);
    assert.equal(data.get("dw_audio_muted"), "1");
    a.sfx("do-it"); a.voice("mango", "hi there"); a.music("title");
    assert.equal(made, 0, "muted: no context");
    // a fresh page load reads it back
    const b = await import("../audio/index.js?mute-2");
    assert.equal(b.isMuted(), true);
    // test runs: scripts/test-mute.js sets __dwAudioSilent; even unmuted, no context
    window.__dwAudioSilent = true;
    b.setMuted(false);
    assert.equal(data.get("dw_audio_muted"), "0");
    b.sfx("do-it");
    assert.equal(made, 0, "silent: no context");
    assert.ok(window.__dwAudioLog.some((e) => e.kind === "sfx" && e.name === "do-it"), "cues are still logged");
  } finally {
    delete globalThis.window;
  }
});

test("audio: scripts/test-mute.js keeps test browsers silent", () => {
  const src = readFileSync(path.join(V2, "..", "scripts", "test-mute.js"), "utf8");
  assert.match(src, /dw_audio_muted/);
  assert.match(src, /__dwAudioSilent\s*=\s*true/);
});
