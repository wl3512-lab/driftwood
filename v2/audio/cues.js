// What sounds when: pure tables and functions from game events to sound
// names (sounds.js). The level screen calls decisionCues() after every
// runner step; the action registry calls actionCue() as a tool lands. Pure,
// so v2/tests/audio.test.js can check every decision in every level maps to
// sounds that exist.

// Each action kind (v2/actions/registry.js) → its sound.
export const ACTION_SFX = {
  plant: "act-plant", water: "act-water", pour: "act-pour", "water-row": "act-pour", stream: "act-stream",
  dig: "act-dig", firm: "act-firm", label: "act-label", pick: "act-pick", pests: "act-pests", pull: "act-pull",
  fill: "act-fill", cover: "act-cover", collect: "act-collect", poke: "act-poke", hold: "act-hold", snip: "act-snip",
  spray: "act-hose", release: "act-release", magnifier: "act-magnifier", photo: "act-camera", mist: "act-mist",
  wipe: "act-wipe", measure: "act-measure", furrow: "act-furrow", "sow-row": "act-sprinkle", light: "act-match",
  close: "act-gate", "phone-down": "act-phone-down",
};
export const actionCue = (kind) => ACTION_SFX[kind] || "act-poke";

// A plant's new state → grow / wilt / rot.
const GOOD = new Set(["sown", "growing", "thriving", "dug", "picked"]);
const BAD = new Set(["rotting", "aphids", "pecked", "eaten", "dead"]);
export function plantCue(state) {
  if (!state) return null;
  if (GOOD.has(state)) return "grow";
  if (BAD.has(state)) return "rot";
  return "wilt"; // thirsty, wilted, soggy, choked, …
}

// decisionCues(step, prevState, action, out, { pet }) → [{ name, delay, opts?, react }]
// step: the step the action was taken on; prevState/out.state: before/after
// (engine/level-runner.js); out.effects: what it said, grew, …
// react: false for the player's own choice (it sounds on the tap, even when a
// hands-on action comes first), true for what follows (the pet, the garden),
// which sounds once the choice has landed.
export function decisionCues(step, prev, action, out, { pet, scaffold = true } = {}) {
  const cues = [];
  const add = (name, delay = 0, opts) => cues.push({ name, delay, react: delay > 0, ...(opts ? { opts } : {}) });
  const P = { pet };
  const next = out.state;
  const fx = out.effects || [];
  const has = (type) => fx.some((f) => f.type === type);
  const phase = prev.phase;

  switch (action.type) {
    case "ask": case "chat": case "more": add("chip"); break;
    case "place": add("place"); break;
    case "chore": add(action.skipped ? "chore-skip" : "chore-done"); break;
    case "check": if (has("checked")) add("unlock"); break;
    case "name":
      if (next.phase === "fix") add("flaw-right"); else add("flaw-wrong");
      break;
    case "fix":
      if (next.phase === "reanswer") { add("fix-right"); add("pet-proud", 0.45, P); } else add("fix-wrong");
      break;
    case "override": add("my-way"); break;
    case "doIt": {
      if (phase === "disagree") { add("their-way"); add("pet-happy", 0.3, P); break; }
      if (phase === "pushback") { add("give-in"); break; }
      if (step?.kind === "hook") { add("stay-phone"); break; }
      if (step?.permission) { add("allow"); break; }
      add("do-it");
      if (phase === "reanswer" || (step?.kind === "trust" && !next.fooled)) add("pet-happy", 0.3, P);
      break;
    }
    case "flag": {
      if (phase === "pushback") { add("stand-firm"); break; }
      if (step?.kind === "hook") { add("put-down"); break; }
      if (step?.permission) add("deny"); else add("flag");
      if (next.phase === "disagree") add("pet-concede", 0.35, P);
      else if (next.phase === "pushback") add("pushback", 0.35, P);
      else if (has("caught")) add("pet-sheepish", 0.4, P);
      else if (has("hint")) add("false-flag", 0.25);
      break;
    }
    default: break;
  }

  // The garden: plants change, the meter moves.
  let at = 0.25;
  for (const f of fx) {
    if (f.type !== "grow" || !f.effect) continue;
    const states = [f.effect.state, ...(f.effect.extra || []).map((x) => x.state)].filter(Boolean);
    const kinds = [...new Set(states.map(plantCue).filter(Boolean))];
    for (const k of kinds) { add(k, at); at += 0.15; }
  }
  if (next.garden > prev.garden) add("meter-up", at + 0.1);
  if (next.garden < prev.garden) add("meter-down", at + 0.1);

  // A new drift on screen: the pet's glitch motif.
  if (scaffold && action.type === "ask" && phase === "ask" && next.phase === "advice" && step?.kind === "drift") add("pet-drift", 0.15, P);
  return cues;
}

// Is a drift on screen? (the tense layer follows this)
export const driftOnScreen = (step, state) => Boolean(step) && step.kind === "drift" && (state.phase === "advice" || state.phase === "pushback");
