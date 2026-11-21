import type { AnswerValue, Answers, EntryAnswerFields, Question } from "./types";

const isEmpty = (v: AnswerValue | undefined) =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "number" && Number.isNaN(v));

/**
 * Turn the answers to a category's questions into `entries` columns.
 * Questions with a system_key go to their own column; the rest go into `answers` (by question id).
 */
export function answersToFields(questions: Question[], answers: Answers) {
  const extra: Record<string, AnswerValue> = {};
  const fields: EntryAnswerFields = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (isEmpty(v)) continue;
    switch (q.systemKey) {
      case "planned":
        fields.planned = Boolean(v);
        break;
      case "trigger":
        fields.trigger = String(v);
        break;
      case "mood_after":
        fields.mood_after = String(v);
        break;
      case "focus":
        fields.focus = Number(v);
        break;
      case "phone_checks":
        fields.phone_checks = Number(v);
        break;
      default:
        extra[q.id] = v as AnswerValue;
    }
  }
  return { ...fields, answers: extra };
}

/** The reverse: read a saved entry back into answers (used to prefill the next check-in). */
export function fieldsToAnswers(questions: Question[], entry: EntryAnswerFields): Answers {
  const out: Answers = {};
  for (const q of questions) {
    let v: unknown;
    switch (q.systemKey) {
      case "planned":
        v = entry.planned;
        break;
      case "trigger":
        v = entry.trigger;
        break;
      case "mood_after":
        v = entry.mood_after;
        break;
      case "focus":
        v = entry.focus;
        break;
      case "phone_checks":
        v = entry.phone_checks;
        break;
      default:
        v = entry.answers?.[q.id];
    }
    if (v !== null && v !== undefined) out[q.id] = v as AnswerValue;
  }
  return out;
}
