// The seed shelf's rules, kept free of the DOM (ui/almanac-view.js draws it).
//
// Which packets are open: every packet whose level the player has reached,
// that is the level being played or any level with a saved record.
// What the fact card on a packet's back says: the evidence card with the
// packet's id, from the level being played if it has one (live: it can be
// locked, and its lines may name where the player put something), else from
// the packet's own level; a plant with no card uses its almanac page.
import { PLANTS } from "../levels/plants.js";

// The highest level number the player has reached.
export function reachedLevel(levels, progress, current) {
  let top = current;
  for (const level of Object.values(levels)) {
    if (progress?.levels?.[level.id] && level.number > top) top = level.number;
  }
  return top;
}

// Every packet in shelf order (by level), with whether it is open yet and
// whether it is new this level.
export function shelfPackets(reached, current, plants = PLANTS) {
  return [...plants]
    .sort((a, b) => a.level - b.level)
    .map((plant) => ({ plant, locked: plant.level > reached, isNew: plant.level === current }));
}

// Lines that only make sense inside their own run ("In the {placed:carrot}") are dropped elsewhere.
const runOnly = (line) => /\{(placed|other):[a-z]+\}/i.test(line);

// { title, lines, locked, live, evidence } or null when nothing is known.
// `checks`: the evidence ids the player has checked in the level being played.
export function factCard(plant, level, levels, checks = []) {
  const here = (level.evidence || []).find((e) => e.id === plant.id);
  if (here) {
    const locked = Boolean(here.locked) && !checks.includes(here.id);
    return { title: here.title, lines: here.lines, lockedLine: locked ? here.locked : null, live: true, evidence: here.id };
  }
  const home = Object.values(levels).find((l) => l.number === plant.level);
  const card = (home?.evidence || []).find((e) => e.id === plant.id);
  if (card) return { title: card.title, lines: card.lines.filter((l) => !runOnly(l)), lockedLine: null, live: false, evidence: null };
  const page = (home?.almanac?.pages || []).find((p) => p.id === plant.id);
  if (page) return { title: page.title, lines: page.lines, lockedLine: null, live: false, evidence: null };
  return null;
}

// A care row that only restates the fact card is hidden: the card already says
// it, bigger. A row repeats the card when at least 2 (or all, if fewer) and at
// least 2/3 of a card line's key words appear in it; a word matches its longer
// form ("warm" ~ "warmth").
const STOP = new Set("a an the is it its in of at and or ok fine for by to be all so".split(" "));
const words = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

export function repeatsCard(row, lines) {
  if (!row || !lines?.length) return false;
  const rw = words(row);
  return lines.some((line) => {
    const cw = words(line);
    if (!cw.length) return false;
    const hit = cw.filter((w) => rw.some((r) => sameWord(w, r))).length;
    return hit >= Math.min(2, cw.length) && hit / cw.length >= 2 / 3;
  });
}
