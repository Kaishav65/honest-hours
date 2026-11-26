export type DayLogWake = { wake_at: string | null; sleep_quality: number | null; planned_study_min: number | null };

/**
 * What "I'm awake" writes to today's day_logs row. The first wake of the day wins: a later tap
 * (e.g. after an afternoon nap) only fills fields that are still empty, so it can't replace the
 * morning wake time or the morning study plan.
 */
export function mergeWake(existing: DayLogWake | null, incoming: DayLogWake): DayLogWake {
  if (!existing) return incoming;
  return {
    wake_at: existing.wake_at ?? incoming.wake_at,
    sleep_quality: existing.sleep_quality ?? incoming.sleep_quality,
    planned_study_min: existing.planned_study_min ?? incoming.planned_study_min,
  };
}
