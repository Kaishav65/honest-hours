import { dur } from "./rules";

/**
 * "Streak at risk" nudge (PLAN §4.8), shown live on Today (not saved): the goal isn't met yet, there is a
 * streak to lose, and it's evening. Returns null when there is nothing to say.
 */
export function streakAtRiskNudge(input: {
  streakDays: number;
  studyMin: number;
  goalMin: number;
  freeLeftMin: number;
  usualSleepLabel: string;
  localHour: number;
}) {
  const { streakDays, studyMin, goalMin, freeLeftMin, usualSleepLabel, localHour } = input;
  const remaining = goalMin - studyMin;
  if (streakDays < 1 || remaining <= 0 || localHour < 17) return null;
  const enough = freeLeftMin >= remaining;
  return `${dur(studyMin)} studied, ${dur(remaining)} to go to keep your ${streakDays}-day streak. You usually sleep around ${usualSleepLabel}, so ${
    enough ? `you still have time (~${dur(freeLeftMin)} left).` : `time is tight (~${dur(Math.max(0, freeLeftMin))} left). Start now.`
  }`;
}
