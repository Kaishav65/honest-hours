import { describe, expect, it } from "vitest";
import { zonedTimeToMs } from "@/lib/time";
import { dueWithOffice, isOfficeSlot, officeSettings, officeWindow, parseRoutineItems, routineSegments } from "./office";

const TZ = "Asia/Kolkata";
// 2026-11-23 is a Monday, 2026-11-21 a Saturday.
const at = (date: string, hhmm: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return zonedTimeToMs(TZ, y, m, d, h, min);
};
const MON = "2026-11-23";
const MIN = 60_000;

const settings = {
  schedule: {
    weekday: { office: true, office_start: "10:00", office_end: "18:00", office_checkin_min: 120 },
    weekend: { office: false },
  },
};

describe("office hours", () => {
  it("reads settings per day type", () => {
    expect(officeSettings(settings, "weekday")).toEqual({ startMin: 600, endMin: 1080, checkinMin: 120 });
    expect(officeSettings(settings, "weekend")).toBeNull();
    expect(officeSettings({}, "weekday")).toBeNull();
    expect(officeSettings(null, "weekday")).toBeNull();
  });

  it("builds the window on a weekday and none on a weekend", () => {
    const w = officeWindow(at(MON, "11:00"), TZ, 3, settings)!;
    expect(w.startMs).toBe(at(MON, "10:00"));
    expect(w.endMs).toBe(at(MON, "18:00"));
    expect(officeWindow(at("2026-11-21", "11:00"), TZ, 3, settings)).toBeNull();
  });

  it("uses the long interval inside office and stops at office end", () => {
    const w = officeWindow(at(MON, "11:00"), TZ, 3, settings);
    expect(dueWithOffice(at(MON, "10:00"), 30, w)).toBe(at(MON, "12:00"));
    expect(dueWithOffice(at(MON, "16:30"), 30, w)).toBe(at(MON, "18:00"));
    expect(dueWithOffice(at(MON, "09:00"), 30, w)).toBe(at(MON, "09:30"));
    expect(dueWithOffice(at(MON, "18:00"), 30, w)).toBe(at(MON, "18:30"));
    expect(dueWithOffice(at(MON, "11:00"), 30, null)).toBe(at(MON, "11:30"));
  });

  it("asks 'Office as usual?' only for slots fully inside office", () => {
    const w = officeWindow(at(MON, "11:00"), TZ, 3, settings);
    expect(isOfficeSlot({ startMs: at(MON, "10:00"), endMs: at(MON, "12:00") }, w)).toBe(true);
    expect(isOfficeSlot({ startMs: at(MON, "09:50"), endMs: at(MON, "12:00") }, w)).toBe(false);
    expect(isOfficeSlot({ startMs: at(MON, "16:00"), endMs: at(MON, "18:30") }, w)).toBe(false);
  });
});

describe("routine → entries", () => {
  const items = parseRoutineItems([
    { category_id: "walk", start: "09:20", minutes: 20, answers: {} },
    { category_id: "bus", start: "09:40", minutes: 20, answers: {} },
    { category_id: "office", start: "10:00", minutes: 480, answers: {} },
    { category_id: "bus", start: "18:00", minutes: 20, answers: {} },
    { category_id: "walk", start: "18:20", minutes: 20, answers: {} },
    { bad: true },
  ]);
  const evening = at(MON, "21:00");

  it("ignores malformed items", () => expect(items).toHaveLength(5));

  it("creates all 5 entries on a clean evening", () => {
    const segs = routineSegments(items, MON, TZ, 3, evening, []);
    expect(segs.map((s) => s.categoryId)).toEqual(["walk", "bus", "office", "bus", "walk"]);
    expect(segs[0].startMs).toBe(at(MON, "09:20"));
    expect(segs[4].endMs).toBe(at(MON, "18:40"));
  });

  it("skips time that already has an entry and splits around it", () => {
    const existing = [{ startMs: at(MON, "12:00"), endMs: at(MON, "13:00") }];
    const segs = routineSegments(items, MON, TZ, 3, evening, existing);
    const office = segs.filter((s) => s.categoryId === "office");
    expect(office).toEqual([
      expect.objectContaining({ startMs: at(MON, "10:00"), endMs: at(MON, "12:00") }),
      expect.objectContaining({ startMs: at(MON, "13:00"), endMs: at(MON, "18:00") }),
    ]);
    // nothing overlaps the existing entry or each other
    for (const [i, a] of segs.entries()) {
      expect(a.endMs <= existing[0].startMs || a.startMs >= existing[0].endMs).toBe(true);
      if (i > 0) expect(a.startMs).toBeGreaterThanOrEqual(segs[i - 1].endMs);
    }
  });

  it("drops an item that is fully covered", () => {
    const existing = [{ startMs: at(MON, "09:00"), endMs: at(MON, "09:40") }];
    const segs = routineSegments(items, MON, TZ, 3, evening, existing);
    expect(segs[0].categoryId).toBe("bus");
  });

  it("does not log the future", () => {
    const now = at(MON, "10:30");
    const segs = routineSegments(items, MON, TZ, 3, now, []);
    expect(segs.map((s) => s.categoryId)).toEqual(["walk", "bus", "office"]);
    expect(segs[2].endMs).toBe(now);
  });

  it("never reaches before the day start", () => {
    const segs = routineSegments(
      [{ categoryId: "x", start: "02:00", minutes: 30, answers: {} }],
      MON,
      TZ,
      3,
      at(MON, "22:00"),
      [],
    );
    // 02:00 on a day starting 03:00 is the next calendar date, i.e. in the future here
    expect(segs).toEqual([]);
  });

  it("drops slivers under a minute", () => {
    const now = at(MON, "10:00") + 30_000;
    const segs = routineSegments(items, MON, TZ, 3, now, []);
    expect(segs.every((s) => s.endMs - s.startMs >= MIN)).toBe(true);
  });
});
