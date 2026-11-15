// Hold: press and hold on the target until the ring fills, then a result
// line appears beside it ("Damp: leave it").
//   { kind: "hold", item?, target, ms?: 1200, result?: "text" }
export default {
  kind: "hold",
  mode: "hold",
  noun: (a, n) => n.item(a.item),
  say: (a, n) => `Press and hold the ${n.list(a.targets)}`,
  done: (a, n, tg) => (a.result ? `${a.result}.` : `Done with the ${n.target(tg)}.`),
  async animate() {},
  land({ a, tg, last, stamp, textNode }) {
    if (last && a.result) stamp(tg, textNode(a.result), { cls: "act-mark--text" });
  },
};
