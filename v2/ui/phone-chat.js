// Level 5's phone (level.chatUi === "phone", css/l5-phone.css). Bugs's chat
// is a phone held up over the garden: a status bar, the stall as the chat's
// header, the conversation so far as chat bubbles, and the player's replies
// at the bottom. Doing anything by hand (a chore, putting the phone down for
// a task) lowers it to a small phone on the porch that keeps buzzing with
// Bugs's sad lines (level.phone.away) while his face sobs.
//
// ui/level-view.js owns the rules and the dock; this module only keeps the
// transcript, lays the dock out as a phone and runs the put-down phone.
import { h, announce } from "./dom.js";
import { PET_MOOD } from "./pet-anim.js";

const PING_MS = 7000; // a new sad message while the phone is down
const MAX_PINGS = 3;  // per put-down, after the first
// Pet cues that mean "you picked the garden over Bugs" or "you stayed".
const GARDEN_CUES = new Set(["chore-done", "grow", "meter-up", "meter-down", "rot", "put-down", "flag", "deny", "stand-firm"]);

// What the player says in the chat for a button that isn't a question chip.
// `asked` is the chip text the view just set; null = nothing is sent.
export function meLine(level, step, prev, action, asked) {
  if (!step) return null;
  if (["ask", "chat", "more"].includes(action.type)) return asked;
  if (prev.phase === "pushback") {
    if (action.type === "doIt") return step.pushback?.retry ?? null;
    if (action.type === "flag") return step.pushback?.stand ?? null;
  }
  if (prev.phase === "advice" && step.kind === "hook" && action.type === "doIt") {
    const list = level.phone?.stayReplies || [];
    return list.length ? list[(prev.stayed || 0) % list.length] : null;
  }
  return null;
}

// Bugs's face for a cue: sad whenever the player tends the garden instead of
// him, pleased whenever they stay (even as the garden slips). Naming the flaw
// and fixing him keep their own faces.
export function phoneMood(cue, action, prevPhase, step) {
  const tending = action.type === "chore" || action.type === "flag" || (action.type === "doIt" && prevPhase === "reanswer");
  const staying = ["chat", "more"].includes(action.type) || (action.type === "doIt" && prevPhase === "advice" && step?.kind === "hook");
  if (GARDEN_CUES.has(cue)) {
    if (tending) return "sad";
    if (staying) return "happy";
  }
  return PET_MOOD[cue];
}

export function createPhone({ level, dock, stall, pet, t }) {
  const cfg = level.phone || {};
  const who = level.helper.name;
  const log = []; // { who: "me" | "bug", text } in order
  const role = stall.querySelector(".stall__role");
  const time = h("span", { class: "phone__time" });
  const bat = h("span", { class: "phone__bat" });
  const status = h("div", { class: "phone__status", "aria-hidden": "true" },
    time, h("span", { class: "phone__icons" }, h("span", { class: "phone__sig" }, h("b"), h("b"), h("b"), h("b")), bat));
  const noteText = h("p", { class: "phone__note-text" });
  const note = h("div", { class: "phone__note", "aria-hidden": "true" },
    h("p", { class: "phone__note-who" }, who.toLowerCase(), h("em", {}, " now")), noteText);
  const badge = h("span", { class: "phone__badge", "aria-hidden": "true" });
  dock.prepend(status);
  stall.append(note, badge);

  let down = null;  // null until the first update
  let unread = 0;
  let pinged = 0;
  let awayAt = 0;   // next line of cfg.away
  let timer = 0;
  let shown = null; // the Bugs line last shown on the phone, held up or as a banner

  const bugLines = () => log.filter((e) => e.who === "bug").length;
  function setStatus() {
    // The night wears on, and the battery with it, as the chat goes on.
    const n = Math.max(0, bugLines() - 1);
    const mins = 22 * 60 + 12 + n * 3;
    const hh = Math.floor(mins / 60) % 24, mm = mins % 60;
    time.textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`;
    const pct = Math.max(9, 64 - n * 2);
    bat.textContent = `${pct}%`;
    bat.classList.toggle("is-low", pct < 30);
  }
  function banner(text) {
    noteText.textContent = text;
    unread += 1;
    badge.textContent = String(unread);
    dock.classList.remove("is-buzzing");
    void dock.offsetWidth; // restart the buzz
    dock.classList.add("is-buzzing");
  }
  function nextAway() {
    const list = cfg.away || [];
    if (!list.length) return null;
    const line = list[awayAt % list.length];
    awayAt += 1;
    return t(line);
  }
  function ping() {
    if (!down || pinged >= MAX_PINGS) return;
    const line = nextAway();
    if (!line) return;
    pinged += 1;
    banner(line);
    pet.react("sad");
  }

  return {
    // The transcript: the player's line, or Bugs's.
    heard(whoSaid, text) { if (text) log.push({ who: whoSaid, text }); },
    // The AI reworded Bugs's line after it was logged.
    reworded(from, to) {
      for (let i = log.length - 1; i >= 0; i--) if (log[i].who === "bug" && log[i].text === from) { log[i].text = to; return; }
    },
    // Each render: held up or put down, the header's status, the banner.
    // quiet: Bugs has been given his rule (reanswer, the end): no more guilt
    // pings; the phone shows what he last said ("go… i'll be fine").
    update({ isDown, said, thinking, quiet = false }) {
      setStatus();
      if (role) role.textContent = thinking ? "typing…" : (cfg.status || level.helper.role || "");
      const line = said ? t(said) : null;
      if (isDown && !down) {
        // Put down: Bugs sobs, and messages straight away. A line he said
        // that the player never saw held up (the greeting, while the lantern
        // is lit first) comes in as the first banner.
        down = true;
        unread = 0;
        pinged = 0;
        const first = line && (line !== shown || quiet) ? line : nextAway();
        shown = line;
        if (first) { banner(first); announce(`${who}: ${first}`); }
        pet.react("sad");
        clearInterval(timer);
        if (!quiet) timer = setInterval(ping, PING_MS);
      } else if (isDown && line && line !== shown) {
        shown = line; // he said something new while the phone was down
        banner(line);
        if (quiet) clearInterval(timer);
      } else if (!isDown && down !== false) {
        down = false;
        clearInterval(timer);
        unread = 0;
        badge.textContent = "";
        dock.classList.remove("is-buzzing");
        if (!thinking) shown = line;
      } else if (!isDown && !thinking) {
        shown = line;
      }
    },
    // The dock as a phone: earlier messages and Bugs's current line scroll;
    // the replies (buttons, questions, picks) stay at the bottom.
    layout(parts, said) {
      const last = log.at(-1);
      const earlier = last?.who === "bug" && last.text === said ? log.slice(0, -1) : log;
      const scroll = h("div", { class: "phone__scroll" },
        earlier.length > 0 && h("ol", { class: "phone__log", "aria-label": "Earlier messages" },
          earlier.map((e) => h("li", { class: `phone__msg phone__msg--${e.who}` },
            h("span", { class: "sr-only" }, e.who === "me" ? "You: " : `${who}: `), t(e.text)))));
      const replies = h("div", { class: "phone__replies" });
      for (const el of parts) {
        if (!el?.nodeType) continue;
        if (el.classList.contains("bubble")) {
          const acts = el.querySelector(":scope > .bubble__actions");
          scroll.append(el);
          if (acts) replies.append(acts);
        } else if (el.matches(".chips, .prompt, .picks, .level-end, .permit")) {
          replies.append(el);
        } else {
          scroll.append(el);
        }
      }
      return replies.childElementCount > 0 ? [scroll, replies] : [scroll];
    },
    // After the dock is on the page: the newest message is in view.
    settle() {
      const scroll = dock.querySelector(".phone__scroll");
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    },
    destroy() { clearInterval(timer); },
  };
}
