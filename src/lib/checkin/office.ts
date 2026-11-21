import { dayForDate, dayOf, zonedTimeToMs, type DayType } from "@/lib/time";
import { parseClock } from "./status";

export type OfficeSettings = { startMin: number; endMin: number; checkinMin: number };

export type RoutineItem = { categoryId: string; start: string; minutes: number; answers: Record<string, unknown> };
export type Span = { startMs: number; endMs: number };
export type RoutineSegment = Span & { categoryId: string; answers: Record<string, unknown> };

const MIN = 60_000;
const clockMin = (hhmm: unknown) => {
  const c = typeof hhmm === "string" ? parseClock(hhmm) : null;
  return c ? c.h * 60 + c.m : null;
};

/** Office hours for a day type from profiles.settings.schedule, or null when there is no office that day. */
export function officeSettings(settings: unknown, dayType: DayType): OfficeSettings | null {
  const s = (settings as { schedule?: Record<string, Record<string, unknown>> } | null)?.schedule?.[dayType];
  if (!s || s.office !== true) return null;
  const startMin = clockMin(s.office_start);
  const endMin = clockMin(s.office_end);
  if (startMin === null || endMin === null || endMin <= startMin) return null;
  const every = Number(s.office_checkin_min);
  return { startMin, endMin, checkinMin: Number.isFinite(every) && every >= 15 ? every : 120 };
}

/** Office hours as instants on the tracked day `ms` belongs to (null on days without office). */
export function officeWindow(
  ms: number,
  timeZone: string,
  dayStartHour: number,
  settings: unknown,
): (Span & { checkinMin: number }) | null {
  const day = dayOf(ms, timeZone, dayStartHour);
  const o = officeSettings(settings, day.dayType);
  if (!o) return null;
  const [y, m, d] = day.date.split("-").map(Number);
  const at = (min: number) => zonedTimeToMs(timeZone, y, m, d, Math.floor(min / 60), min % 60);
  return { startMs: at(o.startMin), endMs: at(o.endMin), checkinMin: o.checkinMin };
}

/** A slot lying entirely inside office hours gets the short "Office as usual?" question. */
export const isOfficeSlot = (slot: Span, office: Span | null) =>
  office !== null && slot.startMs >= office.startMs && slot.endMs <= office.endMs;

/**
 * When the next popup is due. Inside office hours the interval is longer (e.g. 2 h) and never runs
 * past the end of office, so the office slot closes on time.
 */
export function dueWithOffice(baseMs: number, intervalMin: number, office: (Span & { checkinMin: number }) | null) {
  if (office && baseMs >= office.startMs && baseMs < office.endMs) {
    return Math.min(baseMs + office.checkinMin * MIN, office.endMs);
  }
  return baseMs + intervalMin * MIN;
}

/** Parses routines.items, dropping malformed rows. */
export function parseRoutineItems(raw: unknown): RoutineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const i = r as Partial<RoutineItem> & { category_id?: string };
    if (typeof i?.category_id !== "string" || clockMin(i.start) === null) return [];
    if (typeof i.minutes !== "number" || i.minutes <= 0) return [];
    const answers = i.answers && typeof i.answers === "object" ? (i.answers as Record<string, unknown>) : {};
    return [{ categoryId: i.category_id, start: i.start as string, minutes: i.minutes, answers }];
  });
}

/**
 * Turns a routine into entries for one tracked day. Each item is clipped to "now" (the future is not
 * logged) and cut around time that already has entries, so nothing overlaps.
 */
export function routineSegments(
  items: RoutineItem[],
  dayDate: string,
  timeZone: string,
  dayStartHour: number,
  nowMs: number,
  existing: Span[],
): RoutineSegment[] {
  const day = dayForDate(dayDate, timeZone, dayStartHour);
  const [y, m, d] = dayDate.split("-").map(Number);
  const busy = [...existing].sort((a, b) => a.startMs - b.startMs);
  const out: RoutineSegment[] = [];

  for (const item of items) {
    const min = clockMin(item.start)!;
    // Clock times before the day start (e.g. 01:00) belong to the next calendar date.
    const dayShift = Math.floor(min / 60) < dayStartHour ? 1 : 0;
    const startMs = zonedTimeToMs(timeZone, y, m, d + dayShift, Math.floor(min / 60), min % 60);
    const endMs = Math.min(startMs + item.minutes * MIN, nowMs, day.endMs);

    let cursor = Math.max(startMs, day.startMs);
    const blockers = [...busy, ...out].sort((a, b) => a.startMs - b.startMs);
    for (const b of blockers) {
      if (b.endMs <= cursor || b.startMs >= endMs) continue;
      if (b.startMs > cursor) out.push({ startMs: cursor, endMs: b.startMs, categoryId: item.categoryId, answers: item.answers });
      cursor = Math.max(cursor, b.endMs);
    }
    if (endMs > cursor) out.push({ startMs: cursor, endMs, categoryId: item.categoryId, answers: item.answers });
  }
  return out.filter((s) => s.endMs - s.startMs >= MIN).sort((a, b) => a.startMs - b.startMs);
}
