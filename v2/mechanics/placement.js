// Level 4: where the player put things, and what the helper (mis)remembers.
// Bed refs in level data: "@item" → the bed the player chose for item;
// "@other:item" → the first bed in that step's place.beds they did NOT choose.
// Pure functions, no DOM.

export function placeStepFor(level, item) {
  return level.steps.find((s) => s.place?.item === item);
}

export function resolveBed(level, memory, bed) {
  if (typeof bed !== "string" || !bed.startsWith("@")) return bed;
  const [kind, item] = bed.slice(1).includes(":") ? bed.slice(1).split(":") : ["placed", bed.slice(1)];
  const chosen = memory?.[item];
  if (!chosen) return null;
  if (kind === "placed") return chosen;
  if (kind === "other") return placeStepFor(level, item)?.place.beds.find((b) => b !== chosen) ?? null;
  return null;
}

export function resolveEffect(level, memory, effect) {
  if (!effect) return effect;
  const out = { ...effect };
  if (out.bed) out.bed = resolveBed(level, memory, out.bed);
  if (out.extra) out.extra = out.extra.map((x) => ({ ...x, bed: resolveBed(level, memory, x.bed) }));
  if (out.remove) out.remove = out.remove.map((x) => ({ ...x, bed: resolveBed(level, memory, x.bed) }));
  return out;
}

// Text variables: {placed:carrot} and {other:carrot} → bed labels.
export function memoryVars(level, memory) {
  const vars = {};
  const label = (id) => level.beds.find((b) => b.id === id)?.label.toLowerCase();
  for (const item of Object.keys(memory || {})) {
    const placed = resolveBed(level, memory, `@${item}`);
    const other = resolveBed(level, memory, `@other:${item}`);
    if (placed) vars[`placed:${item}`] = label(placed);
    if (other) vars[`other:${item}`] = label(other);
  }
  return vars;
}

// The planting log: one line per thing the player placed, in order.
export function logEntries(level, memory) {
  return Object.entries(memory || {}).map(([item, bed]) => ({
    item, bed, text: `You sowed ${item}s in the ${level.beds.find((b) => b.id === bed)?.label.toLowerCase()}.`,
  }));
}
