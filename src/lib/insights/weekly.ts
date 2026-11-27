import { dayForDate, dayOf, localParts, type TrackedDay } from "@/lib/time";
import type { CategoryKind } from "@/lib/checkin/types";
import { disciplineScore, focusScore } from "./scores";

const MIN = 60_000;
const HOUR = 60 * MIN;

export const WEEK_UNLOCK_DAYS = 4; // "Unlocks after 4 days" (PLAN §11 minimum data rule)
export const HISTORY_DAYS = 28; // averages for the projection and best focus hours
export const HISTORY_WEEKS = 8; // strong / weak weekday
export const POMODORO_MIN = 25;

export type WEntry = {
  categoryId: string;
  kind: CategoryKind;
  value: "productive" | "neutral" | "waste";
  startMs: number;
  endMs: number;
  planned: boolean | null;
  trigger: string | null;
  focus: number | null;
  phoneChecks: number | null;
};

const clip = (e: { startMs: number; endMs: number }, from: number, to: number) => Math.max(0, Math.min(e.endMs, to) - Math.max(e.startMs, from)) / MIN;
const isWaste = (e: WEntry) => e.value === "waste" && e.planned !== true;

/** The Monday-to-Sunday week (7 tracked days) containing `today`, shifted by `offsetWeeks` (-1 = last week). */
export function weekOf(today: TrackedDay, offsetWeeks: number, timeZone: string, dayStartHour: number): TrackedDay[] {
  const [y, m, d] = today.date.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(Date.UTC(y, m - 1, d - dow + offsetWeeks * 7 + i));
    return dayForDate(t.toISOString().slice(0, 10), timeZone, dayStartHour);
  });
}

export type WeekInput = {
  days: TrackedDay[];
  nowMs: number;
  timeZone: string;
  dayStartHour: number;
  /** Entries of the last ~8 weeks (the week itself and the history for averages). */
  entries: WEntry[];
  /** Study goal of each day: its day_logs snapshot, or the current weekday/weekend goal. Keyed by date. */
  goalByDate: Record<string, number>;
  plannedByDate: Record<string, number | null>;
  /** Pomodoros that have ended (started time, completed or stopped early). */
  pomodoros: { startedMs: number; completed: boolean }[];
  /** Start times of every sleep entry. */
  sleepStarts: number[];
};

export type DayStat = {
  day: TrackedDay;
  studyMin: number;
  goalMin: number;
  wastedMin: number;
  loggedMin: number;
  trackedPct: number;
  hasData: boolean;
  /** Not started yet. */
  future: boolean;
  /** The study average of this day type, shown as an "expected" bar for the days left. */
  expectedMin: number | null;
};

export type Grade = "A" | "B" | "C" | "D" | "F";
export const gradeOf = (score: number): Grade => (score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F");

export type Metric = { key: string; name: string; score: number | null; value: string; grade: Grade | null };

const plain = (min: number) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

/** The `n` tracked days before the one containing `refMs`, newest first. */
function daysBefore(refMs: number, n: number, timeZone: string, dayStartHour: number) {
  const out: TrackedDay[] = [];
  let d = dayOf(refMs, timeZone, dayStartHour);
  for (let i = 0; i < n; i++) {
    d = dayOf(d.startMs - 1, timeZone, dayStartHour);
    out.push(d);
  }
  return out;
}

const studyIn = (es: WEntry[], day: TrackedDay) =>
  es.filter((e) => e.kind === "study").reduce((s, e) => s + clip(e, day.startMs, day.endMs), 0);
const entriesOn = (all: WEntry[], day: TrackedDay) => all.filter((e) => e.endMs > day.startMs && e.startMs < day.endMs);

/** Everything on the "This week" tab and the report card inputs. */
export function computeWeek(input: WeekInput) {
  const { days, nowMs, timeZone, dayStartHour, entries, goalByDate, plannedByDate } = input;
  const weekStart = days[0].startMs;
  const weekEnd = days[6].endMs;
  const to = Math.min(weekEnd, nowMs);
  const inWeek = entries.filter((e) => e.endMs > weekStart && e.startMs < weekEnd);
  // Reference point: now for the current week, the end of the week for a finished one. History = days before it.
  const refMs = Math.min(nowMs, weekEnd - 1);
  const history = daysBefore(refMs, HISTORY_WEEKS * 7, timeZone, dayStartHour);
  const avgOf = (type: "weekday" | "weekend") => {
    // a day with nothing logged says nothing about how much you study
    const v = history
      .slice(0, HISTORY_DAYS)
      .filter((d) => d.dayType === type)
      .map((d) => ({ d, es: entriesOn(entries, d) }))
      .filter((x) => x.es.length > 0)
      .map((x) => studyIn(x.es, x.d));
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const avg = { weekday: avgOf("weekday"), weekend: avgOf("weekend") };

  const stats: DayStat[] = days.map((day) => {
    const upTo = Math.min(day.endMs, nowMs);
    const es = inWeek.filter((e) => e.endMs > day.startMs && e.startMs < day.endMs);
    const loggedMin = es.reduce((s, e) => s + clip(e, day.startMs, upTo), 0);
    const future = day.startMs > nowMs;
    return {
      day,
      studyMin: es.filter((e) => e.kind === "study").reduce((s, e) => s + clip(e, day.startMs, upTo), 0),
      goalMin: goalByDate[day.date] ?? 0,
      wastedMin: es.filter(isWaste).reduce((s, e) => s + clip(e, day.startMs, upTo), 0),
      loggedMin,
      trackedPct: upTo > day.startMs ? Math.min(100, (loggedMin / ((upTo - day.startMs) / MIN)) * 100) : 0,
      hasData: loggedMin > 0,
      future,
      expectedMin: future ? avg[day.dayType] : null,
    };
  });

  const loggedDays = stats.filter((s) => s.hasData);
  const unlocked = loggedDays.length >= WEEK_UNLOCK_DAYS;
  const studySoFar = stats.reduce((s, d) => s + d.studyMin, 0);
  const weeklyGoal = stats.reduce((s, d) => s + d.goalMin, 0);
  const remaining = stats.filter((d) => d.future);
  const expectedRest = remaining.every((d) => d.expectedMin !== null) ? remaining.reduce((s, d) => s + (d.expectedMin ?? 0), 0) : null;
  const projection = expectedRest === null ? null : studySoFar + expectedRest;
  const dailyGap = projection !== null && remaining.length > 0 ? Math.max(0, weeklyGoal - projection) / remaining.length : null;

  const wastedMin = stats.reduce((s, d) => s + d.wastedMin, 0);
  const commuteMin = inWeek.filter((e) => e.kind === "commute").reduce((s, e) => s + clip(e, weekStart, to), 0);

  // Drift triggers: share of wasted minutes per trigger, and the 2-hour window of the day with most waste.
  const wasteEntries = inWeek.filter(isWaste);
  const byTrigger = new Map<string, number>();
  const byWindow = new Map<number, number>();
  for (const e of wasteEntries) {
    const min = clip(e, weekStart, to);
    if (min <= 0) continue;
    const key = e.trigger ?? "No reason given";
    byTrigger.set(key, (byTrigger.get(key) ?? 0) + min);
    for (let t = Math.max(e.startMs, weekStart); t < Math.min(e.endMs, to); t += 5 * MIN) {
      const w = Math.floor(localParts(t, timeZone).hour / 2) * 2;
      byWindow.set(w, (byWindow.get(w) ?? 0) + Math.min(5, (Math.min(e.endMs, to) - t) / MIN));
    }
  }
  const triggers = [...byTrigger.entries()]
    .map(([trigger, min]) => ({ trigger, min, share: wastedMin > 0 ? Math.round((min / wastedMin) * 100) : 0 }))
    .sort((a, b) => b.min - a.min);
  const topWindow = [...byWindow.entries()].sort((a, b) => b[1] - a[1])[0];

  // Best focus hours: average focus by hour of day over the last 28 days, 3+ rated sessions per hour.
  const histFrom = history[HISTORY_DAYS - 1].startMs;
  const byHour = new Map<number, number[]>();
  for (const e of entries) {
    if (e.kind !== "study" || e.focus === null || e.endMs < histFrom || e.startMs > refMs) continue;
    const h = localParts(e.startMs, timeZone).hour;
    byHour.set(h, [...(byHour.get(h) ?? []), e.focus]);
  }
  const hours = [...byHour.entries()]
    .filter(([, f]) => f.length >= 3)
    .map(([hour, f]) => ({ hour, avg: f.reduce((s, x) => s + x, 0) / f.length, sessions: f.length }))
    .sort((a, b) => b.avg - a.avg);
  const bestFocusHour = hours[0] ?? null;

  // Strong / weak weekday: average study per weekday over the last 8 weeks, 2+ logged days each.
  const perWeekday = new Map<number, number[]>();
  for (const d of history) {
    const es = entriesOn(entries, d);
    if (es.length === 0) continue;
    const dow = (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    perWeekday.set(dow, [...(perWeekday.get(dow) ?? []), studyIn(es, d)]);
  }
  const weekdayAvg = [...perWeekday.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([dow, v]) => ({ dow, avg: v.reduce((s, x) => s + x, 0) / v.length }))
    .sort((a, b) => b.avg - a.avg);
  // Only when the days really differ: identical averages have no strongest or weakest day.
  const spread = weekdayAvg.length >= 2 && weekdayAvg[0].avg - weekdayAvg[weekdayAvg.length - 1].avg >= 1;
  const strongDay = spread ? weekdayAvg[0] : null;
  const weakDay = spread ? weekdayAvg[weekdayAvg.length - 1] : null;

  // Scores for the week
  const counted = loggedDays.length || 1;
  const goalDaysMet = stats.filter((d) => d.hasData && d.studyMin >= d.goalMin).length;
  const plannedTotal = stats.filter((d) => d.hasData).reduce((s, d) => s + (plannedByDate[d.day.date] ?? d.goalMin), 0);
  const focus = focusScore(inWeek, weekStart, to);
  const discipline = disciplineScore({
    entries: inWeek,
    fromMs: weekStart,
    toMs: to,
    plannedStudyMin: plannedTotal,
    goalMin: stats.filter((d) => d.hasData).reduce((s, d) => s + d.goalMin, 0),
    goalHit: goalDaysMet / counted,
  });

  // Report card (PLAN §11). Per-day ratios use the days that have data, not a fixed 7, so a week in progress isn't punished.
  const rated = inWeek.filter((e) => e.kind === "study" && (e.focus !== null || e.phoneChecks !== null));
  const ratedHours = rated.reduce((s, e) => s + clip(e, weekStart, to), 0) / 60;
  const phones = rated.reduce((s, e) => s + (e.phoneChecks ?? 0), 0);
  const pomos = input.pomodoros.filter((p) => p.startedMs >= weekStart && p.startedMs < weekEnd);
  const earlyDays = stats.filter((d) => d.hasData && inWeek.filter((e) => e.kind === "study").reduce((s, e) => s + clip(e, d.day.startMs, d.day.startMs + Math.max(0, 8 - dayStartHour) * HOUR), 0) >= 30).length;
  const nights = stats.flatMap((d) => {
    const sleeps = input.sleepStarts.filter((s) => s >= d.day.startMs + 14 * HOUR && s < d.day.endMs);
    return sleeps.length ? [sleeps[0] < d.day.startMs + 21 * HOUR] : [];
  });
  const metric = (key: string, name: string, score: number | null, value: string): Metric => ({
    key,
    name,
    score: score === null ? null : Math.round(Math.max(0, Math.min(100, score))),
    value,
    grade: score === null ? null : gradeOf(Math.max(0, Math.min(100, score))),
  });
  const avgWasted = wastedMin / counted;
  const metrics: Metric[] = [
    metric("goal", "Study goal hit", (goalDaysMet / counted) * 100, `${goalDaysMet} of ${loggedDays.length} days`),
    metric("focus", "Focus score", focus, focus === null ? "no rated sessions" : String(focus)),
    metric("discipline", "Discipline score", discipline, discipline === null ? "—" : String(discipline)),
    metric("pomodoro", "Pomodoro completion", pomos.length ? (pomos.filter((p) => p.completed).length / pomos.length) * 100 : null, pomos.length ? `${pomos.filter((p) => p.completed).length} of ${pomos.length} finished` : "no pomodoros"),
    metric("wasted", "Wasted time", 100 * (1 - avgWasted / 120), `avg ${plain(avgWasted)} / day`),
    metric("phone", "Phone during study", ratedHours > 0 ? 100 - 20 * (phones / ratedHours) : null, ratedHours > 0 ? `${(phones / ratedHours).toFixed(1)} checks / hour` : "no rated sessions"),
    metric("sleep", "Sleep before 12", nights.length ? (nights.filter(Boolean).length / nights.length) * 100 : null, nights.length ? `${nights.filter(Boolean).length} of ${nights.length} nights` : "no sleep logged"),
    metric("early", "Early morning study", (earlyDays / counted) * 100, `${earlyDays} of ${loggedDays.length} days`),
    metric("tracking", "Tracking completeness", loggedDays.length ? loggedDays.reduce((s, d) => s + d.trackedPct, 0) / loggedDays.length : null, `${Math.round(loggedDays.length ? loggedDays.reduce((s, d) => s + d.trackedPct, 0) / loggedDays.length : 0)}%`),
  ];
  const graded = metrics.filter((m) => m.score !== null);
  const strong = graded.filter((m) => m.grade === "A" || m.grade === "B").sort((a, b) => (b.score as number) - (a.score as number));
  const needsWork = graded.filter((m) => m.grade !== "A" && m.grade !== "B").sort((a, b) => (a.score as number) - (b.score as number));
  const lowest = graded.length ? [...graded].sort((a, b) => (a.score as number) - (b.score as number))[0] : null;
  const fix = lowest
    ? {
        metric: lowest,
        gain: lowest.key === "wasted" && wastedMin > 0 ? `Cutting it by half = +${plain(wastedMin / 2)} of study this week` : null,
      }
    : null;

  return {
    stats,
    unlocked,
    loggedDays: loggedDays.length,
    studySoFar,
    weeklyGoal,
    projection,
    dailyGap,
    remainingDays: remaining.length,
    wastedMin,
    recoverableHalfMin: wastedMin / 2,
    recoverablePomodoros: Math.round(wastedMin / 2 / POMODORO_MIN),
    triggers,
    topWindow: topWindow ? { startHour: topWindow[0], min: topWindow[1] } : null,
    commuteMin,
    bestFocusHour,
    strongDay,
    weakDay,
    focus,
    discipline,
    metrics,
    strong,
    needsWork,
    fix,
  };
}
