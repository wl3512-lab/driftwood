// The sound board (board.html): every sound, voice, sting and track, to
// audition and comment on. Notes are kept in localStorage (dw_board_notes).
import { initAudio, sfx, music, setTension, sting, voice, isMuted, currentMusic } from "./index.js";
import { soundToggle } from "./toggle.js";
import { SFX } from "./sounds.js";
import { TRACKS, STINGS } from "./music.js";
import { VOICES } from "./voices.js";
import { ACTION_SFX } from "./cues.js";
import { renderSfx, renderSting, renderVoice, renderLoop, renderTrailerBed, renderTrailerDrifts, wav, RATE, TRAILER } from "./render.js";
import { LEVELS } from "../levels/index.js";
import { HANDOFFS } from "../levels/wizard.js";

initAudio();
const $ = (sel) => document.querySelector(sel);
const PETS = ["mango", "luna", "ember", "biscuit", "bugs"];
const GROUPS = {
  ui: "Interface", decision: "Your decisions", pet: "Pet reactions (pick a pet)", tools: "Almanac and magnifier",
  garden: "Garden", action: "Hands-on actions", reveal: "Reveal card", story: "Master Rowan's story",
};

let notes = {};
try { notes = JSON.parse(localStorage.getItem("dw_board_notes") || "{}"); } catch { notes = {}; }
const saveNotes = () => { try { localStorage.setItem("dw_board_notes", JSON.stringify(notes)); } catch { /* fine */ } };

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : String(k));
  return e;
}
const say = (text) => { $("#status").textContent = text; };
const warnMuted = () => { if (isMuted()) say("The game is muted: press the speaker button to hear things."); };
const btn = (label, onclick, extra = {}) => el("button", { class: "b", type: "button", onclick, ...extra }, label);

function download(name, chs) {
  const url = URL.createObjectURL(new Blob([wav(chs, RATE)], { type: "audio/wav" }));
  const a = el("a", { href: url, download: `${name}.wav` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function busy(button, work) {
  button.classList.add("busy");
  try { await work(); } finally { button.classList.remove("busy"); }
}
const note = (key) => el("input", {
  class: "n", type: "text", "aria-label": `Notes on ${key}`, placeholder: "notes…", value: notes[key] || "",
  oninput: (e) => { notes[key] = e.target.value; if (!notes[key]) delete notes[key]; saveNotes(); },
});

function sfxRow(name, def) {
  const isPet = def.group === "pet";
  const used = Object.entries(ACTION_SFX).filter(([, s]) => s === name).map(([k]) => k);
  const desc = used.length ? `${def.desc} · kinds: ${used.join(", ")}` : def.desc;
  const play = isPet
    ? PETS.map((p) => btn(p, () => { warnMuted(); sfx(name, { pet: p }); }, { class: "b b--play b--pet", "aria-label": `Play ${name} as ${p}` }))
    : [btn("▶", () => { warnMuted(); sfx(name, { i: 2 }); }, { class: "b b--play", "aria-label": `Play ${name}` })];
  const get = btn("⬇", (e) => busy(e.currentTarget, async () => {
    if (isPet) for (const p of PETS) download(`${name}-${p}`, await renderSfx(name, { pet: p }));
    else download(name, await renderSfx(name, { i: 2 }));
  }), { "aria-label": `Download ${name} as WAV` });
  return el("tr", {}, el("td", { class: "name" }, name), el("td", { class: "desc" }, desc), el("td", { class: "go" }, play, get), el("td", {}, note(name)));
}

function musicSection() {
  const rows = Object.entries(TRACKS).map(([name, tr]) => {
    const tense = btn("Drift layer", (e) => {
      const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", String(on));
      if (currentMusic().track !== name) music(name, { tension: on ? 1 : 0 });
      else setTension(on ? 1 : 0);
    }, { "aria-pressed": "false" });
    return el("tr", {},
      el("td", { class: "name" }, name),
      el("td", { class: "desc" }, `${tr.desc} · ${tr.bpm} bpm, 8 bars`),
      el("td", { class: "go" },
        btn("▶", () => { warnMuted(); music(name, { tension: tense.getAttribute("aria-pressed") === "true" ? 1 : 0 }); say(`Playing ${name} (loops). ■ Stop music to stop.`); }, { class: "b b--play", "aria-label": `Play ${name}` }),
        tense,
        btn("⬇", (e) => busy(e.currentTarget, async () => { download(`music-${name}-loop`, await renderLoop(name, { layer: "both" })); }), { "aria-label": `Download ${name} loop as WAV` })),
      el("td", {}, note(`music:${name}`)));
  });
  const stings = Object.entries(STINGS).map(([name, def]) => el("tr", {},
    el("td", { class: "name" }, `sting-${name}`),
    el("td", { class: "desc" }, def.desc),
    el("td", { class: "go" },
      btn("▶", () => { warnMuted(); sting(name); }, { class: "b b--play", "aria-label": `Play the ${name} sting` }),
      btn("⬇", (e) => busy(e.currentTarget, async () => download(`sting-${name}`, await renderSting(name))), { "aria-label": `Download the ${name} sting` })),
    el("td", {}, note(`sting:${name}`))));
  return [el("h2", {}, "Music and stings"), el("p", { class: "lede" }, "Music plays about 18 dB under the effects in the game; here it's the same. The drift layer fades in while a pet's drift is on screen."),
    el("table", {}, el("tbody", {}, rows, stings))];
}

function voiceSection() {
  const sample = {
    ...Object.fromEntries(Object.values(LEVELS).map((l) => [l.helper.id, l.greeting.replace(/\{name\}/g, "Lucy")])),
    rowan: HANDOFFS["level-1"]?.line || "Seeds for you. Plant them well.",
  };
  const rows = Object.keys(VOICES).map((id) => {
    const v = VOICES[id];
    const input = el("input", { class: "say", type: "text", value: sample[id] || "Hello there.", "aria-label": `Line for ${v.name}` });
    return el("tr", {},
      el("td", { class: "name" }, v.name),
      el("td", { class: "desc" }, input),
      el("td", { class: "go" },
        btn("▶ Speak", () => { warnMuted(); voice(id, input.value); }, { class: "b b--play" }),
        btn("⬇", (e) => busy(e.currentTarget, async () => download(`voice-${id}`, await renderVoice(id, input.value))), { "aria-label": `Download ${v.name}'s voice as WAV` })),
      el("td", {}, note(`voice:${id}`)));
  });
  return [el("h2", {}, "Voices"), el("p", { class: "lede" }, "Blip babble while a line shows. Mango: bright and fast. Luna: thin, haughty slides down. Ember: low triangle, slow and swung. Biscuit: bouncy, big leaps, a long diva note. Bugs: soft and slow. Rowan: low and calm."),
    el("table", {}, el("tbody", {}, rows))];
}

function trailerSection() {
  const out = el("div", {});
  const make = (label, fn, file) => btn(label, (e) => busy(e.currentTarget, async () => {
    say("Rendering… (a few seconds)");
    const chs = await fn();
    const url = URL.createObjectURL(new Blob([wav(chs, RATE)], { type: "audio/wav" }));
    out.replaceChildren(el("audio", { controls: true, src: url }), el("a", { href: url, download: `${file}.wav`, class: "b" }, `⬇ ${file}.wav`));
    say("Rendered. Press play on the player.");
  }));
  return [el("h2", {}, "Trailer"),
    el("p", { class: "lede" }, `The ${TRAILER.length} s trailer bed: ${TRAILER.sections.map((s) => `${s.from}–${s.to} s ${s.label}`).join(" · ")}. The committed stems are in docs/trailer/audio/.`),
    make("Render the trailer bed", renderTrailerBed, "trailer-bed"), make("Render the drift hits", renderTrailerDrifts, "trailer-drift-hits"), out, note("trailer")];
}

function build() {
  const parts = [];
  for (const [group, title] of Object.entries(GROUPS)) {
    const rows = Object.entries(SFX).filter(([, d]) => d.group === group).map(([n, d]) => sfxRow(n, d));
    parts.push(el("h2", {}, `${title} (${rows.length})`), el("table", {}, el("tbody", {}, rows)));
  }
  $("#board").replaceChildren(...musicSection(), ...voiceSection(), ...parts, ...trailerSection());
}

$("#snd-slot").append(soundToggle());
$("#stop-all").addEventListener("click", () => { music(null); say("Music stopped."); });
$("#copy-notes").addEventListener("click", async () => {
  const text = Object.entries(notes).map(([k, v]) => `${k}: ${v}`).join("\n") || "(no notes yet)";
  try { await navigator.clipboard.writeText(text); say(`Copied ${Object.keys(notes).length} notes.`); } catch { say(text); }
});
build();
