import type { CategoryKind } from "@/lib/checkin/types";
import { dayOf, type TrackedDay } from "@/lib/time";

const MIN = 60_000;
export const POMODORO_MIN = 25; // goal remaining ÷ 25, rounded up (PLAN §11)
export const POMODORO_SLOT_MIN = 30; // free time left ÷ 30, rounded down

export type InsightEntry = {
  categoryId: string;
  startMs: number;
  endMs: number;
  kind: CategoryKind;
  value: "productive" | "neutral" | "waste";
  planned: boolean | null;
};

export type TodayStats = {
  passedMin: number;
  loggedMin: number;
  unknownMin: number;
  /** logged ÷ minutes passed today, 0–100 */
  trackedPct: number;
  studyMin: number;
  entertainmentMin: number;
  restMin: number;
  /** study + entertainment + rest. Unknown is never counted as free. */
  freeMin: number;
  /** waste-value time that wasn't planned */
  wastedMin: number;
  wastedSessions: number;
  goalRemainingMin: number;
  pomodorosNeeded: number;
  freeLeftMin: number;
  pomodorosPossible: number;
  byCategory: { categoryId: string; kind: CategoryKind; min: number }[];
};

/** Entry minutes inside [day start, min(day end, now)], so nothing in the future or in other days counts. */
const clippedMin = (e: { startMs: number; endMs: number }, from: number, to: number) =>
  Math.max(0, Math.min(e.endMs, to) - Math.max(e.startMs, from)) / MIN;

export function computeToday(input: {
  entries: InsightEntry[];
  day: TrackedDay;
  nowMs: number;
  goalMin: number;
  usualSleepMs: number;
}): TodayStats {
  const { entries, day, nowMs, goalMin, usualSleepMs } = input;
  const to = Math.min(day.endMs, Math.floor(nowMs / MIN) * MIN);
  const passedMin = Math.max(0, (to - day.startMs) / MIN);

  const byCat = new Map<string, { categoryId: string; kind: CategoryKind; min: number }>();
  let wastedMin = 0;
  let wastedSessions = 0;
  for (const e of entries) {
    const min = clippedMin(e, day.startMs, to);
    if (min <= 0) continue;
    const row = byCat.get(e.categoryId) ?? { categoryId: e.categoryId, kind: e.kind, min: 0 };
    row.min += min;
    byCat.set(e.categoryId, row);
    if (e.value === "waste" && e.planned !== true) {
      wastedMin += min;
      wastedSessions += 1;
    }
  }
  const byCategory = [...byCat.values()].sort((a, b) => b.min - a.min);
  const ofKind = (k: CategoryKind) => byCategory.filter((c) => c.kind === k).reduce((s, c) => s + c.min, 0);

  const loggedMin = byCategory.reduce((s, c) => s + c.min, 0);
  const studyMin = ofKind("study");
  const entertainmentMin = ofKind("entertainment");
  const restMin = ofKind("rest");
  const goalRemainingMin = Math.max(0, goalMin - studyMin);
  const freeLeftMin = Math.max(0, (usualSleepMs - nowMs) / MIN);

  return {
    passedMin,
    loggedMin,
    unknownMin: Math.max(0, passedMin - loggedMin),
    trackedPct: passedMin > 0 ? Math.min(100, (loggedMin / passedMin) * 100) : 0,
    studyMin,
    entertainmentMin,
    restMin,
    freeMin: studyMin + entertainmentMin + restMin,
    wastedMin,
    wastedSessions,
    goalRemainingMin,
    pomodorosNeeded: Math.ceil(goalRemainingMin / POMODORO_MIN),
    freeLeftMin,
    pomodorosPossible: Math.floor(freeLeftMin / POMODORO_SLOT_MIN),
    byCategory,
  };
}

/** Sleep starting at or after this many hours into the tracked day (8 PM with a 3 AM start) counts as "going to bed". */
const BEDTIME_FROM_HOUR = 17;
const DEFAULT_BEDTIME_HOUR = 21; // midnight with a 3 AM day start
const MIN_SAMPLES = 3;

/**
 * Usual sleep time on `day`: the median bedtime of recent sleep entries, or midnight until there's enough data.
 * Naps and early-morning sleep (starting before ~8 PM) are ignored.
 */
export function usualSleepMs(sleepStarts: number[], day: TrackedDay, timeZone: string, dayStartHour: number) {
  const offsets = sleepStarts
    .map((s) => (s - dayOf(s, timeZone, dayStartHour).startMs) / MIN)
    .filter((o) => o >= BEDTIME_FROM_HOUR * 60)
    .sort((a, b) => a - b);
  if (offsets.length < MIN_SAMPLES) return day.startMs + DEFAULT_BEDTIME_HOUR * 60 * MIN;
  const mid = Math.floor(offsets.length / 2);
  const median = offsets.length % 2 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2;
  return day.startMs + Math.round(median) * MIN;
}
