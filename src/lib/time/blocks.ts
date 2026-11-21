import { parseClock } from "@/lib/checkin/status";
import type { TrackedDay } from "./day";
import { zonedTimeToMs } from "./zone";

const MIN = 60_000;

export type EntryRow = { id: string; categoryId: string; startMs: number; endMs: number; source: string };

export type Block =
  | {
      type: "entry";
      entry: EntryRow;
      /** Entry clipped to the day (a sleep that began yesterday shows only today's part). */
      startMs: number;
      endMs: number;
      /** Starts before or ends after this day: its times can't be edited from this day's view. */
      crossesDay: boolean;
    }
  | {
      type: "gap";
      startMs: number;
      endMs: number;
      /** The slot still being tracked right now: the next check-in covers it, so it can't be filled here. */
      open: boolean;
    };

/**
 * The day as an ordered list of entries and Unknown gaps. Time that hasn't happened yet is not Unknown.
 * `nowMs` is floored to the minute, like check-in slots.
 */
export function buildBlocks(entries: EntryRow[], day: TrackedDay, nowMs: number): Block[] {
  const now = Math.floor(nowMs / MIN) * MIN;
  const limit = Math.min(day.endMs, now);
  const sorted = entries
    .filter((e) => e.endMs > day.startMs && e.startMs < day.endMs)
    .sort((a, b) => a.startMs - b.startMs);

  const blocks: Block[] = [];
  let cursor = day.startMs;
  const gap = (to: number) => {
    if (to - cursor >= MIN) blocks.push({ type: "gap", startMs: cursor, endMs: to, open: to === now && now < day.endMs });
  };
  for (const e of sorted) {
    gap(Math.min(e.startMs, limit));
    blocks.push({
      type: "entry",
      entry: e,
      startMs: Math.max(e.startMs, day.startMs),
      endMs: Math.min(e.endMs, day.endMs),
      crossesDay: e.startMs < day.startMs || e.endMs > day.endMs,
    });
    cursor = Math.max(cursor, e.endMs);
  }
  if (cursor < limit) gap(limit);
  return blocks;
}

/** "HH:MM" on a tracked day → instant. Clock times before the day start (e.g. 01:00) are the next calendar date. */
export function clockToDayMs(hhmm: string, day: TrackedDay, timeZone: string, dayStartHour: number) {
  const c = parseClock(hhmm);
  if (!c) return null;
  const [y, m, d] = day.date.split("-").map(Number);
  return zonedTimeToMs(timeZone, y, m, d + (c.h < dayStartHour ? 1 : 0), c.h, c.m);
}
