export type CategoryKind =
  | "sleep"
  | "study"
  | "work"
  | "commute"
  | "routine"
  | "chore"
  | "entertainment"
  | "rest";

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  kind: CategoryKind;
  /** Wasted time = value "waste" and not planned. Present where the coach needs it. */
  value?: "productive" | "neutral" | "waste";
};

export type SystemKey = "planned" | "trigger" | "focus" | "phone_checks" | "mood_after";

export type QuestionType = "rating_1_5" | "yes_no" | "single_choice" | "multi_choice" | "text" | "time" | "number";

export type Question = {
  id: string;
  categoryId: string;
  label: string;
  type: QuestionType;
  options: string[] | null;
  systemKey: SystemKey | null;
};

export type AnswerValue = string | number | boolean | string[];
/** Answers keyed by question id. A missing key = not answered. */
export type Answers = Record<string, AnswerValue>;

/** The answer-related columns of an `entries` row (snake_case, as in the database). */
export type EntryAnswerFields = {
  planned?: boolean | null;
  trigger?: string | null;
  focus?: number | null;
  phone_checks?: number | null;
  mood_after?: string | null;
  answers?: Record<string, unknown> | null;
};

export type LastEntry = { categoryId: string; answers: Answers };
