// The earlier plots: what each finished level's garden looks like now, drawn
// from saved progress. Level 4 shows them behind the fence; the ending shows
// the whole row. Pure functions, no DOM.
import { plantSrc } from "../garden/garden.js";
import { caughtOn } from "../engine/stew.js";

// One sprite per finished level: the drift step's good plant if the player
// caught the drift (including a catch worth only 1 star on a replay),
// else the bad one. null when the level has no record yet.
export function finishedPlot(level, record) {
  if (!level || !record) return null;
  // The level's last drift is its main one (earlier drifts are smaller slips).
  const drift = level.steps.findLast((s) => s.kind === "drift");
  if (!drift) return null;
  const caught = caughtOn(record);
  // A level can name its own plot (level.plot.caught / .fooled) when its
  // drift plant isn't the crop it grew: Level 3's is the blueberry bush.
  const effect = (caught ? level.plot?.caught : level.plot?.fooled) || (caught ? drift.goodEffect : drift.badEffect);
  if (!effect?.plant) return null;
  return {
    levelId: level.id,
    helper: level.helper.name,
    caught,
    src: plantSrc(effect.plant, effect.state),
    alt: `${effect.plant}, ${effect.state}`,
  };
}

// The plots for a list of level ids, in order, skipping unfinished levels.
export function earlierPlots(ids, levels, progress) {
  return ids.map((id) => finishedPlot(levels[id], progress?.levels?.[id])).filter(Boolean);
}
