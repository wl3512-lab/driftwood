// Replays: a drift step can carry `variants`, other versions of the same slip
// (a different question, a different wrong claim, its own evidence). Each play
// picks one version per step, so the player can't just remember which
// question is the trick. Pure: the random source is passed in.
//
//   step.variants = [{ ...fields that replace the step's own }]
//   variant.evidence = [cards]: replace the level's card with the same id, or
//                      add a new one (the true fact this version contradicts)
//   variant.reveal   = { fooledLine, caughtLine, … }: the reveal card's lines
//                      that name this version's claim (merged over level.reveal)
//
// The step's id stays the same, so chores keyed on it still line up. A level's
// last drift is wired to the reveal, stew dinner and finished plot, so its
// variants must keep its badEffect/goodEffect plants (v2/tests/variants.test.js).

// How many versions a step has (1 when it has no variants).
export const versionsOf = (step) => 1 + (step.variants?.length || 0);

// The level as played with the chosen version of each step. picks maps step
// id → version index (0 = the step as written); missing ids use 0.
export function resolveLevel(level, picks = {}) {
  let evidence = [...(level.evidence || [])];
  let reveal = level.reveal;
  const steps = level.steps.map((step) => {
    const i = picks[step.id] || 0;
    const { variants, ...base } = step;
    if (!variants || i === 0) return base;
    const v = variants[i - 1];
    if (!v) return base;
    const { evidence: cards, reveal: lines, ...fields } = v;
    if (lines) reveal = { ...reveal, ...lines };
    for (const card of cards || []) {
      const at = evidence.findIndex((e) => e.id === card.id);
      if (at >= 0) evidence[at] = card;
      else evidence.push(card);
    }
    return { ...base, ...fields, id: step.id };
  });
  return { ...level, steps, evidence, reveal };
}

// One random pick per step that has variants.
export function randomPicks(level, random = Math.random) {
  const picks = {};
  for (const step of level.steps) {
    const n = versionsOf(step);
    if (n > 1) picks[step.id] = Math.floor(random() * n) % n;
  }
  return picks;
}

// Every version of the level, for tests: version k of every step (clamped).
export function everyVersion(level) {
  const most = Math.max(1, ...level.steps.map(versionsOf));
  return Array.from({ length: most }, (_, k) => {
    const picks = {};
    for (const step of level.steps) picks[step.id] = Math.min(k, versionsOf(step) - 1);
    return resolveLevel(level, picks);
  });
}
