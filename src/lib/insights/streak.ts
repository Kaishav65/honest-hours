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

export type DayOutcome = {
  met: boolean;
  /** The goal was missed and a saved freeze covered the day. */
  frozen: boolean;
  /** Streak and saved freezes after this day. */
  streak: number;
  freezes: number;
  /** This day was the 5th, 10th… goal-met day, so it earned a freeze. */
  earnedFreeze: boolean;
};

/** One outcome per finished day (oldest first): met, frozen or broken, with the running streak and freezes. */
export function pastOutcomes(past: { studyMin: number; goalMin: number }[]): DayOutcome[] {
  const out: DayOutcome[] = [];
  let streak = 0;
  let freezes = 0;
  let met = 0;
  for (const d of past) {
    const isMet = d.studyMin >= d.goalMin;
    let earnedFreeze = false;
    let frozen = false;
    if (isMet) {
      streak += 1;
      met += 1;
      if (met % FREEZE_EVERY === 0) {
        earnedFreeze = true;
        freezes = Math.min(MAX_FREEZES, freezes + 1);
      }
    } else if (freezes > 0) {
      freezes -= 1;
      streak += 1;
      frozen = true;
    } else streak = 0;
    out.push({ met: isMet, frozen, streak, freezes, earnedFreeze });
  }
  return out;
}

/**
 * Streak and freezes from the whole history (last item = today), recomputed every time:
 * a day counts when study ≥ its goal, or when a saved freeze covers it (used automatically).
 * Every 5 goal-met days earn a freeze (max 2). Today joins the streak only once its goal is met.
 */
export function computeStreak(days: { studyMin: number; goalMin: number }[]) {
  const past = days.slice(0, -1);
  const today = days.at(-1);
  const outs = pastOutcomes(past);
  const last = outs.at(-1);
  let streak = last?.streak ?? 0;
  let freezes = last?.freezes ?? 0;
  const todayMet = today !== undefined && today.studyMin >= today.goalMin;
  if (todayMet) {
    streak += 1;
    if ((outs.filter((o) => o.met).length + 1) % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  }
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

export type StreakCell = {
  day: TrackedDay;
  studyMin: number;
  goalMin: number;
  /** "today" = still in progress (may already be met). */
  state: "met" | "frozen" | "missed" | "today";
};

/**
 * Everything the Goals page shows, from the same logic as `computeStreak`: one cell per day, current and best
 * streak, freezes saved, and when each freeze was earned or used. `days` is oldest first, last item = today.
 */
export function streakSummary(days: StudyDay[]) {
  const past = days.slice(0, -1);
  const today = days.at(-1);
  const outs = pastOutcomes(past);
  const now = computeStreak(days);
  const cells: StreakCell[] = past.map((d, i) => ({
    ...d,
    state: outs[i].met ? "met" : outs[i].frozen ? "frozen" : "missed",
  }));
  if (today) cells.push({ ...today, state: "today" });
  const events: { date: string; type: "earned" | "used" }[] = [];
  outs.forEach((o, i) => {
    if (o.earnedFreeze) events.push({ date: past[i].day.date, type: "earned" });
    if (o.frozen) events.push({ date: past[i].day.date, type: "used" });
  });
  const metPast = outs.filter((o) => o.met).length;
  if (today && now.todayMet && (metPast + 1) % FREEZE_EVERY === 0) events.push({ date: today.day.date, type: "earned" });
  return {
    cells,
    current: now.streak,
    best: Math.max(now.streak, ...outs.map((o) => o.streak)),
    freezes: now.freezes,
    metDays: metPast + (now.todayMet ? 1 : 0),
    events,
  };
}
