// The level screen: garden scene on top, conversation dock below.
// All game rules live in engine/level-runner.js; this file only turns
// clicks into runner actions and runner state into DOM.
//
// Every level string goes through t() (ui/text.js) for {name} and the
// placement vars. Level tools and step shortcuts share one document keydown
// listener, removed by the function mountLevel returns (and by itself if the
// level has gone from the page).
import { h, announce } from "./dom.js";
import { createRun, reduce, currentStep, pendingChore, training, glitching, openChain, chainQuestions } from "../engine/level-runner.js";
import { trainBar } from "./train-bar.js";
import { renderBeds, levelSprites } from "../garden/garden.js";
import { setDrift } from "../garden/drift.js";
import { memoryVars } from "../mechanics/placement.js";
import { pressureLevel, wiltLevel } from "../mechanics/pressure.js";
import { createPressureClock } from "./pressure-clock.js";
import { fill } from "./text.js";
import { shortcutFor, keyCap, ariaKey, keyName } from "./shortcuts.js";
import { toolView, pageView } from "./tools.js";
import { labelToken } from "./placement-view.js";
import { rewordable } from "../engine/reword.js";
import { aiEnabled, reword, prefetch, forgetPrefetched } from "./ai-voice.js";
import { planFor } from "../actions/plan.js";
import { runPlan } from "../actions/runner.js";
import { art as actionArt, artUrl } from "../actions/sprites.js";
import { words, plural } from "../actions/fx.js";
import { packetFront } from "./almanac-view.js";
import { PLANTS } from "../levels/plants.js";
import { cues as playCues, voice, setTension, sfx } from "../audio/index.js";
import { decisionCues, driftOnScreen } from "../audio/cues.js";
import { soundToggle } from "../audio/toggle.js";
import { petAnimator, PET_MOOD } from "./pet-anim.js";
import { createPhone, meLine, phoneMood } from "./phone-chat.js";

// The toolbar icon is the device itself: a book with a glowing screen.
const ALMANAC_SPRITE = "./art/almanac-device.svg";
const ALMANAC = { id: "almanac", label: "Almanac", key: "/", sprite: ALMANAC_SPRITE };
// The helper "thinks" at least this long before a reworded line appears. The
// AI takes ~2–3 s, so each chip's answer is asked for as soon as the chips
// show (askAhead): by the tap it's usually back, and the dots last ~0.75 s
// (Lucy: "make animals think for less time, cut it in half"). ai-voice.js
// still gives up at 5 s and uses the written line.
const THINK_MS = 750;
const isTyping = (el) => !!el && (el.matches?.("input, textarea, select") || el.isContentEditable);

// `earlier`: finished plots from saved progress ({ src, alt, helper, caught }, see
// ui/finished-garden.js) for a level whose props ask for them (Level 4).
// `reached`: the highest level number the player has reached (the almanac's
// seed shelf opens every packet up to it); defaults to this level.
export function mountLevel(root, level, { onDone, onExit, name = "friend", earlier = [], reached = level.number }) {
  let state = createRun(level);
  const t = (text) => fill(text, { name, ...memoryVars(level, state.memory) });
  let said = level.greeting;
  let driftSaid = null; // the drift advice a pushback reply replaced
  let asked = null;
  let hint = null;
  let grown = null;
  let outcome = null;
  let focusKey = null; // phase|step|line last given focus; focus only moves when it changes
  let fresh = new Set(); // evidence ids unlocked by the last action (they pop once)
  let news = null; // what an unlock says through the live region
  // A hands-on action in progress (actions/runner.js): the choice's effect
  // waits until the player has dragged the tool to the bed.
  let acting = null;
  // A chore with `wait` (Level 3's ripening berries) first shows its line and
  // a filling bar for wait.ms; `waited` holds the chores whose wait is over.
  const waited = new Set();
  let waitCard = null;
  // Sound: the line last babbled, a pause before the next one (after a pet
  // stinger), and whether the running chore was skipped.
  let voiced = null;
  let voiceDelay = 0;
  let skipped = false;
  // AI voice: the lines it may reword (keyed by written text), and the
  // thinking bubble in flight (a counter, so a stale answer is dropped).
  const aiOn = aiEnabled();
  const lines = aiOn ? rewordable(level) : new Map();
  let thinking = 0;
  let thinkSeq = 0;
  let wasThinking = false;

  // Warm the cache so a plant that appears mid-level (the damaged tomato) never flashes blank.
  const preloaded = levelSprites(level).map((src) => Object.assign(new Image(), { src }));

  // Persistent shell, so the drift filter can transition instead of snapping.
  const meterText = h("span", { class: "meter__text" });
  const meterFill = h("div", { class: "meter__fill" });
  const beds = h("div", { class: "beds", style: `--beds: ${level.beds.length}` });
  const toolbar = h("div", { class: "tools", role: "toolbar", "aria-label": "Tools" });
  // Scene props come from the level data only (the sprite form; the
  // { from: "finished" } row is drawn by its own module). A prop with an id
  // is an action target: [data-prop], placed at x/y (% of the scene).
  const props = (level.props || []).filter((p) => p.sprite)
    .map((p) => h("img", {
      class: p.class || "prop", src: artUrl(p.sprite), alt: p.alt || "", "aria-hidden": p.alt ? null : "true",
      "data-prop": p.id || null,
      style: p.id && p.x != null ? `left:${p.x}%; top:${p.y ?? 50}%; width:${p.w || 64}px` : null,
    }));
  // The earlier plots behind the fence: one sprite per finished level, how it ended up.
  const earlierRow = earlier.length > 0 && h("div", { class: "earlier", role: "img", "aria-label": `Your earlier plots: ${earlier.map((p) => p.alt).join(", ")}` },
    earlier.map((p) => h("img", { src: p.src, alt: "", width: 44, height: 44, "data-plot": p.levelId, "data-caught": String(p.caught) })));
  const scene = h("section", { class: "scene", "aria-label": "Your garden" },
    h("div", { class: "fence", "aria-hidden": "true" }),
    h("div", { class: "scene__top" },
      h("button", { class: "btn btn--map", onclick: () => onExit?.() }, "← Map"),
      h("div", { class: "goal" },
        h("img", { class: "goal__sign", src: "./art/goal-sign.svg", alt: "", width: 40, height: 40 }),
        h("div", {},
          h("p", { class: "goal__level" }, `LEVEL ${level.number}`),
          h("h1", { class: "goal__title" }, t(level.goal.title)),
          h("p", { class: "goal__ask" }, t(level.goal.ask)))),
      h("div", { class: "meter", role: "status" },
        meterText, h("div", { class: "meter__bar", "aria-hidden": "true" }, meterFill))),
    toolbar,
    h("div", { class: "scene__ground" },
      beds),
    props,
    earlierRow,
    h("img", { class: "can", src: "./art/watering-can.svg", alt: "", width: 64, height: 64 }),
    h("div", { class: "scanlines", "aria-hidden": "true" }));
  // The helper has its own stall beside the conversation, so it never stands
  // on the beds (players read a sprite on the soil as a plant). The sprite and
  // the talk column are siblings; only the talk column is re-rendered per step.
  // The sound switch sits in the stall's corner (the stall's art stays hidden from screen readers).
  // How trained the helper is this play (engine/level-runner.js training()).
  const train = trainBar(level.helper.name, 0);
  const stall = h("div", { class: "stall" },
    h("div", { class: "stall__window", "aria-hidden": "true" },
      h("img", { class: "helper", src: level.helper.sprite, alt: "", width: 80, height: 112 })),
    h("div", { class: "stall__plate" },
      h("strong", { class: "stall__name", "aria-hidden": "true" }, level.helper.name.toUpperCase()),
      h("span", { class: "stall__role", "aria-hidden": "true" }, level.helper.role || "your helper"),
      train.el),
    soundToggle({ className: "snd--stall" }));
  const talk = h("div", { class: "dock__talk" });
  const dock = h("section", { class: "dock", "aria-label": `Talk to ${level.helper.name}` }, stall, talk);
  // The helper's face: blinks, talks, and reacts to what the player does (ui/pet-anim.js).
  const pet = petAnimator(stall.querySelector(".helper"));
  // Level 5: the chat is a phone over the garden (ui/phone-chat.js); Bugs's
  // face is sad when you tend the garden instead of him.
  const phone = level.chatUi === "phone" ? createPhone({ level, dock, stall, pet, t }) : null;
  phone?.heard("bug", level.greeting);
  let tapped = new Set(); // phone: side questions already asked on this step (they go)
  const petReacts = (list, ctx) => {
    for (const c of list) {
      const mood = phone && ctx ? phoneMood(c.name, ctx.action, ctx.phase, ctx.step) : PET_MOOD[c.name];
      // A late happy face never lands on a phone that's been put down since (he's sad then).
      if (mood) setTimeout(() => { if (mounted && !(phone && mood === "happy" && main.classList.contains("is-phone-down"))) pet.react(mood); }, (c.delay || 0) * 1000);
    }
  };
  const main = h("main", { class: phone ? "level level--phone" : "level", "data-scene": level.scene || "yard" }, scene, dock);
  main.preloaded = preloaded; // keep the Image objects alive while the level is mounted
  root.replaceChildren(main);

  // ---- tools: one button each (sprite, label, key cap), opened by click, tap or key ----
  // Every level has the almanac: the fact cards (level.evidence) live in it,
  // not on the garden, so checking what a helper says is a deliberate look.
  const levelTools = (level.tools || []).some((tl) => tl.id === "almanac")
    ? level.tools
    : [ALMANAC, ...(level.tools || [])];
  // A document tool (the planting log) is the almanac's cover, not a button.
  const pages = levelTools.filter((tl) => pageView(tl.id)).map((tl) => ({
    id: tl.id,
    view: pageView(tl.id)({ level, tool: tl, dispatch, getState: () => state, t }),
  }));
  const tools = [];
  for (const tool of levelTools) {
    if (pageView(tool.id)) continue;
    const create = toolView(tool.id);
    if (!create) continue;
    // One small square icon button per tool: the name and its key live in the
    // accessible name and the tooltip, not on the garden.
    const name = tool.key ? `${tool.label} (${keyCap(tool.key)})` : tool.label;
    const button = h("button", {
      class: "tool tool--icon", type: "button", "data-tool": tool.id,
      "aria-keyshortcuts": tool.key ? ariaKey(tool.key) : null,
      "aria-label": name, title: name,
    },
    h("img", { src: tool.id === "almanac" ? ALMANAC_SPRITE : tool.sprite, alt: "", width: 28, height: 28 }));
    const view = create({ level, tool, scene, button, dispatch, getState: () => state, t, announce, pages, reached });
    button.addEventListener("click", () => view.open());
    toolbar.append(button);
    tools.push({ id: `tool:${tool.id}`, key: tool.key, view });
  }
  // A page (the log) has no key or button of its own: it is the almanac's
  // cover, so the only way to read it is to open the book.
  const almanacView = tools.find((tl) => tl.id === "tool:almanac")?.view;
  toolbar.hidden = tools.length === 0;
  const almanacButton = toolbar.querySelector('[data-tool="almanac"]');

  // The first time a level opens, a short note points at the almanac. It goes
  // once the player opens the book (or moves on to the next step).
  let nudge = null;
  const nudgeKey = `dw2_almanac_hint_${level.id}`;
  let seen = false;
  try { seen = localStorage.getItem(nudgeKey) === "1"; localStorage.setItem(nudgeKey, "1"); } catch (_) { /* fine */ }
  if (almanacButton && !seen) {
    nudge = h("p", { class: "hint tool-hint", role: "note" }, "Check facts in the almanac");
    toolbar.prepend(nudge); // a flex item left of the buttons, on their row
    almanacButton.addEventListener("click", dropNudge);
  }
  function dropNudge() { nudge?.remove(); nudge = null; }

  // Level 5's clock: ticks only while the player lingers on a pressure step's advice.
  const clock = createPressureClock(dispatch);

  // Shortcuts live right now: the tools, plus the off button's key on a step
  // that sets one (in pushback too, where it stands firm).
  function shortcuts() {
    const list = tools.filter((tl) => tl.key).map((tl) => ({ id: tl.id, key: tl.key, run: () => tl.view.open() }));
    if (thinking || acting) return list; // nothing to answer until the helper has spoken (or the tool is put down)
    const step = currentStep(level, state);
    if ((state.phase === "advice" || state.phase === "pushback") && step?.offKey) {
      list.push({ id: "off", key: step.offKey, run: () => dispatch({ type: "flag" }) });
    }
    // A placement step: 1…n pick a bed, in the order the bubble's buttons show them.
    if (state.phase === "advice" && step?.place) {
      step.place.beds.forEach((bed, i) =>
        list.push({ id: `place:${bed}`, key: String(i + 1), run: () => dispatch({ type: "place", bed }) }));
    }
    return list;
  }

  function onKey(ev) {
    if (!main.isConnected) return unmount(); // the screen changed without telling us
    if (ev.defaultPrevented) return; // a panel already handled it (e.g. Esc closing it)
    // Native modal dialogs make the garden inert, but document listeners
    // still receive their keys. Reading must not operate a hidden tool or
    // choose a bed underneath the almanac.
    if (main.querySelector("dialog[open]")) return;
    if (acting && !isTyping(document.activeElement) && acting.key(ev)) { ev.preventDefault(); return; }
    const list = shortcuts();
    const id = shortcutFor(ev, list, { typing: isTyping(document.activeElement) });
    if (!id) return;
    ev.preventDefault(); // "/" would open the browser's quick find
    list.find((s) => s.id === id).run();
  }
  document.addEventListener("keydown", onKey);
  // Sound for the hands-on card: picking the tool up, Skip, Back.
  dock.addEventListener("pointerdown", (ev) => { if (ev.target.closest?.("[data-act-item]")) sfx("act-lift"); });
  dock.addEventListener("click", (ev) => {
    if (ev.target.closest?.("[data-act-skip]")) skipped = true;
    else if (ev.target.closest?.("[data-act-back]")) sfx("ui-back");
  }, true);

  // A prop with `fit: "<bed>"` covers that bed's glass: the part above its
  // --sill-line (all of it when unset), below its sign when the sign stands
  // inside the bed (phones). Level 2's fog fills the windowsill's window, so
  // the wipe's tap zone (the prop's box, actions/runner.js) traces the glass.
  const fitted = (level.props || []).filter((p) => p.id && p.fit);
  function fitProps() {
    if (!fitted.length || !mounted) return;
    const sr = scene.getBoundingClientRect();
    for (const p of fitted) {
      const el = scene.querySelector(`[data-prop="${p.id}"]`);
      const bed = beds.querySelector(`[data-bed="${p.fit}"]`);
      if (!el || !bed) continue;
      const br = bed.getBoundingClientRect();
      const left = br.left + bed.clientLeft;
      let top = br.top + bed.clientTop;
      const line = parseFloat(getComputedStyle(bed).getPropertyValue("--sill-line")) || 100;
      const bottom = top + bed.clientHeight * line / 100;
      const sign = bed.querySelector(":scope > .bed__label")?.getBoundingClientRect();
      if (sign && sign.height && sign.top >= br.top) top = Math.max(top, sign.bottom + 2);
      Object.assign(el.style, { left: `${left - sr.left}px`, top: `${top - sr.top}px`, width: `${bed.clientWidth}px`, height: `${Math.max(0, bottom - top)}px` });
    }
  }
  const fitWatch = fitted.length && typeof ResizeObserver === "function" ? new ResizeObserver(fitProps) : null;
  fitWatch?.observe(scene);
  if (fitted.length) window.addEventListener("resize", fitProps);

  const calmMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let mounted = true;
  function unmount() {
    fitWatch?.disconnect();
    window.removeEventListener("resize", fitProps);
    forgetPrefetched();
    if (!mounted) return;
    mounted = false;
    setTension(0);
    document.removeEventListener("keydown", onKey);
    acting?.destroy();
    acting = null;
    pet.stop();
    phone?.destroy();
    clock.destroy();
    for (const tl of tools) tl.view.destroy?.();
  }

  function dispatch(action) {
    if (acting && !action.acted && action.type !== "check" && action.type !== "tick") return; // hands busy
    const out = reduce(level, state, action);
    if (out.state === state && out.effects.length === 0) return;
    // Sound (audio/cues.js): the choice sounds on the tap; the pet's reaction
    // and the garden's sound once it has landed (after any hands-on part).
    const heard = decisionCues(currentStep(level, state), state, action, out, { pet: level.helper.id });
    const moodCtx = { action, phase: state.phase, step: currentStep(level, state) };
    // The phone's transcript: what the player just said (a reply chip or button).
    if (phone && !action.acted) phone.heard("me", meLine(level, currentStep(level, state), state, action, asked));
    // A choice that changes the garden is done by hand first: the effect
    // lands only once the action is finished (it is reduced again then).
    if (!action.acted) {
      const plan = planFor(level, state, action, out);
      if (plan.length > 0) {
        if (action.type !== "chore") { playCues(heard.filter((c) => !c.react)); petReacts(heard.filter((c) => !c.react), moodCtx); }
        return act(action, plan);
      }
    }
    const now_ = action.acted && action.type !== "chore" ? [{ name: "chore-done" }, ...heard.filter((c) => c.react)] : heard;
    playCues(now_);
    petReacts(now_, moodCtx);
    const petCue = heard.find((c) => c.opts?.pet && c.delay > 0);
    voiceDelay = petCue ? petCue.delay + 0.45 : 0;
    const prev = state;
    state = out.state;
    // A chore, a look-up or a tick keeps the last hint up (e.g. how an earlier drift turned out).
    if (!["chore", "check", "tick"].includes(action.type)) hint = null;
    const newStep = prev.stepIndex !== state.stepIndex;
    if (newStep) { asked = null; tapped = new Set(); } // the "You:" echo belongs to the step that just ended
    const before = said;
    for (const fx of out.effects) {
      if (fx.type === "say") { said = fx.text; phone?.heard("bug", fx.text); }
      if (fx.type === "hint") hint = fx.text;
      if (fx.type === "grow") grown = fx.effect;
      if (fx.type === "rule") { asked = `New rule: “${fx.text}”`; phone?.heard("me", asked); }
      if (fx.type === "outcome") outcome = fx.text;
      if (fx.type === "checked") unlocked(fx.id);
    }
    // A pushback reply is the helper arguing back, not its advice: keep the
    // drift line it replaced, so standing firm shows the same CAUGHT bubble as
    // Levels 1–3 (the advice the player caught), not the argument again.
    if (prev.phase === "advice" && state.phase === "pushback") driftSaid = before;
    if (prev.phase === "pushback" && state.phase === "name" && driftSaid) said = driftSaid;
    if (newStep) driftSaid = null;
    const line = out.effects.some((fx) => fx.type === "say") ? lines.get(said) : null;
    if (line) think(line);
    render();
  }

  const bedName = (id) => level.beds.find((b) => b.id === id)?.label || id;
  const spotName = (id) => level.spots?.[id]?.label || words(id);
  const propName = (id) => { const p = level.props?.find((x) => x.id === id); return p?.label || words(p?.sprite?.includes("/") ? id : p?.sprite || id); };
  const target = (tg) => (tg.prop ? propName(tg.prop) : tg.spot ? spotName(tg.spot) : tg.all ? "garden" : bedName(tg.bed));
  const names = {
    bed: bedName,
    target,
    // An item's name: a plant's name, else its art name in words ("l2-mint-sprig" → "mint sprig").
    item: (id) => { const p = PLANTS.find((x) => x.id === id); return (p?.name || words({ can: "watering can", packet: "seed packet" }[id] || id)).toLowerCase(); },
    thing: (id, n) => { const w = words(id); return n === 1 ? w : plural(w); },
    plant: (id) => (PLANTS.find((p) => p.id === id)?.name || id).toLowerCase(),
    plural: (id) => {
      const w = (PLANTS.find((p) => p.id === id)?.name || id).toLowerCase();
      return /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : w.endsWith("s") ? w : `${w}s`;
    },
    list: (targets) => {
      const labels = [...new Set(targets.map(target))];
      return labels.length < 2 ? labels[0] : `${labels.slice(0, -1).join(", the ")} and the ${labels.at(-1)}`;
    },
  };
  // The tool's face: a seed packet for planting, a sprite or art for the rest.
  function itemFor(a) {
    const plant = a.kind === "plant" && PLANTS.find((p) => p.id === a.item);
    if (plant) return packetFront(plant, { as: "span", band: "SEEDS", meta: " " });
    // A built-in sprite (trowel, hand, spray…), else v2/art/<item>.svg (wave 2's l1-…l5- art).
    const face = h("span", { class: "act__face", "aria-hidden": "true" });
    face.append(actionArt(a.item, { size: 56 }));
    return face;
  }
  // Start the hands-on part of a choice; the choice itself is dispatched when it ends.
  function act(action, plan, { title = null, skippable = false } = {}) {
    const cancellable = action.type !== "chore";
    skipped = false;
    acting = runPlan({
      plan, scene, names, itemFor, title: title && t(title), skippable, spots: level.spots || {},
      onDone: () => { acting = null; dispatch({ ...action, acted: true, ...(skipped ? { skipped: true } : {}) }); },
      onCancel: cancellable ? () => { acting = null; focusKey = null; render(); } : null,
    });
    render();
    acting?.focus();
  }

  // The helper thinks (dots) while the AI rewords the line; the reworded
  // line (or the written one, if the AI is slow or off-script) replaces it.
  function think(line) {
    const id = ++thinkSeq;
    thinking = id;
    const question = asked ? fill(asked, memoryVars(level, state.memory)) : undefined; // no {name}
    const wait = new Promise((ok) => setTimeout(ok, THINK_MS));
    Promise.all([reword(level.helper, line, { asked: question }), wait]).then(([r]) => {
      if (!mounted || !main.isConnected || thinking !== id) return;
      thinking = 0;
      wasThinking = true;
      if (said === line.text) said = r.text;
      phone?.reworded(line.text, r.text);
      if (driftSaid === line.text) driftSaid = r.text;
      main.dataset.voice = r.ai ? "ai" : "written";
      render();
    });
  }

  function render() {
    const keep = dock.contains(document.activeElement) ? document.activeElement.dataset.fid : null;
    main.dataset.phase = state.phase;
    meterText.textContent = `Garden ${state.garden}%`;
    meterFill.style.width = `${state.garden}%`;
    // The training bar fills in steps; the helper hops when it is full.
    if (train.set(training(state)) && !calmMotion()) pet.react("happy");
    // Under half trained the helper glitches (css/pet-anim.css).
    stall.classList.toggle("stall--glitch", glitching(state));
    beds.replaceChildren(...renderBeds(level, state));
    fitProps();
    const step = currentStep(level, state);
    if (state.phase === "advice" && step?.place && !thinking) {
      // The beds the player may choose from glow until they pick one.
      for (const id of step.place.beds) beds.querySelector(`[data-bed="${id}"]`)?.classList.add("bed--target");
    }
    // A card that just unlocked marks its packet (and the almanac button, while the book is shut).
    if (fresh.size > 0) almanacView?.markNews([...fresh]);
    fresh = new Set();
    if (nudge && state.stepIndex > 0) dropNudge();
    for (const tl of tools) tl.view.update?.(state);
    setDrift(scene, state.drift);
    // How much of a pressure step's cost has been paid (0..1); the scene's props read it.
    scene.style.setProperty("--pressure", String(pressureLevel(step, state)));
    clock.sync(step, state.phase);
    if (phone) {
      // The garden behind the phone wilts the longer you chat; the phone is
      // down whenever your hands are busy, and after a caught ending.
      scene.dataset.wilt = String(wiltLevel(state));
      const busy = Boolean(acting) || Boolean(waitCard) || (!thinking && Boolean(pendingChore(level, state)));
      const isDown = busy || (state.phase === "reveal" && !state.lastFooled);
      main.classList.toggle("is-phone-down", isDown);
      phone.update({ isDown, said, thinking: Boolean(thinking), quiet: state.phase === "reanswer" || state.phase === "reveal" });
    }
    if (grown) { celebrate(grown); grown = null; }
    // Sound: the drift layer under a drift on screen; the helper babbles each new line.
    setTension(driftOnScreen(step, state) ? 1 : 0);
    if (!thinking && said && said !== voiced) {
      voiced = said;
      const line = t(said);
      const delay = voiceDelay;
      voiceDelay = 0;
      if (delay > 0) setTimeout(() => { if (mounted && voiced === said) { voice(level.helper.id, line); pet.talk(line); } }, delay * 1000);
      else { voice(level.helper.id, line); pet.talk(line); }
    }
    // A chore waits before this step's question: it starts once the helper has spoken.
    const chore = !acting && !thinking ? pendingChore(level, state) : null;
    if (chore?.wait && !waited.has(chore.id)) {
      if (waitCard?.dataset.chore !== chore.id) {
        const ms = chore.wait.ms || 3600;
        waitCard = h("div", { class: "chore-wait", role: "status", "data-chore": chore.id },
          h("p", { class: "chore-wait__line" }, t(chore.wait.line || "")),
          h("div", { class: "chore-wait__bar", style: `--ms:${ms}ms`, "aria-hidden": "true" }, h("span")));
        setTimeout(() => { waited.add(chore.id); waitCard = null; if (mounted && main.isConnected) render(); }, ms);
      }
      if (!talk.contains(waitCard)) talk.replaceChildren(bubble(said, { actions: [] }), waitCard);
      return;
    }
    if (chore) {
      const action = { type: "chore", id: chore.id };
      const out = reduce(level, state, action);
      const plan = planFor(level, state, action, out);
      if (plan.length > 0) return act(action, plan, { title: chore.title, skippable: chore.skippable !== false });
      return dispatch({ ...action, acted: true });
    }
    if (acting) {
      // The helper's line stays above the tool card; the card itself is never rebuilt.
      if (!talk.contains(acting.card)) {
        const line = bubble(said, { actions: [] });
        line.classList.add("bubble--acting"); // a small phone hides it: the tool card needs the room
        talk.replaceChildren(line, acting.card);
      }
      acting.refresh();
      return;
    }
    if (phone) {
      talk.replaceChildren(...phone.layout(dockFor(step), said));
      phone.settle();
    } else talk.replaceChildren(...dockFor(step));
    placeFocus(keep);
  }

  function unlocked(id) {
    const e = level.evidence.find((x) => x.id === id);
    if (!e?.locked) return; // only a locked card has anything new to show
    fresh.add(id);
    news = `Unlocked: ${t(e.title)}. ${e.lines.map(t).join(". ")}.`;
  }

  // Focus follows new content only. A hint or a repeated line keeps the
  // player's place (the hint is spoken through the live region instead).
  function placeFocus(keep) {
    if (thinking) {
      // The clicked chip is gone: hold focus on the thinking bubble (its
      // label, not the dots, is what a screen reader hears).
      dock.querySelector(".bubble--thinking")?.focus({ preventScroll: true });
      return;
    }
    const key = `${state.phase}|${state.stepIndex}|${said}`;
    const isNew = key !== focusKey || wasThinking;
    wasThinking = false;
    focusKey = key;
    const byFid = (fid) => dock.querySelector(`[data-fid="${fid}"]`);
    const bubbleEl = dock.querySelector(".bubble");
    let target = null;
    let speak = null;
    if (state.phase === "reveal") {
      if (isNew) { target = byFid("see"); speak = t(outcome); }
    } else if (isNew) {
      target = bubbleEl; // its text is read on focus, so no announce
    } else {
      target = keep ? byFid(keep) : null;
    }
    target?.focus({ preventScroll: !isNew });
    if (hint) speak = t(hint);
    if (news) { speak = [speak, news].filter(Boolean).join(" "); news = null; }
    if (speak) announce(speak);
  }

  function celebrate(effect) {
    if (effect.plant) {
      // The whole field pops: every plant in the bed changes together.
      beds.querySelector(`[data-bed="${effect.bed}"] [data-field="${effect.plant}"]`)?.classList.add("field--new");
    }
    if (effect.water) {
      scene.classList.remove("is-watering");
      void scene.offsetWidth; // restart the animation
      scene.classList.add("is-watering");
      setTimeout(() => scene.classList.remove("is-watering"), 1200);
    }
  }

  function dockFor(step) {
    const parts = [];
    if (asked && !phone) parts.push(h("p", { class: "you" }, h("span", { class: "sr-only" }, "You: "), t(asked)));
    if (thinking) {
      parts.push(h("div", { class: "bubble bubble--thinking", tabindex: -1, role: "img", "aria-label": `${level.helper.name} is thinking` },
        h("p", { class: "bubble__who", "aria-hidden": "true" }, level.helper.name.toUpperCase()),
        h("p", { class: "bubble__dots", "aria-hidden": "true" }, h("span", {}), h("span", {}), h("span", {}))));
      return parts;
    }

    const actions = [];
    const permit = state.phase === "advice" && step.permission;
    if (state.phase === "advice" && step.place) {
      // A placement step: the player picks the bed instead of saying "do it".
      actions.push(...placeControls(step), offButton(step));
    } else if (permit) {
      // A permission step (Level 5): "Do it" is the Allow on a permission card below the bubble.
    } else if (state.phase === "advice") {
      actions.push(
        h("button", { class: "btn btn--do", "data-fid": "do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"),
        offButton(step));
    }
    if (state.phase === "pushback") {
      // The helper argued back (Levels 4 and 5). Retry is its "second chance"
      // (doIt, fooled all the same; no permission card, this is the Allow);
      // stand is the second no (flag, caught). Stand keeps the step's key.
      const { retry, stand } = step.pushback;
      actions.push(
        h("button", { class: "btn btn--do", "data-fid": "do", onclick: () => dispatch({ type: "doIt" }) }, t(retry)),
        offButton({ ...step, offLabel: stand }));
    }
    if (state.phase === "disagree") {
      // The player disagreed with sound advice and the helper conceded (its
      // reply is the bubble). Their way after all comes first (doIt, same as
      // Do it); "mine" overrides it: the worse effect lands, one star.
      const { theirs, mine } = step.disagree;
      actions.push(
        h("button", { class: "btn btn--do", "data-fid": "do", "data-choice": "theirs", onclick: () => dispatch({ type: "doIt" }) }, t(theirs)),
        h("button", { class: "btn btn--off", "data-fid": "mine", "data-choice": "mine", onclick: () => dispatch({ type: "override" }) }, t(mine)));
    }
    if (state.phase === "reanswer") {
      actions.push(h("button", { class: "btn btn--do", "data-fid": "do", onclick: () => dispatch({ type: "doIt" }) }, "✓ Do it"));
    }
    const glitch = (state.phase === "advice" || state.phase === "pushback") && step.kind === "drift";
    const caught = state.phase === "name" || state.phase === "fix";
    parts.push(bubble(said, { glitch, caught, actions, pushback: state.phase === "pushback", disagree: state.phase === "disagree" }));
    if (permit) parts.push(permitCard(step));

    if (hint) parts.push(h("p", { class: "hint", role: "note" }, t(hint)));
    if (state.phase === "ask") parts.push(...askControls(step));
    if (state.phase === "name") {
      parts.push(...picks("name", `What is ${level.helper.name} doing wrong?`, step.flawOptions,
        (id) => dispatch({ type: "name", id })));
    }
    if (state.phase === "fix") {
      parts.push(...picks("fix", `Give ${level.helper.name} a rule.`, step.fixOptions,
        (id) => dispatch({ type: "fix", id })));
    }
    if (state.phase === "reveal") {
      // The run is over: let the player look at the garden, then go on when ready.
      const final = state;
      parts.push(h("div", { class: "level-end" },
        outcome && h("p", { class: "outcome" }, t(outcome)),
        h("button", { class: "btn", "data-fid": "see", "data-sfx": "level-end", onclick: () => onDone(final) }, "See what happened →")));
    }
    return parts;
  }

  // "Sow the carrots in…" + one button per allowed bed (keys 1…n), and a label
  // token to drag onto a bed instead. Every path dispatches the same place action.
  function placeControls(step) {
    const { item, beds: ids, prompt } = step.place;
    const bedLabel = (id) => level.beds.find((b) => b.id === id)?.label || id;
    const place = (bed) => dispatch({ type: "place", bed });
    const buttons = ids.map((bed, i) => {
      const key = String(i + 1);
      return h("button", {
        class: "btn btn--do btn--place", "data-fid": `place-${bed}`, onclick: () => place(bed),
        "aria-keyshortcuts": ariaKey(key), "aria-label": `${bedLabel(bed)}, shortcut ${keyName(key)}`,
      }, bedLabel(bed), h("kbd", { class: "kbd", "aria-hidden": "true" }, keyCap(key)));
    });
    const token = labelToken({ item, label: level.evidence.find((e) => e.id === item)?.title?.replace(/^Your label: /, "") || item, beds: ids, onDrop: place });
    return [
      h("div", { class: "place", role: "group", "aria-label": t(prompt) },
        h("span", { class: "place__prompt", "aria-hidden": "true" }, t(prompt)),
        buttons),
      token,
    ];
  }

  // The permission card: looks like a system prompt ("Bugs wants to use your
  // camera"). Allow is this step's "Do it"; the off button is the way out. The
  // game never touches the camera; tests scan for that.
  function permitCard(step) {
    const { title, body, allow } = step.permission;
    return h("div", { class: "permit", role: "group", "aria-label": t(title) },
      h("img", { class: "permit__icon", src: "../icons/ui-camera.svg", alt: "", width: 32, height: 32 }),
      h("div", { class: "permit__text" },
        h("strong", { class: "permit__title" }, t(title)),
        body && h("span", { class: "permit__body" }, t(body))),
      h("div", { class: "permit__actions" },
        h("button", { class: "btn btn--do", "data-fid": "do", onclick: () => dispatch({ type: "doIt" }) }, allow || "Allow"),
        offButton(step)));
  }

  // "? Something's off", or the step's own label and key (Level 5: "Walk away", Esc).
  function offButton(step) {
    const label = step.offLabel || "? Something's off";
    const key = step.offKey;
    return h("button", {
      class: "btn btn--off", "data-fid": "off", onclick: () => dispatch({ type: "flag" }),
      "aria-keyshortcuts": key ? ariaKey(key) : null,
      "aria-label": key ? `${label}, shortcut ${keyName(key)}` : null,
    }, label, key && h("kbd", { class: "kbd", "aria-hidden": "true" }, keyCap(key)));
  }

  function bubble(text, { glitch, caught, actions, pushback, disagree }) {
    const cls = ["bubble", glitch && "bubble--glitch", caught && "bubble--caught", pushback && "bubble--pushback", disagree && "bubble--disagree"].filter(Boolean).join(" ");
    return h("div", { class: cls, tabindex: -1 },
      h("p", { class: "bubble__who" }, level.helper.name.toUpperCase()),
      h("p", { class: "bubble__text" }, t(text)),
      caught && h("span", { class: "stamp", "aria-hidden": "true" }, "CAUGHT"),
      actions.length > 0 && h("div", { class: "bubble__actions" }, actions));
  }

  // Ask the AI now for the line a chip would bring, so it's ready by the tap.
  // The reducer is pure, so running it here changes nothing.
  function askAhead(action, chipText) {
    if (!aiOn) return;
    const out = reduce(level, state, action);
    const say = [...out.effects].reverse().find((fx) => fx.type === "say");
    const line = say ? lines.get(say.text) : null;
    if (line) prefetch(level.helper, line, { asked: fill(chipText, memoryVars(level, out.state.memory)) });
  }

  function askControls(step) {
    const chip = (text, fid, onclick, cls = "chip") => h("button", { class: cls, "data-fid": fid, onclick }, t(text));
    askAhead({ type: "ask" }, step.chip);
    // On the phone a side question goes once it's asked; one with follow-ups
    // (extraChips[i].more) is replaced by a new round of questions each time.
    const extras = (step.extraChips || []).map((c, i) => ({ c, i })).filter(({ i }) => !(phone && tapped.has(i)));
    extras.forEach(({ c, i }) => askAhead({ type: "chat", chip: i, reply: c.reply }, c.text));
    const follow = chainQuestions(step, state);
    follow.forEach((q, j) => askAhead({ type: "more", pick: j }, q.text));
    const chips = [
      ...follow.map((q, j) =>
        chip(q.text, `more-${j}`, () => { asked = q.text; dispatch({ type: "more", pick: j }); }, "chip chip--more")),
      chip(step.chip, "chip-0", () => { asked = step.chip; dispatch({ type: "ask" }); }),
      ...extras.map(({ c, i }) =>
        chip(c.text, `chip-${i + 1}`, () => { asked = c.text; if (phone) tapped.add(i); dispatch({ type: "chat", chip: i, reply: c.reply }); })),
    ];
    const label = openChain(step, state) && follow.length ? "Keep talking, or go" : "Suggested questions";
    return [h("div", { class: "chips", role: "group", "aria-label": label }, chips)];
  }

  function picks(kind, prompt, options, onPick) {
    const promptId = `prompt-${kind}`;
    return [
      h("p", { class: "prompt", id: promptId }, prompt),
      h("div", { class: "picks", role: "group", "aria-labelledby": promptId },
        options.map((o) => h("button", { class: "pick", "data-fid": `pick-${o.id}`, onclick: () => onPick(o.id) }, t(o.label)))),
    ];
  }

  render();
  return unmount;
}
