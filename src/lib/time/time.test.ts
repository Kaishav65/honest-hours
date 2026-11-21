import { describe, expect, it } from "vitest";
import { dayForDate, dayOf, dayTypeOf, findGaps, splitSlot, zonedTimeToMs } from ".";

const IST = "Asia/Kolkata";
const H = 3_600_000;
const at = (date: string, h: number, m = 0, tz = IST) => {
  const [y, mo, d] = date.split("-").map(Number);
  return zonedTimeToMs(tz, y, mo, d, h, m);
};

describe("day boundary (3 AM, Asia/Kolkata)", () => {
  it("12:30 AM belongs to the evening before", () => {
    expect(dayOf(at("2026-11-22", 0, 30), IST, 3).date).toBe("2026-11-21");
  });
  it("2:59 AM is still the old day, 3:00 AM starts the new one", () => {
    expect(dayOf(at("2026-11-22", 2, 59), IST, 3).date).toBe("2026-11-21");
    expect(dayOf(at("2026-11-22", 3, 0), IST, 3).date).toBe("2026-11-22");
  });
  it("a day is 24 h from 03:00 to 03:00", () => {
    const d = dayForDate("2026-11-21", IST, 3);
    expect(d.startMs).toBe(at("2026-11-21", 3));
    expect(d.endMs).toBe(at("2026-11-22", 3));
    expect(d.endMs - d.startMs).toBe(24 * H);
  });
  it("respects another day_start_hour", () => {
    expect(dayOf(at("2026-11-22", 4, 30), IST, 5).date).toBe("2026-11-21");
    expect(dayOf(at("2026-11-22", 5, 0), IST, 5).date).toBe("2026-11-22");
  });
  it("uses the user's time zone, not the machine's", () => {
    // 2026-11-21 22:00 UTC = 03:30 IST on the 22nd, but 17:00 on the 21st in New York.
    const ms = Date.UTC(2026, 10, 21, 22, 0);
    expect(dayOf(ms, IST, 3).date).toBe("2026-11-22");
    expect(dayOf(ms, "America/New_York", 3).date).toBe("2026-11-21");
  });
  it("handles 23 h / 25 h days when clocks change", () => {
    const spring = dayForDate("2026-03-08", "America/New_York", 0);
    expect(spring.endMs - spring.startMs).toBe(23 * H);
    const fall = dayForDate("2026-11-01", "America/New_York", 0);
    expect(fall.endMs - fall.startMs).toBe(25 * H);
  });
});

describe("day type", () => {
  it("Mon-Fri are weekdays, Sat-Sun weekends", () => {
    expect(dayTypeOf("2026-11-20")).toBe("weekday"); // Friday
    expect(dayTypeOf("2026-11-21")).toBe("weekend"); // Saturday
    expect(dayTypeOf("2026-11-22")).toBe("weekend"); // Sunday
    expect(dayTypeOf("2026-11-23")).toBe("weekday"); // Monday
  });
  it("Saturday 1 AM is still Friday (weekday); Sunday 1 AM is still Saturday (weekend)", () => {
    expect(dayOf(at("2026-11-21", 1), IST, 3).dayType).toBe("weekday");
    expect(dayOf(at("2026-11-22", 1), IST, 3).dayType).toBe("weekend");
  });
  it("Monday 2 AM still counts as Sunday (weekend); Monday 3 AM is a weekday", () => {
    expect(dayOf(at("2026-11-23", 2), IST, 3).dayType).toBe("weekend");
    expect(dayOf(at("2026-11-23", 3), IST, 3).dayType).toBe("weekday");
  });
});

describe("findGaps", () => {
  const s = (a: number, b: number) => ({ startMs: a * H, endMs: b * H });
  it("whole range is one gap when there are no entries", () => {
    expect(findGaps([], 0, 10 * H)).toEqual([s(0, 10)]);
  });
  it("finds gaps before, between and after entries", () => {
    expect(findGaps([s(2, 4), s(5, 7)], 0, 10 * H)).toEqual([s(0, 2), s(4, 5), s(7, 10)]);
  });
  it("touching entries leave no gap", () => {
    expect(findGaps([s(0, 5), s(5, 10)], 0, 10 * H)).toEqual([]);
  });
  it("copes with unsorted, overlapping and out-of-range entries", () => {
    expect(findGaps([s(6, 8), s(-3, 2), s(1, 3), s(9, 20)], 0, 10 * H)).toEqual([s(3, 6), s(8, 9)]);
  });
});

describe("splitSlot", () => {
  const slot = { startMs: 0, endMs: 30 * 60_000 };
  it("splits 30 min into 20 + 10", () => {
    expect(splitSlot(slot, [20, 10])).toEqual([
      { startMs: 0, endMs: 20 * 60_000 },
      { startMs: 20 * 60_000, endMs: 30 * 60_000 },
    ]);
  });
  it("lets one part take the rest", () => {
    expect(splitSlot(slot, [null, 10])[0]).toEqual({ startMs: 0, endMs: 20 * 60_000 });
  });
  it("rejects parts that do not add up or are empty", () => {
    expect(() => splitSlot(slot, [20, 5])).toThrow();
    expect(() => splitSlot(slot, [20, 20])).toThrow();
    expect(() => splitSlot(slot, [30, null])).toThrow();
    expect(() => splitSlot(slot, [0, 30])).toThrow();
    expect(() => splitSlot(slot, [])).toThrow();
  });
});
