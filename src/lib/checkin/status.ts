import { localParts, zonedTimeToMs } from "@/lib/time";

const MIN = 60_000;

/** "HH:MM" → { h, m }, or null if malformed. */
export function parseClock(hhmm: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? { h, m } : null;
}

/** Local date parts for `ms`, shifted by whole days (calendar days in the zone, DST-safe). */
function atClock(ms: number, timeZone: string, dayOffset: number, h: number, m: number) {
  const p = localParts(ms, timeZone);
  return zonedTimeToMs(timeZone, p.year, p.month, p.day + dayOffset, h, m);
}

/** The most recent moment (not after `nowMs`) when the wall clock read `hhmm`. Used for "When did you sleep?". */
export function lastClockOccurrence(hhmm: string, nowMs: number, timeZone: string) {
  const c = parseClock(hhmm);
  if (!c) return null;
  const today = atClock(nowMs, timeZone, 0, c.h, c.m);
  return today <= nowMs ? today : atClock(nowMs, timeZone, -1, c.h, c.m);
}

/** The next moment (after `nowMs`) when the wall clock reads `hhmm`. Used for "Busy until 3:30 PM". */
export function nextClockOccurrence(hhmm: string, nowMs: number, timeZone: string) {
  const c = parseClock(hhmm);
  if (!c) return null;
  const today = atClock(nowMs, timeZone, 0, c.h, c.m);
  return today > nowMs ? today : atClock(nowMs, timeZone, 1, c.h, c.m);
}

/** "HH:MM" wall-clock of an instant, for prefilling time inputs. */
export function clockOf(ms: number, timeZone: string) {
  const p = localParts(ms, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export const busyEndMs = (startMs: number, minutes: number) => startMs + minutes * MIN;

/** Late night = from 22:00 until the day starts. Only then do unanswered popups mean "asleep". */
export function isLateNight(ms: number, timeZone: string, dayStartHour: number) {
  const hour = localParts(ms, timeZone).hour;
  return hour >= 22 || hour < dayStartHour;
}

/** After this many unanswered popups in a row at night, the app goes quiet. */
export const QUIET_AFTER_MISSED = 2;
