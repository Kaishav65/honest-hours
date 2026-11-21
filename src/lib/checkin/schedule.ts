import { dayOf } from "@/lib/time";

const MIN = 60_000;

export const floorToMinute = (ms: number) => Math.floor(ms / MIN) * MIN;

/**
 * Where the next check-in slot starts: right after the last logged entry, but never before
 * today's day start. With nothing logged yet, tracking starts now.
 * Timers are not trusted (background tabs throttle them): everything derives from timestamps.
 */
export function slotStartMs(lastEndMs: number | null, nowMs: number, timeZone: string, dayStartHour: number) {
  if (lastEndMs === null) return floorToMinute(nowMs);
  return Math.max(lastEndMs, dayOf(nowMs, timeZone, dayStartHour).startMs);
}

/** When the next popup is due. A skipped popup waits one more interval; the slot itself keeps growing. */
export function nextDueMs(slotStart: number, lastPromptMs: number | null, intervalMin: number) {
  return Math.max(slotStart, lastPromptMs ?? 0) + intervalMin * MIN;
}
