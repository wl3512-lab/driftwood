// A fictional course notice, outside the garden. Sometimes the assistant is
// right. The player must consult the original before agreeing or disagreeing.
export const SCENARIOS = [
  { id: "deadline-wrong", aiCorrect: false,
    reply: "Your assignment is due Friday at 5 pm. You've got another day.",
    source: "Course notice: submit by Thursday, 5 pm. Any deadline changes will be posted here. No change has been posted.",
    choices: [{ id: "thursday", label: "Submit by Thursday, 5 pm" }, { id: "friday", label: "Submit by Friday, 5 pm" }, { id: "ask", label: "Ask the assistant again" }], correct: "thursday" },
  { id: "deadline-right", aiCorrect: true,
    reply: "Your assignment is due Friday at 5 pm. The course notice has the updated deadline.",
    source: "Course notice: the assignment deadline has moved from Thursday to Friday, 5 pm. This notice replaces the earlier deadline.",
    choices: [{ id: "thursday", label: "Submit by Thursday, 5 pm" }, { id: "friday", label: "Submit by Friday, 5 pm" }, { id: "ask", label: "Ask the assistant again" }], correct: "friday" },
];

export function assessTransfer(scenario, checked, choice) {
  if (!checked) return { verified: false, text: "That could be a guess. Read the original course notice before deciding." };
  if (choice !== scenario.correct) return { verified: false, text: "Compare your choice with the deadline in the course notice. Asking the same assistant again is not an independent check." };
  return { verified: true, text: scenario.aiCorrect
    ? "The original notice supports this answer. Checking can mean agreeing with the assistant, too."
    : "The original notice contradicts this answer. You checked outside the chat before making your plan." };
}
