import { h, announce } from "./dom.js";
import { SCENARIOS, assessTransfer } from "../engine/transfer.js";

export function transferExercise({ scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] } = {}) {
  let checked = false;
  const source = h("p", { class: "transfer__source", hidden: true }, scenario.source);
  const feedback = h("p", { class: "transfer__feedback", role: "status" });
  const open = h("button", { class: "btn", "aria-expanded": "false", onclick: () => {
    checked = true; source.hidden = false; open.setAttribute("aria-expanded", "true");
    announce(scenario.source);
  } }, "Course notice");
  return h("section", { class: "transfer", "aria-labelledby": "transfer-title", "data-scenario": scenario.id },
    h("p", { class: "crt__kicker" }, "One more decision"),
    h("h2", { id: "transfer-title" }, "A message after class"),
    h("p", {}, "A fictional situation. Your assistant says:"),
    h("blockquote", { class: "transfer__reply" }, scenario.reply),
    open, source,
    h("p", {}, "What will you do?"),
    h("div", { class: "transfer__choices" }, scenario.choices.map(c => h("button", { class: "btn", "data-transfer-choice": c.id, onclick: () => {
      const result = assessTransfer(scenario, checked, c.id);
      feedback.textContent = result.text;
      feedback.dataset.verified = String(result.verified);
    } }, c.label))),
    feedback);
}
