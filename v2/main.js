// Driftwood v2 entry: a small screen router.
// splash → opening cutscene (Rowan asks the name; new players) → level 1
// (Rowan's seed handoff on each level's first play) → reveal → map → level …
// The map can replay the cutscene ("Watch intro").
import { LEVELS, MAP } from "./levels/index.js";
import { loadProgress, saveProgress, recordLevel, allDone, markIntroSeen, startOver, needsHandoff, markHandoffSeen } from "./progress.js";
import { renderSplash } from "./ui/intro.js";
import { renderMap, renderGuide } from "./ui/map.js";
import { mountLevel } from "./ui/level-view.js";
import { resolveLevel, randomPicks, everyVersion } from "./engine/variants.js";
import { mountRotate } from "./ui/rotate.js";
import { renderReveal } from "./ui/reveal.js";
import { renderEnding } from "./ui/ending.js";
import { renderCutscene } from "./ui/cutscene.js";
import { mountHandoff } from "./ui/handoff.js";
import { HANDOFFS } from "./levels/wizard.js";
import { earlierPlots } from "./ui/finished-garden.js";
import { carryOver, levelPlants } from "./engine/crops.js";
import { reachedLevel } from "./mechanics/shelf.js";
// Level tool views register themselves with ui/tools.js when loaded.
import "./ui/almanac-view.js";
import "./ui/magnifier-view.js";
import "./ui/log-view.js";
// Sound: a small WebAudio synth (audio/); each screen names its music here.
import { initAudio, music } from "./audio/index.js";
import { LEVEL_TRACK } from "./audio/music.js";

const root = document.getElementById("app");
// Every drag in the game is our own pointer drag (actions/runner.js). Stop the
// browser's built-in image/text drag, which showed a blurry ghost of the plant
// and Chrome's "Drop files here" box when a player grabbed a sprite.
document.addEventListener("dragstart", (e) => e.preventDefault());
initAudio();
mountRotate(root);
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let progress = loadProgress(storage);

function save(next) {
  progress = next;
  saveProgress(storage, progress);
}

// The level screen and the cutscene hold a document keydown listener (and the
// cutscene its timers); whatever screen comes next, release them first.
let unmount = null;
const leaving = (show) => (...args) => {
  unmount?.();
  unmount = null;
  return show(...args);
};

const go = {
  // A returning player chooses: Continue (to the map) or New game (erase, then the cutscene, name first).
  splash: () => { music("title"); unmount = renderSplash(root, {
    saved: progress.name ? { name: progress.name, done: Object.keys(progress.levels).length, total: MAP.length } : null,
    onBegin: () => (progress.name ? go.map() : go.cutscene(true)),
    onNew: () => { progress = startOver(storage); go.cutscene(true); },
  }); },
  // first: a new player on the way into Level 1 (Rowan asks the name);
  // otherwise a rewatch from the map, which skips the name.
  cutscene: (first = false) => {
    music("cutscene");
    unmount = renderCutscene(root, {
      first,
      name: first ? "" : progress.name || "friend",
      onName: (name) => save({ ...progress, name: name || "friend" }),
      onSeen: () => save(markIntroSeen(progress)),
      onStart: () => go.level(MAP[0].id),
      onBack: () => go.map(),
    });
  },
  map: () => { music("title"); unmount = renderMap(root, { progress, map: MAP, levels: LEVELS, onPlay: go.level, onGuide: go.guide, onIntro: () => go.cutscene(false),
    onEnding: finished() ? go.ending : null }); },
  guide: () => { music("title"); unmount = renderGuide(root, { progress, map: MAP, levels: LEVELS, onBack: go.map }); },
  level: (id) => {
    music(LEVEL_TRACK[id] || "level-1");
    // A level whose props ask for finished plots gets them from saved progress.
    const fin = (LEVELS[id].props || []).find((p) => p.from === "finished");
    const earlier = fin ? earlierPlots(fin.levels, LEVELS, progress) : [];
    // Each play picks one version of every slip that has variants (engine/variants.js).
    // Each play picks a version of each slip at random; a test run can pin
    // one with window.__dwVersion = k (0 = as written).
    const pin = window.__dwVersion;
    const versions = typeof pin === "number" ? everyVersion(LEVELS[id]) : null;
    const picked = versions ? versions[Math.min(pin, versions.length - 1)] : resolveLevel(LEVELS[id], randomPicks(LEVELS[id]));
    // Crops carried over from earlier levels, as saved progress has them (engine/crops.js).
    const played = carryOver(picked, progress);
    const off = mountLevel(root, played, {
      name: progress.name || "friend",
      earlier,
      // The almanac's seed shelf opens every packet up to the furthest level reached.
      reached: reachedLevel(LEVELS, progress, LEVELS[id].number),
      onDone: (state) => { save(recordLevel(progress, played, state)); go.reveal(played, state); },
      onExit: () => go.map(), // leaving mid-level saves nothing
    });
    // Rowan hands over the level's seeds, over the level, on its first play only.
    // Test runs turn it off (scripts/test-mute.js sets window.__dwHandoff = false).
    const hand = HANDOFFS[id];
    // Only the seeds this version of the level plants (engine/crops.js levelPlants).
    const grows = levelPlants(played);
    const drop = hand && window.__dwHandoff !== false && needsHandoff(progress, id)
      ? mountHandoff(root, { levelId: id, ...hand, seeds: hand.seeds.filter((p) => grows.has(p)), onSeen: () => save(markHandoffSeen(progress, id)) })
      : null;
    unmount = () => { drop?.(); off?.(); };
  },
  // The last level's reveal continues to the ending once every level is done.
  reveal: (played, state) => { const id = played.id; music(null); renderReveal(root, played, state, {
    onContinue: id === MAP.at(-1).id && finished() ? go.ending : go.map, name: progress.name || "friend",
    guide: progress.guide, order: MAP.map((m) => m.id) }); },
  ending: () => {
    if (!finished()) { go.map(); return; }
    music("stew");
    unmount = renderEnding(root, { progress, map: MAP, levels: LEVELS, onBack: go.map, name: progress.name || "friend" });
  },
};
for (const key of Object.keys(go)) go[key] = leaving(go[key]);

// A new version took over this tab (sw.js activated while it was open): this
// page's stylesheets are old, so a newer screen could show unstyled. Reload at
// the next calm screen (map, guide, ending), never mid-level.
let stale = false;
try {
  const sw = navigator.serviceWorker;
  if (sw?.controller) sw.addEventListener("controllerchange", () => { stale = true; });
} catch (_) { /* no service worker: nothing to do */ }
for (const key of ["map", "guide", "ending"]) {
  const show = go[key];
  go[key] = (...args) => (stale ? location.replace(`?screen=${key}`) : show(...args));
}
function finished() { return allDone(progress, MAP.map((m) => m.id)); }

// ?screen=map|guide|cutscene|ending (intro = the cutscene, name first), or ?screen=level&level=level-1, jumps straight there (testing, demos).
// Anything unrecognised lands on the map rather than leaving "Loading Driftwood…" up.
function route() {
  const params = new URLSearchParams(location.search);
  // The drift greying is trailer-only (css/base.css): ?driftfx=1 turns it on.
  document.documentElement.classList.toggle("fx-drift", params.get("driftfx") === "1");
  const screen = params.get("screen");
  const id = params.get("level");
  if (!screen) go.splash();
  else if (screen === "level" && id && Object.hasOwn(LEVELS, id)) go.level(id);
  else if (screen === "cutscene") go.cutscene(params.get("first") === "1");
  else if (screen === "intro") go.cutscene(true);
  else if (["map", "guide", "ending"].includes(screen)) go[screen]();
  else go.map();
}

try {
  route();
} catch (err) {
  console.warn("[Driftwood] couldn't open that screen, showing the map instead", err);
  go.map();
}
