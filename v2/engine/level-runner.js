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
  };
}

export function currentStep(level, state) {
  return level.steps[state.stepIndex];
}

export function applyGarden(state, effect) {
  const beds = {};
  for (const [id, list] of Object.entries(state.beds)) beds[id] = list.map((p) => ({ ...p }));
  if (effect.water) {
    for (const list of Object.values(beds)) {
      for (const p of list) if (p.state === "growing") p.state = "thriving";
    }
  }
  if (effect.plant) {
    const list = beds[effect.bed];
    const existing = list.find((p) => p.plant === effect.plant);
    if (existing) existing.state = effect.state;
    else list.push({ plant: effect.plant, state: effect.state });
  }
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

export function reduce(level, state, action) {
  const step = currentStep(level, state);

  switch (state.phase) {
    case "ask": {
      if (action.type === "ask") {
        return {
          state: { ...state, phase: "advice", drift: step.kind === "drift" ? 0.6 : 0 },
          effects: [{ type: "say", text: step.reply }],
        };
      }
      if (action.type === "chat") {
        return { state, effects: [{ type: "say", text: action.reply }] };
      }
      return IGNORED(state);
    }

    case "advice": {
      if (action.type === "doIt" && step.kind === "trust") {
        const grown = applyGarden(state, step.effect);
        const effects = [{ type: "grow", effect: step.effect }];
        if (step.doneLine) effects.push({ type: "say", text: step.doneLine });
        return { state: { ...grown, stepIndex: state.stepIndex + 1, phase: "ask" }, effects };
      }
      if (action.type === "doIt" && step.kind === "drift") {
        const hurt = applyGarden(state, step.badEffect);
        return {
          state: finish({ ...hurt, fooled: true, drift: 1 }),
          effects: [{ type: "grow", effect: step.badEffect }, { type: "outcome", text: step.badOutcome }],
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
      const grown = applyGarden(state, step.goodEffect);
      return {
        state: finish({ ...grown, drift: 0 }),
        effects: [{ type: "grow", effect: step.goodEffect }, { type: "outcome", text: step.goodOutcome }],
      };
    }

    default:
      return IGNORED(state);
  }
}
