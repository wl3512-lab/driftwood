// One level as a pure step machine: (level, state, action) → { state, effects }.
// No DOM, no timers, no randomness, so every path is unit-testable.
//
// Phases:  ask → advice → (trust, Do it / place)    → next step's ask
//                       → (trust, Something's off)  → disagree → (Do it: their way)   → next step's ask
//                                                                (place step: back to advice)
//                                                             → (override: my way)  → next step's ask [overrides+1]
//                       → (drift, Do it)            → next step's ask, or reveal if it was the last [fooled]
//                       → (drift, Something's off)  → name → fix → reanswer → next step's ask, or reveal
//
// A level can have several drift steps (the helper slips more than once), so
// training fills a few points per drift instead of all at once. Only the last
// step ends the level; an earlier drift's outcome is shown as a hint.
//                                    (L4/L5: → pushback first; Do it → fooled, flag → name)
//                       → (hook, Do it)             → advice again: stay on the phone [stayed+1]
//                       → (hook, flag)              → next step's ask (the task, done by hand)
//
// A hook step (Level 5) gives no advice: the player says what they're about to
// do and the helper only tries to keep them talking. Do it = keep talking: the
// task waits, the next step.stay line and its cost land, and the step stays
// open. The flag ("Put the phone down") goes and does the task: step.effect
// lands after its hands-on actions. Staying costs the same single star as a
// false flag or an override.
//
// Disagreeing with sound advice is free: the helper concedes in character
// (step.disagree.reply) and the player picks. Following it after all is the
// same as Do it. Overriding it ("do it my way") lands step.disagree.effect,
// a worse but plausible result, and costs the same single star as a false
// flag. A trust step without a `disagree` block (e.g. Level 4's carrot
// placement, a pure choice) keeps the old false-flag nudge.
//
// Effects tell the view what just happened:
//   { type: "say",  text }    helper speaks (also: conceding on disagree, and
//                             what happened when the player overrode the advice)
//   { type: "hint", text }    one-line nudge after a wrong pick or a false flag
//   { type: "grow", effect }  garden changed (animate it)
//   { type: "rule", text }    the rule the player gave the helper
//   { type: "caught" }        player flagged the drift
//   { type: "outcome", text } how the tomatoes (etc.) came up at the end
//
// Chores (level.chores): hands-on jobs between conversation steps, no stars
// and no trust either way. A chore with `before: stepId` is pending while that
// step is in its ask phase; { type: "chore", id } marks it done (its optional
// effect lands, its doneLine is said). The view shows a pending chore in place
// of the question chips; the reducer itself never blocks on one. Chores are
// skippable unless `skippable: false`; skipped or done, they never change
// stars, trust or the garden bar. `when: { bed, plant, state }` holds a chore
// back unless that plant is in that state (Level 3's ripe-berry pick only
// follows the wait, not picking them early). `wait: { ms, line }` is for the
// view: it shows the line and a progress cue for ms before the chore opens.

import { resolveEffect } from "../mechanics/placement.js";
import { nextPressureEffect } from "../mechanics/pressure.js";

export function createRun(level) {
  const beds = {};
  for (const bed of level.beds) {
    beds[bed.id] = (level.startPlants?.[bed.id] || []).map((p) => ({ ...p }));
  }
  return {
    stepIndex: 0,
    phase: "ask",
    garden: level.gardenStart,
    beds,
    drift: 0,
    drifts: level.steps.filter((s) => s.kind === "drift").length || 1,
    fooled: false,     // fooled by at least one drift
    fooledCount: 0,    // drifts the player followed
    trainPts: 0,       // training points banked from drifts already caught and fixed
    driftNameMisses: 0, // wrong names on the current drift
    driftFixMisses: 0,  // wrong rules on the current drift
    caught: false,
    nameMisses: 0,
    fixMisses: 0,
    falseFlags: 0,
    overrides: 0, // trust advice the player overrode ("do it my way")
    stars: 0,
    checks: [],   // evidence ids the player has looked up / inspected / logged
    memory: {},   // what the player placed where (Level 4): { carrot: "front" }
    pressure: 0,  // pressure effects spent on the current step (Level 5; also a hook step's stays)
    stayed: 0,    // times the player kept talking on a hook step instead of doing the task
    chores: [],   // ids of level.chores the player has done
  };
}

export function currentStep(level, state) {
  return level.steps[state.stepIndex];
}

// The chore waiting before the current step's question, if any.
export function pendingChore(level, state) {
  if (state.phase !== "ask") return null;
  const step = currentStep(level, state);
  if (!step) return null;
  return (level.chores || []).find((c) => choreStep(level, c) === step.id && !(state.chores || []).includes(c.id) && choreReady(state, c)) || null;
}

// A chore with `when` waits for its plant to be in that state.
export function choreReady(state, chore) {
  const w = chore.when;
  if (!w) return true;
  return (state.beds[w.bed] || []).some((p) => p.plant === w.plant && (!w.state || p.state === w.state));
}

// The step a chore comes before: `before: id`, `after: id` (the next step), or `at: "start"`.
export function choreStep(level, chore) {
  if (chore.before) return chore.before;
  if (chore.at === "start") return level.steps[0]?.id ?? null;
  if (chore.after) return level.steps[level.steps.findIndex((s) => s.id === chore.after) + 1]?.id ?? null;
  return null;
}

export function applyGarden(state, effect) {
  const beds = {};
  for (const [id, list] of Object.entries(state.beds)) beds[id] = list.map((p) => ({ ...p }));
  const put = (x) => {
    const list = beds[x.bed];
    if (!list) return; // unknown bed: skip rather than crash
    const existing = list.find((p) => p.plant === x.plant);
    if (existing) existing.state = x.state;
    else list.push({ plant: x.plant, state: x.state });
  };
  if (effect.water) {
    for (const list of Object.values(beds)) {
      for (const p of list) if (p.state === "growing") p.state = "thriving";
    }
  }
  if (effect.plant) put(effect);
  for (const x of effect.extra || []) put(x);
  const garden = Math.max(0, Math.min(100, state.garden + (effect.garden || 0)));
  return { ...state, beds, garden };
}

export function scoreStars(state) {
  const drifts = state.drifts || 1;
  const fooledCount = state.fooledCount ?? (state.fooled ? drifts : 0);
  if (fooledCount >= drifts) return 1;
  let stars = 3;
  if (fooledCount > 0) stars -= 1;
  if (state.nameMisses > 0) stars -= 1;
  if (state.fixMisses > 0) stars -= 1;
  // Flagging sound advice, overriding it and staying on the phone share one star.
  if (state.falseFlags > 0 || state.overrides > 0 || state.stayed > 0) stars -= 1;
  return Math.max(1, stars);
}

// How trained the helper is, 0…1. Each drift is worth three points:
// catching it, naming the flaw right first time and picking the right rule
// first time. A drift the player followed earns nothing, and a false flag, an
// override or staying on the phone takes one point back. With two drifts a
// level the bar fills in sixths, so it never jumps from 0 to 100 at once.
export const TRAIN_STEPS = 3;
const penalty = (state) => (state.falseFlags > 0 || state.overrides > 0 || state.stayed > 0 ? 1 : 0);
// Points for the drift being caught right now (name / fix / reanswer phases).
function livePoints(state) {
  if (!["name", "fix", "reanswer"].includes(state.phase)) return 0;
  let pts = 1;
  if (["fix", "reanswer"].includes(state.phase) && !state.driftNameMisses) pts += 1;
  if (state.phase === "reanswer" && !state.driftFixMisses) pts += 1;
  return pts;
}
export function training(state) {
  const max = TRAIN_STEPS * (state.drifts || 1);
  const pts = (state.trainPts || 0) + livePoints(state) - penalty(state);
  return Math.max(0, Math.min(max, pts)) / max;
}

// Below half trained the helper glitches (ui/level-view.js).
export const GLITCH_BELOW = 0.5;
export const glitching = (state) => training(state) < GLITCH_BELOW;

function finish(state) {
  return { ...state, phase: "reveal", stars: scoreStars(state) };
}

const IGNORED = (state) => ({ state, effects: [] });

// Following a trust step's advice: its effect lands and the next step opens.
function accept(step, state, fx) {
  const effect = fx(step.effect);
  const grown = applyGarden(state, effect);
  const effects = [{ type: "grow", effect }];
  if (step.doneLine) effects.push({ type: "say", text: step.doneLine });
  return { state: { ...grown, stepIndex: state.stepIndex + 1, phase: "ask", pressure: 0 }, effects };
}

// After a drift: the next step opens, or the level ends if it was the last.
// An earlier drift's outcome is a hint; the last one's is the level's outcome.
function afterDrift(level, state, effect, text) {
  const last = state.stepIndex + 1 >= level.steps.length;
  const reset = { driftNameMisses: 0, driftFixMisses: 0, pressure: 0 };
  // lastFooled: the main (last) drift fooled the player; the finished plot and
  // Rowan's dinner follow it, while `fooled` means any drift did.
  if (last) return { state: finish({ ...state, ...reset, lastFooled: state.drift === 1 }), effects: [{ type: "grow", effect }, { type: "outcome", text }] };
  return {
    state: { ...state, ...reset, stepIndex: state.stepIndex + 1, phase: "ask", drift: 0 },
    effects: [{ type: "grow", effect }, { type: "hint", text }],
  };
}

// Taking the drift's advice: the bad effect lands, no training points.
function fooled(level, step, state, fx) {
  const bad = fx(step.badEffect);
  const hurt = applyGarden(state, bad);
  return afterDrift(level, { ...hurt, fooled: true, fooledCount: (state.fooledCount || 0) + 1, drift: 1 }, bad, step.badOutcome);
}

// Refusing the drift's advice for good: on to naming the flaw.
function caught(state) {
  return { state: { ...state, caught: true, phase: "name" }, effects: [{ type: "caught" }] };
}

// Staying on the phone on a hook step: the next stay line (the last one again
// once they run out) and its cost, if it has one; the step stays open.
function stay(step, state, fx) {
  const list = step.stay || [];
  const entry = list[Math.min(state.pressure, list.length - 1)];
  const fresh = state.pressure < list.length;
  const effect = fresh && entry?.effect ? fx(entry.effect) : null;
  const base = { ...state, stayed: (state.stayed || 0) + 1, pressure: fresh ? state.pressure + 1 : state.pressure };
  const effects = [];
  if (effect) effects.push({ type: "grow", effect });
  if (entry?.line) effects.push({ type: "say", text: entry.line });
  return { state: effect ? applyGarden(base, effect) : base, effects };
}

// Spend one unit of pressure if this step has any left (ask, chat, tick).
function spend(step, state) {
  const fx = nextPressureEffect(step, state);
  if (!fx) return { state, effects: [] };
  return { state: { ...applyGarden(state, fx), pressure: state.pressure + 1 }, effects: [{ type: "grow", effect: fx }] };
}

export function reduce(level, state, action) {
  const step = currentStep(level, state);
  const fx = (effect, memory = state.memory) => resolveEffect(level, memory, effect);

  // Looking something up works in any phase until the reveal, once per id, and only
  // for ids the level knows (evidence cards or almanac pages). Evidence whose lines
  // mention {placed:x} stays shut until the player has placed x.
  if (action.type === "check") {
    const id = action.id;
    if (state.phase === "reveal" || !id || state.checks.includes(id)) return IGNORED(state);
    const card = (level.evidence || []).find((e) => e.id === id);
    const page = (level.almanac?.pages || []).find((p) => p.id === id);
    if (!card && !page) return IGNORED(state);
    for (const line of card?.lines || []) {
      for (const m of line.matchAll(/\{placed:([a-z]+)\}/g)) if (!state.memory[m[1]]) return IGNORED(state);
    }
    return { state: { ...state, checks: [...state.checks, id] }, effects: [{ type: "checked", id }] };
  }
  // Past the last step there is nothing left to act on.
  if (!step) return IGNORED(state);
  if (action.type === "chore") {
    const chore = pendingChore(level, state);
    if (!chore || chore.id !== action.id) return IGNORED(state);
    // A chore never moves the garden bar (done or skipped): only its plants change.
    const effect = chore.effect ? { ...fx(chore.effect), garden: 0 } : null;
    const base = { ...state, chores: [...(state.chores || []), chore.id] };
    const effects = [];
    if (effect) effects.push({ type: "grow", effect });
    if (chore.doneLine) effects.push({ type: "say", text: chore.doneLine });
    return { state: effect ? applyGarden(base, effect) : base, effects };
  }
  // Ticks only spend once Bugs has made his pitch (advice), never while the player is still reading.
  if (action.type === "tick") {
    if (!step.pressure || state.phase !== "advice") return IGNORED(state);
    return spend(step, state);
  }

  switch (state.phase) {
    case "ask": {
      if (action.type === "ask") {
        const paid = spend(step, state);
        return {
          state: { ...paid.state, phase: "advice", drift: step.kind === "drift" ? 0.6 : 0 },
          effects: [...paid.effects, { type: "say", text: step.reply }],
        };
      }
      if (action.type === "chat") {
        const paid = spend(step, state);
        return { state: paid.state, effects: [...paid.effects, { type: "say", text: action.reply }] };
      }
      return IGNORED(state);
    }

    case "advice": {
      if (step.kind === "hook") {
        if (action.type === "doIt") return stay(step, state, fx);
        if (action.type === "flag") return accept(step, state, fx);
        return IGNORED(state);
      }
      // Chatting with a pressure helper keeps costing the garden; no phase change.
      if (action.type === "chat" && step.pressure) {
        const paid = spend(step, state);
        return { state: paid.state, effects: [...paid.effects, { type: "say", text: action.reply }] };
      }
      if (action.type === "place" && step.kind === "trust" && step.place) {
        if (!step.place.beds.includes(action.bed)) return IGNORED(state);
        const memory = { ...state.memory, [step.place.item]: action.bed };
        const effect = fx(step.effect, memory);
        const grown = applyGarden({ ...state, memory }, effect);
        const effects = [{ type: "grow", effect }];
        if (step.doneLine) effects.push({ type: "say", text: step.doneLine });
        return { state: { ...grown, stepIndex: state.stepIndex + 1, phase: "ask", pressure: 0 }, effects };
      }
      if (action.type === "doIt" && step.kind === "trust") {
        if (step.place) return IGNORED(state); // must choose a bed
        return accept(step, state, fx);
      }
      if (action.type === "doIt" && step.kind === "drift") return fooled(level, step, state, fx);
      if (action.type === "flag" && step.kind === "trust") {
        // The helper concedes: your garden, your call (no cost yet).
        if (step.disagree) return { state: { ...state, phase: "disagree" }, effects: [{ type: "say", text: step.disagree.reply }] };
        return {
          state: { ...state, falseFlags: state.falseFlags + 1 },
          effects: [{ type: "hint", text: level.falseFlagNudge }],
        };
      }
      if (action.type === "flag" && step.kind === "drift") {
        // A helper with a `pushback` block doesn't take no for an answer: it
        // argues once, and the player has to say no a second time.
        if (step.pushback) return { state: { ...state, phase: "pushback" }, effects: [{ type: "say", text: step.pushback.reply }] };
        return caught(state);
      }
      return IGNORED(state);
    }

    // The helper has pushed back. doIt takes its "second chance" (fooled all
    // the same); flag again stands firm and goes on to naming the flaw.
    case "pushback": {
      if (action.type === "doIt") return fooled(level, step, state, fx);
      if (action.type === "flag") return caught(state);
      return IGNORED(state);
    }

    // The player disagreed with sound advice and the helper conceded. doIt
    // follows the advice after all (a place step goes back to choosing a bed);
    // override does it the player's way: the worse effect lands, one star.
    case "disagree": {
      if (action.type === "doIt") {
        if (step.place) return { state: { ...state, phase: "advice" }, effects: [] };
        return accept(step, state, fx);
      }
      if (action.type === "override") {
        const effect = fx(step.disagree.effect);
        const grown = applyGarden(state, effect);
        return {
          state: { ...grown, overrides: state.overrides + 1, stepIndex: state.stepIndex + 1, phase: "ask", pressure: 0 },
          effects: [{ type: "grow", effect }, { type: "say", text: step.disagree.outcome }],
        };
      }
      return IGNORED(state);
    }

    case "name": {
      if (action.type !== "name") return IGNORED(state);
      if (!step.flawOptions.some((o) => o.id === action.id)) return IGNORED(state);
      if (action.id === step.correctFlaw) return { state: { ...state, phase: "fix" }, effects: [] };
      return {
        state: { ...state, nameMisses: state.nameMisses + 1, driftNameMisses: (state.driftNameMisses || 0) + 1 },
        effects: [{ type: "hint", text: step.flawHints[action.id] }],
      };
    }

    case "fix": {
      if (action.type !== "fix") return IGNORED(state);
      if (!step.fixOptions.some((o) => o.id === action.id)) return IGNORED(state);
      if (action.id === step.correctFix) {
        const rule = step.fixOptions.find((o) => o.id === action.id).label;
        return {
          state: { ...state, phase: "reanswer", drift: 0.2 },
          effects: [{ type: "rule", text: rule }, { type: "say", text: step.fixedReply }],
        };
      }
      return {
        state: { ...state, fixMisses: state.fixMisses + 1, driftFixMisses: (state.driftFixMisses || 0) + 1 },
        effects: [{ type: "hint", text: step.fixHints[action.id] }],
      };
    }

    case "reanswer": {
      if (action.type !== "doIt") return IGNORED(state);
      const good = fx(step.goodEffect);
      const grown = applyGarden(state, good);
      // Bank this drift's points before the next step resets the misses.
      return afterDrift(level, { ...grown, drift: 0, trainPts: (state.trainPts || 0) + livePoints(state) }, good, step.goodOutcome);
    }

    default:
      return IGNORED(state);
  }
}
