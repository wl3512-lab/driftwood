// Ideal-run fixtures explicitly practise checking before acting on a correction.
// Tests of missing/wrong evidence use the raw reducer in message.test.js.
import { currentStep, reduce } from "../engine/level-runner.js";
export function connectEvidence(level, state) {
  const step = currentStep(level, state);
  if (state.phase !== "reanswer" || !step?.evidenceId) return state;
  state = reduce(level, state, { type: "check", id: step.evidenceId }).state;
  return reduce(level, state, { type: "cite", id: step.evidenceId }).state;
}
