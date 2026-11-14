// Driftwood v2 entry: a small screen router.
// splash → intro (framing + name) → opening cutscene (new players) → level 1
// → reveal → map → level … The map can replay the cutscene ("Watch intro").
import { LEVELS, MAP } from "./levels/index.js";
import { loadProgress, saveProgress, recordLevel, allDone, markIntroSeen, needsIntro } from "./progress.js";
import { renderSplash, renderIntro } from "./ui/intro.js";
import { renderMap, renderGuide } from "./ui/map.js";
import { mountLevel } from "./ui/level-view.js";
import { renderReveal } from "./ui/reveal.js";
import { renderEnding } from "./ui/ending.js";
import { renderCutscene } from "./ui/cutscene.js";
import { earlierPlots } from "./ui/finished-garden.js";
import { reachedLevel } from "./mechanics/shelf.js";
// Level tool views register themselves with ui/tools.js when loaded.
import "./ui/almanac-view.js";
import "./ui/magnifier-view.js";
import "./ui/log-view.js";

const root = document.getElementById("app");
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
  splash: () => { unmount = renderSplash(root, { onBegin: () => (progress.name ? go.map() : go.intro()) }); },
  intro: () => { unmount = renderIntro(root, {
    onSubmit: (name) => {
      save({ ...progress, name: name || "friend" });
      if (needsIntro(progress)) go.cutscene(true); else go.map();
    },
  }); },
  // first: a new player on the way into Level 1; otherwise a rewatch from the map.
  cutscene: (first = false) => {
    unmount = renderCutscene(root, {
      first,
      onSeen: () => save(markIntroSeen(progress)),
      onStart: () => go.level(MAP[0].id),
      onBack: () => go.map(),
    });
  },
  map: () => { unmount = renderMap(root, { progress, map: MAP, levels: LEVELS, onPlay: go.level, onGuide: go.guide, onIntro: () => go.cutscene(false),
    onEnding: finished() ? go.ending : null }); },
  guide: () => { unmount = renderGuide(root, { progress, map: MAP, levels: LEVELS, onBack: go.map }); },
  level: (id) => {
    // A level whose props ask for finished plots gets them from saved progress.
    const fin = (LEVELS[id].props || []).find((p) => p.from === "finished");
    const earlier = fin ? earlierPlots(fin.levels, LEVELS, progress) : [];
    unmount = mountLevel(root, LEVELS[id], {
      name: progress.name || "friend",
      earlier,
      // The almanac's seed shelf opens every packet up to the furthest level reached.
      reached: reachedLevel(LEVELS, progress, LEVELS[id].number),
      onDone: (state) => { save(recordLevel(progress, LEVELS[id], state)); go.reveal(id, state); },
      onExit: () => go.map(), // leaving mid-level saves nothing
    });
  },
  // The last level's reveal continues to the ending once every level is done.
  reveal: (id, state) => renderReveal(root, LEVELS[id], state, {
    onContinue: id === MAP.at(-1).id && finished() ? go.ending : go.map, name: progress.name || "friend",
    guide: progress.guide, order: MAP.map((m) => m.id) }),
  ending: () => {
    if (!finished()) { go.map(); return; }
    unmount = renderEnding(root, { progress, map: MAP, levels: LEVELS, onBack: go.map, name: progress.name || "friend" });
  },
};
for (const key of Object.keys(go)) go[key] = leaving(go[key]);
function finished() { return allDone(progress, MAP.map((m) => m.id)); }

// ?screen=map|guide|intro|cutscene|ending, or ?screen=level&level=level-1, jumps straight there (testing, demos).
// Anything unrecognised lands on the map rather than leaving "Loading Driftwood…" up.
function route() {
  const params = new URLSearchParams(location.search);
  const screen = params.get("screen");
  const id = params.get("level");
  if (!screen) go.splash();
  else if (screen === "level" && id && Object.hasOwn(LEVELS, id)) go.level(id);
  else if (screen === "cutscene") go.cutscene(params.get("first") === "1");
  else if (["intro", "map", "guide", "ending"].includes(screen)) go[screen]();
  else go.map();
}

try {
  route();
} catch (err) {
  console.warn("[Driftwood] couldn't open that screen, showing the map instead", err);
  go.map();
}
