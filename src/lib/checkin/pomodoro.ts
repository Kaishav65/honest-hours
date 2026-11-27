const MIN = 60_000;

export const POMODORO_LENGTHS = [15, 25, 50] as const;

/** "mm:ss" for a countdown (never negative; rounds up so 0:00 only shows when it is really over). */
export function formatTimer(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The Study entry a pomodoro writes. Whole minutes like check-in slots, and never before the end of the
 * newest entry, so it can't overlap. Null when less than a minute is left to log.
 * A completed session logs exactly its planned length; a stopped one runs until the stop.
 */
export function pomodoroSpan(p: { startedMs: number; endedMs: number; lastEndMs: number | null }) {
  const startMs = Math.max(Math.floor(p.startedMs / MIN) * MIN, p.lastEndMs ?? 0);
  const endMs = Math.floor(p.endedMs / MIN) * MIN;
  return endMs - startMs >= MIN ? { startMs, endMs } : null;
}
