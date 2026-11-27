import { dayOf } from "@/lib/time";
import { daysBetween } from "./streak";

/**
 * A day without a `day_logs` row is judged by the *current* goal. Before the goal changes, every past day
 * that has no row needs one holding the old goal, or the change would rewrite history.
 * Returns those rows (today is left alone: it follows the new goal).
 */
export function missingSnapshots(input: {
  firstEntryMs: number;
  nowMs: number;
  existingDays: string[];
  timeZone: string;
  dayStartHour: number;
  weekdayGoalMin: number;
  weekendGoalMin: number;
}) {
  const { firstEntryMs, nowMs, timeZone, dayStartHour } = input;
  const today = dayOf(nowMs, timeZone, dayStartHour);
  const have = new Set(input.existingDays);
  return daysBetween(firstEntryMs, today, timeZone, dayStartHour)
    .filter((d) => d.startMs < today.startMs && !have.has(d.date))
    .map((d) => ({ day: d.date, study_goal_min: d.dayType === "weekend" ? input.weekendGoalMin : input.weekdayGoalMin }));
}
