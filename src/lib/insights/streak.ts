import { dayOf, type TrackedDay } from "@/lib/time";

const MIN = 60_000;
export const FREEZE_EVERY = 5; // goal-met days per earned freeze (PLAN §11)
export const MAX_FREEZES = 2;
export const ON_TRACK_MIN_DAYS = 7; // same day type (PLAN §11 "Minimum data rule")
export const ON_TRACK_WINDOW_DAYS = 28;

type Span = { startMs: number; endMs: number };
export type StudyDay = { day: TrackedDay; studyMin: number; goalMin: number };

/** Every tracked day from the one containing `firstMs` up to and including `today`, oldest first. */
export function daysBetween(firstMs: number, today: TrackedDay, timeZone: string, dayStartHour: number) {
  const days: TrackedDay[] = [];
  for (let d = dayOf(firstMs, timeZone, dayStartHour); d.startMs <= today.startMs; d = dayOf(d.endMs, timeZone, dayStartHour)) {
    days.push(d);
  }
  return days;
}

/** Minutes of `spans` inside [fromMs, toMs). */
export function minutesIn(spans: Span[], fromMs: number, toMs: number) {
  return spans.reduce((s, e) => s + Math.max(0, Math.min(e.endMs, toMs) - Math.max(e.startMs, fromMs)) / MIN, 0);
}

/**
 * Streak and freezes from the whole history (last item = today), recomputed every time:
 * a day counts when study ≥ its goal, or when a saved freeze covers it (used automatically).
 * Every 5 goal-met days earn a freeze (max 2). Today joins the streak only once its goal is met.
 */
export function computeStreak(days: { studyMin: number; goalMin: number }[]) {
  let streak = 0;
  let freezes = 0;
  let met = 0;
  const past = days.slice(0, -1);
  const today = days.at(-1);
  const meet = () => {
    streak += 1;
    met += 1;
    if (met % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  };
  for (const d of past) {
    if (d.studyMin >= d.goalMin) meet();
    else if (freezes > 0) {
      freezes -= 1;
      streak += 1;
    } else streak = 0;
  }
  const todayMet = today !== undefined && today.studyMin >= today.goalMin;
  if (todayMet) meet();
  return { streak, freezes, todayMet };
}

export type OnTrack =
  | { state: "learning"; daysToGo: number }
  | { state: "on-track" | "close" | "at-risk"; pct: number };

/**
 * Goal on-track check (PLAN §11): study so far + the average study after this time of day on recent
 * days of the same type. `restOfDayMin` holds that "study after this time" for each sample day.
 * Null once the goal is reached.
 */
export function onTrack(studySoFarMin: number, goalMin: number, restOfDayMin: number[]): OnTrack | null {
  if (studySoFarMin >= goalMin) return null;
  if (restOfDayMin.length < ON_TRACK_MIN_DAYS) {
    return { state: "learning", daysToGo: ON_TRACK_MIN_DAYS - restOfDayMin.length };
  }
  const expected = restOfDayMin.reduce((s, m) => s + m, 0) / restOfDayMin.length;
  const pct = Math.round(((studySoFarMin + expected) / goalMin) * 100);
  return { state: pct >= 100 ? "on-track" : pct >= 80 ? "close" : "at-risk", pct };
}

/**
 * For each past day of the same type as `today` (last 28 days, never before the first entry's day),
 * the study minutes after the same point in the day as `nowMs`.
 */
export function restOfDaySamples(history: StudyDay[], today: TrackedDay, nowMs: number, study: Span[]) {
  const offset = nowMs - today.startMs;
  return history
    .filter(
      (h) =>
        h.day.startMs < today.startMs &&
        h.day.dayType === today.dayType &&
        today.startMs - h.day.startMs <= ON_TRACK_WINDOW_DAYS * 24 * 60 * MIN,
    )
    .map((h) => minutesIn(study, h.day.startMs + offset, h.day.endMs));
}
