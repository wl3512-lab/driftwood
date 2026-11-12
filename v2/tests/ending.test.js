// The ending's share text: map order, ✓/✗ from the first-play result, unplayed levels skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, MAP } from "../levels/index.js";
import { shareText, shareUrl } from "../ui/ending.js";

const URL_ = "https://example.test/v2/";
const record = (stars, fooled) => ({ stars, fooled });
const card = (levelId, fooled) => ({ levelId, flaw: LEVELS[levelId].reveal.flaw, tip: LEVELS[levelId].reveal.tip, fooled });

const FULL = {
  name: "Ada",
  levels: {
    "level-1": record(3, false), "level-2": record(1, true), "level-3": record(3, false),
    "level-4": record(2, false), "level-5": record(1, true),
  },
  guide: [card("level-1", false), card("level-2", true), card("level-3", false), card("level-4", false), card("level-5", true)],
};

test("shareText lists every flaw in map order with ✓/✗ and the count of catches", () => {
  const text = shareText(FULL, MAP, LEVELS, URL_);
  const lines = text.split("\n");
  assert.equal(lines[0], "My AI field guide from Driftwood");
  assert.equal(lines[1], "I caught 3 of 5 AI flaws.");
  assert.equal(lines[2], "");
  assert.equal(lines[3], `✓ Sycophancy: ${LEVELS["level-1"].reveal.tip}`);
  assert.equal(lines[4], `✗ Hallucination (fooled me): ${LEVELS["level-2"].reveal.tip}`);
  assert.equal(lines[5], `✓ Reckless advice: ${LEVELS["level-3"].reveal.tip}`);
  assert.equal(lines[6], `✓ False memory: ${LEVELS["level-4"].reveal.tip}`);
  assert.equal(lines[7], `✗ Emotional manipulation (fooled me): ${LEVELS["level-5"].reveal.tip}`);
  assert.equal(lines[8], "");
  assert.equal(lines.at(-1), `Play it: ${URL_}`);
});

test("shareText uses the first-play result on the guide card, not the best record", () => {
  // Replayed and caught (record says not fooled), but the card remembers the first play.
  const p = { levels: { "level-1": record(3, false) }, guide: [card("level-1", true)] };
  const text = shareText(p, MAP, LEVELS, URL_);
  assert.match(text, /^✗ Sycophancy \(fooled me\):/m);
  assert.match(text, /I caught 0 of 5/);
});

test("shareText falls back to the record when there is no guide card", () => {
  const p = { levels: { "level-1": record(1, true) }, guide: [] };
  assert.match(shareText(p, MAP, LEVELS, URL_), /^✗ Sycophancy \(fooled me\)/m);
});

test("shareText skips unplayed levels and counts only what was played", () => {
  const p = { levels: { "level-3": record(3, false) }, guide: [card("level-3", false)] };
  const text = shareText(p, MAP, LEVELS, URL_);
  const flawLines = text.split("\n").filter((l) => /^[✓✗] /.test(l));
  assert.deepEqual(flawLines, [`✓ Reckless advice: ${LEVELS["level-3"].reveal.tip}`]);
  assert.match(text, /I caught 1 of 5/);
  assert.equal(text.split("\n").at(-1), `Play it: ${URL_}`);
});

test("shareText with nothing played still ends with the link", () => {
  const text = shareText({ levels: {}, guide: [] }, MAP, LEVELS, URL_);
  assert.equal(text, `My AI field guide from Driftwood\nI caught 0 of 5 AI flaws.\n\n\nPlay it: ${URL_}`);
});

test("shareUrl keeps the page's folder and drops the query", () => {
  assert.equal(shareUrl("https://lucy.example/v2/index.html?screen=ending&x=1"), "https://lucy.example/v2/");
  assert.equal(shareUrl("https://lucy.example/v2/?screen=ending"), "https://lucy.example/v2/");
  assert.equal(shareUrl("http://127.0.0.1:8766/v2/"), "http://127.0.0.1:8766/v2/");
  assert.equal(shareUrl("not a url"), "not a url");
});

test("every level has the realWorld line the ending prints", () => {
  for (const m of MAP) assert.ok(LEVELS[m.id].reveal.realWorld, `${m.id} needs reveal.realWorld`);
});
