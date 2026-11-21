import { localParts, zonedTimeToMs } from "./zone";

export type DayType = "weekday" | "weekend";
export type TrackedDay = {
  /** Calendar date the day is named after, "YYYY-MM-DD" (the date it starts on). */
  date: string;
  dayType: DayType;
  /** Day runs from startMs (inclusive) to endMs (exclusive). */
  startMs: number;
  endMs: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Saturday and Sunday are weekend days (a day belongs to the date it starts on). */
export function dayTypeOf(date: string): DayType {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6 ? "weekend" : "weekday";
}

/** The tracked day with a given date label, e.g. "2026-11-21" with dayStartHour 3 = 21 Nov 03:00 → 22 Nov 03:00. */
export function dayForDate(date: string, timeZone: string, dayStartHour: number): TrackedDay {
  const [y, m, d] = date.split("-").map(Number);
  const [ny, nm, nd] = addDays(date, 1).split("-").map(Number);
  return {
    date,
    dayType: dayTypeOf(date),
    startMs: zonedTimeToMs(timeZone, y, m, d, dayStartHour),
    endMs: zonedTimeToMs(timeZone, ny, nm, nd, dayStartHour),
  };
}

/** Which tracked day an instant belongs to. 12–3 AM counts towards the evening before. */
export function dayOf(ms: number, timeZone: string, dayStartHour: number): TrackedDay {
  const p = localParts(ms, timeZone);
  const local = fmt(p.year, p.month, p.day);
  return dayForDate(p.hour < dayStartHour ? addDays(local, -1) : local, timeZone, dayStartHour);
}
