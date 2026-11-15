// Wave 1.5: the shared kinds and the non-bed targets (props, spots, all).
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, KINDS, DEFAULT_ITEM, DEFAULT_COUNT } from "../actions/plan.js";
import { kindOf } from "../actions/registry.js";
import { words, plural } from "../actions/fx.js";

const LEVEL = {
  id: "kinds-fixture",
  beds: [{ id: "a", label: "Front bed" }, { id: "b", label: "Back bed" }],
  props: [
    { id: "jar", sprite: "l2-jar-empty", x: 20, y: 70, label: "jar" },
    { id: "barrel", sprite: "l1-rain-barrel", x: 80, y: 60 },
    { sprite: "./art/moon.svg", class: "prop prop--moon" }, // decorative: no id, not a target
  ],
  spots: {
    "row-1": { bed: "a", x: 30, y: 50, label: "first row" },
    step: { x: 50, y: 90, label: "porch step" },
  },
};
const norm = (list, opts = {}) => normalize(list, { level: LEVEL, ...opts });

// Names as level-view.js builds them, enough for say/done.
const names = {
  target: (tg) => (tg.prop ? (LEVEL.props.find((p) => p.id === tg.prop).label || tg.prop) : tg.spot ? LEVEL.spots[tg.spot].label : tg.all ? "garden" : LEVEL.beds.find((b) => b.id === tg.bed).label),
  item: (id) => words(id),
  thing: (id, n) => (n === 1 ? words(id) : plural(words(id))),
  plant: (id) => id,
  list(ts) { return [...new Set(ts.map(this.target))].join(" and the "); },
};
names.list = names.list.bind(names);

test("targets: prop, spot (with or without a bed) and all", () => {
  const [a] = norm([{ kind: "fill", target: [{ prop: "jar" }, { spot: "row-1" }, { spot: "step" }, { all: true }] }]);
  assert.deepEqual(a.targets, [{ prop: "jar" }, { spot: "row-1", bed: "a" }, { spot: "step" }, { all: true }]);
});

test("targets: unknown props and spots are dropped, and so is an action left with none", () => {
  assert.deepEqual(norm([{ kind: "fill", target: { prop: "nope" } }]), []);
  assert.deepEqual(norm([{ kind: "hold", target: { spot: "nope" } }]), []);
  // a decorative prop (no id) is never a target
  assert.deepEqual(norm([{ kind: "fill", target: { prop: undefined } }]), []);
  const [a] = norm([{ kind: "poke", target: [{ prop: "nope" }, { bed: "b" }] }]);
  assert.deepEqual(a.targets, [{ bed: "b" }]);
});

test("targets: a spot can name its bed, $choice included", () => {
  const [a] = norm([{ kind: "poke", item: "l1-cane", target: { spot: "row-1", bed: "$choice" } }], { choice: "b" });
  assert.deepEqual(a.targets, [{ spot: "row-1", bed: "b" }]);
});

test("the eight shared kinds are registered with their modes", () => {
  const modes = { pull: "tap", fill: "drag", pour: "drag", cover: "drag", collect: "drag", poke: "drag", hold: "hold", snip: "tap" };
  for (const [k, mode] of Object.entries(modes)) {
    assert.ok(KINDS.includes(k), k);
    assert.equal(kindOf(k)?.mode, mode, k);
  }
});

test("defaults: items and counts for the shared kinds", () => {
  assert.deepEqual(norm([{ kind: "pull", target: { bed: "a" } }])[0], { kind: "pull", item: "hand", targets: [{ bed: "a" }], count: 3 });
  assert.equal(norm([{ kind: "snip", target: { bed: "a" } }])[0].item, "snips");
  assert.equal(norm([{ kind: "collect", item: "l2-mint-sprig", target: { prop: "jar" } }])[0].count, 3);
  assert.equal(norm([{ kind: "fill", target: { prop: "barrel" } }])[0].count, undefined);
  for (const k of ["pull", "fill", "pour", "cover", "collect", "poke", "hold", "snip"]) assert.ok(DEFAULT_ITEM[k], k);
  assert.equal(DEFAULT_COUNT.collect, 3);
});

test("kind fields pass through normalize as written", () => {
  const [fill, pour, cover, poke, hold] = norm([
    { kind: "fill", item: "can", target: { prop: "barrel" }, fills: { from: "l1-rain-barrel", to: "l1-rain-barrel-full" } },
    { kind: "pour", item: "l2-mister", target: { bed: "a" }, soak: 1500 },
    { kind: "cover", item: "l3-net", target: { bed: "b" }, cover: "l3-net" },
    { kind: "poke", item: "l1-cane", target: { spot: "row-1" }, readout: "Dry 2 cm down" },
    { kind: "hold", target: { spot: "step" }, ms: 900, result: "Damp: leave it" },
  ]);
  assert.deepEqual(fill.fills, { from: "l1-rain-barrel", to: "l1-rain-barrel-full" });
  assert.equal(pour.soak, 1500);
  assert.equal(cover.cover, "l3-net");
  assert.equal(poke.readout, "Dry 2 cm down");
  assert.equal(hold.ms, 900);
  assert.equal(hold.result, "Damp: leave it");
});

test("each shared kind says where to go and what it did, in words", () => {
  const cases = {
    pull: [{ kind: "pull", spot: "l1-stone", target: { bed: "a" }, count: 2 }, /Pull the 2 stones out of the Front bed/],
    fill: [{ kind: "fill", item: "can", target: { prop: "barrel" } }, /barrel/],
    pour: [{ kind: "pour", item: "l2-mister", target: { bed: "a" }, soak: 1200 }, /mister.*Front bed.*hold/],
    cover: [{ kind: "cover", item: "l3-net", target: { bed: "b" }, cover: "l3-net" }, /net over the Back bed/],
    collect: [{ kind: "collect", item: "l2-mint-sprig", target: { prop: "jar" }, count: 3 }, /3 mint sprigs into the jar/],
    poke: [{ kind: "poke", item: "l1-cane", target: { spot: "row-1" } }, /cane into the first row/],
    hold: [{ kind: "hold", target: { spot: "step" } }, /hold the porch step/],
    snip: [{ kind: "snip", target: { bed: "a" }, count: 2 }, /Snip the 2 leaves on the Front bed/],
  };
  for (const [k, [raw, re]] of Object.entries(cases)) {
    const [a] = norm([raw]);
    assert.ok(a, `${k} normalizes`);
    const def = kindOf(k);
    assert.match(def.say(a, names), re, k);
    assert.ok(def.done(a, names, a.targets[0]).length > 0, k);
  }
  const [poke] = norm([{ kind: "poke", item: "l1-cane", target: { spot: "row-1" }, readout: "Dry 2 cm down" }]);
  assert.equal(kindOf("poke").done(poke, names, poke.targets[0]), "Dry 2 cm down.");
  const [hold] = norm([{ kind: "hold", target: { spot: "step" }, result: "Damp: leave it" }]);
  assert.equal(kindOf("hold").done(hold, names, hold.targets[0]), "Damp: leave it.");
});

test("land(): fill and collect swap on the last unit only; cover, poke and hold stamp", () => {
  const calls = [];
  const ctx = (a, last) => ({
    a, tg: a.targets[0], last,
    swap: (tg, name) => calls.push(["swap", name]),
    stamp: (tg, node, o = {}) => calls.push(["stamp", node, o.cls]),
    artNode: (n) => `art:${n}`, textNode: (t) => `text:${t}`,
  });
  const [fill] = norm([{ kind: "fill", target: { prop: "jar" }, fills: { to: "l2-jar" } }]);
  kindOf("fill").land(ctx(fill, true));
  const [collect] = norm([{ kind: "collect", item: "l2-mint-sprig", target: { prop: "jar" }, fills: { to: "l2-jar" } }]);
  kindOf("collect").land(ctx(collect, false));
  kindOf("collect").land(ctx(collect, true));
  const [cover] = norm([{ kind: "cover", item: "l3-net", target: { bed: "a" }, cover: "l3-net" }]);
  kindOf("cover").land(ctx(cover, true));
  const [poke] = norm([{ kind: "poke", item: "l1-cane", target: { bed: "a" }, readout: "Dry" }]);
  kindOf("poke").land(ctx(poke, true));
  const [hold] = norm([{ kind: "hold", target: { bed: "a" }, result: "Damp" }]);
  kindOf("hold").land(ctx(hold, true));
  assert.deepEqual(calls, [
    ["swap", "l2-jar"],
    ["swap", "l2-jar"],
    ["stamp", "art:l3-net", "act-mark--cover"],
    ["stamp", "art:l1-cane", "act-mark--stand"],
    ["stamp", "text:Dry", "act-mark--text"],
    ["stamp", "text:Damp", "act-mark--text"],
  ]);
});

test("words and plural read art names aloud", () => {
  assert.equal(words("l2-mint-sprig"), "mint sprig");
  assert.equal(plural("berry"), "berries");
  assert.equal(plural("stone"), "stones");
  assert.equal(plural("bush"), "bushes");
  assert.equal(plural("leaf"), "leaves");
});
