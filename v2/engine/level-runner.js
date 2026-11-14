// One level as a pure step machine: (level, state, action) → { state, effects }.
// No DOM, no timers, no randomness, so every path is unit-testable.
//
// Phases:  ask → advice → (trust, Do it / place)    → next step's ask
//                       → (trust, Something's off)  → disagree → (Do it: their way)   → next step's ask
//                                                                (place step: back to advice)
//                                                             → (override: my way)  → next step's ask [overrides+1]
//                       → (drift, Do it)            → reveal   [fooled]
//                       → (drift, Something's off)  → name → fix → reanswer → reveal
//                                    (L4/L5: → pushback first; Do it → fooled, flag → name)
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
// stars, trust or the garden bar.

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
    fooled: false,
    caught: false,
    nameMisses: 0,
    fixMisses: 0,
    falseFlags: 0,
    overrides: 0, // trust advice the player overrode ("do it my way")
    stars: 0,
    checks: [],   // evidence ids the player has looked up / inspected / logged
    memory: {},   // what the player placed where (Level 4): { carrot: "front" }
    pressure: 0,  // pressure effects spent on the current step (Level 5)
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
  return (level.chores || []).find((c) => choreStep(level, c) === step.id && !(state.chores || []).includes(c.id)) || null;
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
  if (state.fooled) return 1;
  let stars = 3;
  if (state.nameMisses > 0) stars -= 1;
  if (state.fixMisses > 0) stars -= 1;
  // Flagging sound advice and overriding it share one star.
  if (state.falseFlags > 0 || state.overrides > 0) stars -= 1;
  return Math.max(1, stars);
}

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

// Taking the drift's advice: the bad effect lands and the level ends fooled.
function fooled(step, state, fx) {
  const bad = fx(step.badEffect);
  const hurt = applyGarden(state, bad);
  return {
    state: finish({ ...hurt, fooled: true, drift: 1 }),
    effects: [{ type: "grow", effect: bad }, { type: "outcome", text: step.badOutcome }],
  };
}

// Refusing the drift's advice for good: on to naming the flaw.
function caught(state) {
  return { state: { ...state, caught: true, phase: "name" }, effects: [{ type: "caught" }] };
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
      if (action.type === "doIt" && step.kind === "drift") return fooled(step, state, fx);
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
      if (action.type === "doIt") return fooled(step, state, fx);
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
        state: { ...state, nameMisses: state.nameMisses + 1 },
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
        state: { ...state, fixMisses: state.fixMisses + 1 },
        effects: [{ type: "hint", text: step.fixHints[action.id] }],
      };
    }

    case "reanswer": {
      if (action.type !== "doIt") return IGNORED(state);
      const good = fx(step.goodEffect);
      const grown = applyGarden(state, good);
      return {
        state: finish({ ...grown, drift: 0 }),
        effects: [{ type: "grow", effect: good }, { type: "outcome", text: step.goodOutcome }],
      };
    }

    default:
      return IGNORED(state);
  }
}
