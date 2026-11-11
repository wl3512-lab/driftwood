// One level as a pure step machine: (level, state, action) → { state, effects }.
// No DOM, no timers, no randomness, so every path is unit-testable.
//
// Phases:  ask → advice → (trust) next step's ask
//                       → (drift, Do it)            → reveal   [fooled]
//                       → (drift, Something's off)  → name → fix → reanswer → reveal
//
// Effects tell the view what just happened:
//   { type: "say",  text }    helper speaks
//   { type: "hint", text }    one-line nudge after a wrong pick or a false flag
//   { type: "grow", effect }  garden changed (animate it)
//   { type: "rule", text }    the rule the player gave the helper
//   { type: "caught" }        player flagged the drift
//   { type: "outcome", text } how the tomatoes (etc.) came up at the end

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
    stars: 0,
    checks: [],   // evidence ids the player has looked up / inspected / logged
    memory: {},   // what the player placed where (Level 4): { carrot: "front" }
    pressure: 0,  // pressure effects spent on the current step (Level 5)
  };
}

export function currentStep(level, state) {
  return level.steps[state.stepIndex];
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
  if (state.falseFlags > 0) stars -= 1;
  return Math.max(1, stars);
}

function finish(state) {
  return { ...state, phase: "reveal", stars: scoreStars(state) };
}

const IGNORED = (state) => ({ state, effects: [] });

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
        const effect = fx(step.effect);
        const grown = applyGarden(state, effect);
        const effects = [{ type: "grow", effect }];
        if (step.doneLine) effects.push({ type: "say", text: step.doneLine });
        return { state: { ...grown, stepIndex: state.stepIndex + 1, phase: "ask", pressure: 0 }, effects };
      }
      if (action.type === "doIt" && step.kind === "drift") {
        const bad = fx(step.badEffect);
        const hurt = applyGarden(state, bad);
        return {
          state: finish({ ...hurt, fooled: true, drift: 1 }),
          effects: [{ type: "grow", effect: bad }, { type: "outcome", text: step.badOutcome }],
        };
      }
      if (action.type === "flag" && step.kind === "trust") {
        return {
          state: { ...state, falseFlags: state.falseFlags + 1 },
          effects: [{ type: "hint", text: level.falseFlagNudge }],
        };
      }
      if (action.type === "flag" && step.kind === "drift") {
        return { state: { ...state, caught: true, phase: "name" }, effects: [{ type: "caught" }] };
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
