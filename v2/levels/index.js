// Every level the map knows about. Only built levels appear in LEVELS;
// the rest show on the map as locked or "coming soon".
import level1 from "./level-1.js";
import level2 from "./level-2.js";
import level3 from "./level-3.js";
import level4 from "./level-4.js";

export const LEVELS = { "level-1": level1, "level-2": level2, "level-3": level3, "level-4": level4 };

export const MAP = [
  { number: 1, id: "level-1", helper: "Mango", sprite: "../icons/parrot.svg", title: "Plan your garden" },
  { number: 2, id: "level-2", helper: "Luna", sprite: "../icons/cat.svg", title: "Plant herbs" },
  { number: 3, id: "level-3", helper: "Ember", sprite: "../icons/fox.svg", title: "Pests & berries" },
  { number: 4, id: "level-4", helper: "Biscuit", sprite: "../icons/dog.svg", title: "Finish the garden" },
  { number: 5, id: "level-5", helper: "Bugs", sprite: "../icons/bunny.svg", title: "Final bloom" },
];
