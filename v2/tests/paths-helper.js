// Every way through a level, for the "no line contradicts the garden" tests.
// Each version of every slip (engine/variants.js) × every choice per step:
// trust Do it / my way, each bed of a place step, a drift followed, followed
// then put right by hand (when it has a recover), or caught. Chores are done
// (or skipped, with skip: true). Each path records what was said, with the
// garden as it stood when it was said, and the hands-on plan of each choice.
import { createRun, reduce, currentStep, pendingChore, extraChipsFor, recoverable } from "../engine/level-runner.js";
import { resolveLevel, versionsOf } from "../engine/variants.js";
import { memoryVars } from "../mechanics/placement.js";
import { planFor } from "../actions/plan.js";
import "../actions/registry.js";

const fill = (level, state, text) => String(text ?? "").replace(/\{(placed|other):(\w+)\}/g, (m) => memoryVars(level, state.memory)[m.slice(1, -1)] ?? m);

export function versions(level) {
  let combos = [{}];
  for (const s of level.steps.filter((x) => versionsOf(x) > 1)) {
    combos = combos.flatMap((c) => Array.from({ length: versionsOf(s) }, (_, i) => ({ ...c, [s.id]: i })));
  }
  return combos.map((picks) => ({ picks, level: resolveLevel(level, picks) }));
}

function choices(level) {
  return level.steps.map((s, i) => {
    if (s.kind === "drift") return s.recover && level.steps[i + 1] ? ["fool", "fool+fix", "catch"] : ["fool", "catch"];
    if (s.kind === "hook") return ["flag"];
    if (s.place) return s.place.beds.map((b) => `place:${b}`);
    return s.disagree ? ["do", "mine"] : ["do"];
  });
}

// [{ picks, path, said: [{ text, kind, stepId, beds }], plans: [{ stepId, action, plan }], final }]
export function everyPath(raw, { skip = false } = {}) {
  const out = [];
  for (const { picks, level } of versions(raw)) {
    const all = choices(level).reduce((acc, o) => acc.flatMap((p) => o.map((c) => [...p, c])), [[]]);
    for (const path of all) {
      let st = createRun(level);
      const said = [];
      const plans = [];
      const beds = (s) => JSON.parse(JSON.stringify(s.beds));
      const hear = (o, before, stepId) => {
        for (const e of o.effects) if (["say", "hint", "outcome"].includes(e.type)) said.push({ text: fill(level, o.state, e.text), kind: e.type, stepId, beds: beds(before) });
      };
      const go = (a) => {
        const stepId = currentStep(level, st)?.id;
        const o = reduce(level, st, a);
        plans.push({ stepId, action: a.type, plan: planFor(level, st, a, o) });
        hear(o, st, stepId);
        st = o.state;
        return o;
      };
      for (let i = 0; i < level.steps.length; i++) {
        let ch;
        let guard = 0;
        while ((ch = pendingChore(level, st)) && guard++ < 10) go({ type: "chore", id: ch.id, ...(skip ? { skipped: true, acted: true } : {}) });
        const s = currentStep(level, st);
        const chips = extraChipsFor(level, st);
        chips.forEach((c) => said.push({ text: fill(level, st, c.reply), kind: c.recover ? "recover-chip" : "chip", stepId: s.id, beds: beds(st) }));
        if (path[i - 1] === "fool+fix" && recoverable(level, st)) {
          const at = chips.findIndex((c) => c.recover);
          go({ type: "chat", chip: at, reply: chips[at].reply });
          go({ type: "recover" });
        }
        go({ type: "ask" });
        const c = path[i];
        if (c === "do" || c === "fool" || c === "fool+fix") {
          go({ type: "doIt" });
          if (st.phase === "pushback") go({ type: "doIt" });
        } else if (c === "mine") { go({ type: "flag" }); go({ type: "override" }); }
        else if (c.startsWith("place:")) go({ type: "place", bed: c.slice(6) });
        else if (c === "flag") go({ type: "flag" });
        else if (c === "catch") {
          go({ type: "flag" });
          if (st.phase === "pushback") go({ type: "flag" });
          go({ type: "name", id: s.correctFlaw });
          go({ type: "fix", id: s.correctFix });
          go({ type: "doIt" });
        }
      }
      out.push({ picks, path, said, plans, final: st, level });
    }
  }
  return out;
}
