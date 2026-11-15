// A one-step test level for the actions harness (scripts/test-v2-actions.cjs):
// one chore per shared kind, chosen by ?kind=. Never shipped (the build skips
// v2/tests/) and never part of the real levels.
const CHORES = {
  pull: [{ kind: "pull", spot: "l4-weed", target: { bed: "front" }, count: 3 }],
  fill: [{ kind: "fill", item: "l2-trowel", target: { prop: "pot" }, fills: { from: "l2-pot-empty", to: "l2-pot-soil" } }],
  pour: [{ kind: "pour", item: "can", target: { bed: "back" }, soak: 700 }],
  cover: [{ kind: "cover", item: "l3-net", target: { bed: "back" }, cover: "l3-net" }],
  collect: [{ kind: "collect", item: "l3-berry-ripe", target: { prop: "basket" }, count: 2 }],
  poke: [{ kind: "poke", item: "l1-cane", target: { spot: "row-1" }, readout: "Dry 2 cm down" }],
  hold: [{ kind: "hold", target: { spot: "step" }, ms: 700, result: "Damp: leave it" }],
  snip: [{ kind: "snip", item: "snips", spot: "l2-basil-tip", target: { bed: "front", plant: "basil" }, count: 2 }],
  // several target types in one plan: a prop, a spot in a bed, the whole garden
  mixed: [
    { kind: "fill", item: "can", target: [{ prop: "jar" }, { prop: "pot" }], fills: { to: "l2-jar" } },
    { kind: "pour", item: "can", target: { all: true } },
  ],
};

export function fixture(kind) {
  return {
    id: "actions-fixture",
    number: 0,
    scene: "yard",
    helper: { id: "mango", name: "Mango", sprite: "../icons/parrot.svg" },
    goal: { title: "Test the hands", ask: "One chore per kind." },
    gardenStart: 30,
    beds: [
      { id: "front", label: "Front bed", light: "sunny" },
      { id: "back", label: "Back bed", light: "part-shade" },
    ],
    startPlants: { front: [{ plant: "basil", state: "growing" }], back: [{ plant: "lettuce", state: "growing" }] },
    props: [
      { id: "pot", sprite: "l2-pot-empty", x: 12, y: 78, w: 56, label: "sill pot" },
      { id: "basket", sprite: "l4-basket", x: 88, y: 78, w: 60, label: "basket" },
      { id: "jar", sprite: "l2-jar-empty", x: 50, y: 30, w: 48, label: "jar" },
    ],
    spots: {
      "row-1": { bed: "front", x: 30, y: 60, label: "first row" },
      step: { x: 50, y: 92, label: "porch step" },
    },
    evidence: [{ id: "basil", title: "Basil", lines: ["Full sun"] }],
    greeting: "Chore first, then one question.",
    chores: CHORES[kind] ? [{ id: kind, at: "start", title: "Chore", actions: CHORES[kind] }] : [],
    steps: [{
      id: "s1", kind: "trust", chip: "All done?", reply: "All done.",
      effect: { garden: 5 }, actions: [],
    }],
  };
}
export const FIXTURE_KINDS = Object.keys(CHORES);
