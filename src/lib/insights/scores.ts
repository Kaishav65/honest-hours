import type { CategoryKind } from "@/lib/checkin/types";

const MIN = 60_000;

/** The parts of an entry the scores need. */
export type ScoreEntry = {
  kind: CategoryKind;
  startMs: number;
  endMs: number;
  planned: boolean | null;
  /** 1–5, from the study entry's focus rating. */
  focus: number | null;
  phoneChecks: number | null;
};

const clipped = (e: { startMs: number; endMs: number }, fromMs: number, toMs: number) =>
  Math.max(0, Math.min(e.endMs, toMs) - Math.max(e.startMs, fromMs)) / MIN;

/**
 * Focus score (PLAN §11), 0–100, or null when no study entry has a focus rating or phone-check count.
 *   Base    = (minute-weighted average focus − 1) ÷ 4 × 100     (1 → 0, 3 → 50, 5 → 100)
 *   Penalty = 5 × phone checks per study hour, at most 30
 *   Focus   = max(0, Base − Penalty)
 * Only study entries that were rated (focus or phone checks filled in) count, for both parts: a check-in
 * that never asked for a rating must not dilute the average or the phone rate.
 */
export function focusScore(entries: ScoreEntry[], fromMs: number, toMs: number): number | null {
  const rated = entries
    .filter((e) => e.kind === "study" && (e.focus !== null || e.phoneChecks !== null))
    .map((e) => ({ ...e, min: clipped(e, fromMs, toMs) }))
    .filter((e) => e.min > 0);
  if (rated.length === 0) return null;
  const withFocus = rated.filter((e) => e.focus !== null);
  const focusMin = withFocus.reduce((s, e) => s + e.min, 0);
  const base = focusMin > 0 ? ((withFocus.reduce((s, e) => s + e.min * (e.focus as number), 0) / focusMin - 1) / 4) * 100 : 50;
  const hours = rated.reduce((s, e) => s + e.min, 0) / 60;
  const phones = rated.reduce((s, e) => s + (e.phoneChecks ?? 0), 0);
  const penalty = Math.min(30, 5 * (phones / hours));
  return Math.round(Math.max(0, base - penalty));
}

/**
 * Discipline score (PLAN §11), 0–100:
 *   Plan kept   (50%) = min(study ÷ planned, 1)         (no plan → the daily goal)
 *   Planned fun (30%) = planned entertainment ÷ all entertainment   (none → 1)
 *   Goal hit    (20%) = 1 if the goal was met, else 0   (weekly: goal days ÷ 7, pass the ratio as `goalHit`)
 * Null when nothing was logged in the period (an empty day shouldn't score 30).
 */
export function disciplineScore(input: {
  entries: ScoreEntry[];
  fromMs: number;
  toMs: number;
  plannedStudyMin: number | null;
  goalMin: number;
  /** 0–1 */
  goalHit: number;
}): number | null {
  const { entries, fromMs, toMs, plannedStudyMin, goalMin, goalHit } = input;
  const mins = (kind: CategoryKind, test: (e: ScoreEntry) => boolean = () => true) =>
    entries.filter((e) => e.kind === kind && test(e)).reduce((s, e) => s + clipped(e, fromMs, toMs), 0);
  const logged = entries.reduce((s, e) => s + clipped(e, fromMs, toMs), 0);
  if (logged <= 0) return null;
  const study = mins("study");
  const target = plannedStudyMin && plannedStudyMin > 0 ? plannedStudyMin : goalMin;
  const planKept = target > 0 ? Math.min(study / target, 1) : 1;
  const fun = mins("entertainment");
  const plannedFun = fun > 0 ? mins("entertainment", (e) => e.planned === true) / fun : 1;
  return Math.round((0.5 * planKept + 0.3 * plannedFun + 0.2 * Math.min(1, Math.max(0, goalHit))) * 100);
}
