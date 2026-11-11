// Driftwood v2 entry: a small screen router.
// splash → intro (framing + name) → map → level → reveal → map …
import { LEVELS, MAP } from "./levels/index.js";
import { loadProgress, saveProgress, recordLevel } from "./progress.js";
import { renderSplash, renderIntro } from "./ui/intro.js";
import { renderMap, renderGuide } from "./ui/map.js";
import { mountLevel } from "./ui/level-view.js";
import { renderReveal } from "./ui/reveal.js";

const root = document.getElementById("app");
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let progress = loadProgress(storage);

function save(next) {
  progress = next;
  saveProgress(storage, progress);
}

const go = {
  splash: () => renderSplash(root, { onBegin: () => (progress.name ? go.map() : go.intro()) }),
  intro: () => renderIntro(root, {
    onSubmit: (name) => { save({ ...progress, name: name || "friend" }); go.map(); },
  }),
  map: () => renderMap(root, { progress, map: MAP, levels: LEVELS, onPlay: go.level, onGuide: go.guide }),
  guide: () => renderGuide(root, { progress, map: MAP, onBack: go.map }),
  level: (id) => mountLevel(root, LEVELS[id], {
    onDone: (state) => { save(recordLevel(progress, LEVELS[id], state)); go.reveal(id, state); },
  }),
  reveal: (id, state) => renderReveal(root, LEVELS[id], state, { onContinue: go.map }),
};

// ?screen=map|guide|intro, or ?screen=level&level=level-1, jumps straight there (testing, demos).
const params = new URLSearchParams(location.search);
const screen = params.get("screen");
if (screen === "level" && LEVELS[params.get("level")]) go.level(params.get("level"));
else if (["intro", "map", "guide"].includes(screen)) go[screen]();
else go.splash();
