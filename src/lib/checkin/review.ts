const MIN = 60_000;
/** The evening review is offered this long before the usual sleep time. */
export const REVIEW_LEAD_MIN = 30;
export const GOAL_MAX_CHARS = 140;

/** Should the evening review open by itself now? Once per day: not if it was saved or already offered. */
export function reviewDue(input: {
  nowMs: number;
  usualSleepMs: number;
  dayEndMs: number;
  done: boolean;
  offered: boolean;
}) {
  const { nowMs, usualSleepMs, dayEndMs, done, offered } = input;
  return !done && !offered && nowMs >= usualSleepMs - REVIEW_LEAD_MIN * MIN && nowMs < dayEndMs;
}

/** Plan vs actual study: "Planned 2h, studied 1h 30m" → how many minutes short (negative = beat the plan). */
export function planGapMin(plannedMin: number | null, studyMin: number) {
  return plannedMin === null ? null : Math.round(plannedMin - studyMin);
}

/** A typed goal, trimmed and capped; null when empty. */
export function cleanGoal(text: string) {
  const t = text.trim().replace(/\s+/g, " ").slice(0, GOAL_MAX_CHARS);
  return t === "" ? null : t;
}
