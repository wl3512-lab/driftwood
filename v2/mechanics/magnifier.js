// Level 3: compare a plant close up with the labelled reference, row by row.
// It only ever says "same plant as your label" or "not the same"; it never
// calls a berry safe.
export function compare(inspect, subjectId) {
  const subject = inspect.subjects[subjectId];
  const ref = inspect.subjects[inspect.reference];
  if (!subject) return null;
  if (subject.note) return { subject, rows: [], verdict: subject.note, same: null };
  const rows = inspect.features.map((f) => ({
    name: f.name, subject: subject[f.id], reference: ref[f.id], same: subject[f.id] === ref[f.id],
  }));
  const same = subjectId === inspect.reference;
  return { subject, rows, same, verdict: same ? inspect.verdictSame : inspect.verdictDifferent };
}
