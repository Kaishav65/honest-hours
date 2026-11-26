import { describe, expect, it } from "vitest";
import { dayForDate, zonedTimeToMs } from "@/lib/time";
import { computeToday, usualSleepMs, type InsightEntry } from "./today";

const TZ = "Asia/Kolkata";
const day = dayForDate("2026-11-23", TZ, 3);
const at = (hhmm: string, date = "2026-11-23") => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return zonedTimeToMs(TZ, y, m, d, h, min);
};
const e = (
  categoryId: string,
  kind: InsightEntry["kind"],
  s: string,
  en: string,
  extra: Partial<InsightEntry> = {},
): InsightEntry => ({ categoryId, kind, value: "neutral", planned: null, startMs: at(s), endMs: at(en), ...extra });

// A hand-calculated day, "now" = 20:00 (17h = 1020 min since the 03:00 start)
const entries: InsightEntry[] = [
  e("sleep", "sleep", "03:00", "06:00"), // 180
  e("study", "study", "06:00", "07:30", { value: "productive" }), // 90
  e("office", "work", "10:00", "18:00"), // 480
  e("insta", "entertainment", "18:00", "18:40", { value: "waste", planned: false }), // 40 wasted
  e("yt", "entertainment", "18:40", "19:00", { value: "waste", planned: true }), // 20 planned, not wasted
  e("study", "study", "19:00", "19:30", { value: "productive" }), // 30 → study 120
];
const now = at("20:00");

describe("computeToday", () => {
  const s = computeToday({ entries, day, nowMs: now, goalMin: 180, usualSleepMs: at("24:00") });

  it("adds up free time and study", () => {
    expect(s.studyMin).toBe(120);
    expect(s.entertainmentMin).toBe(60);
    expect(s.freeMin).toBe(180);
  });
  it("counts only unplanned waste", () => {
    expect(s.wastedMin).toBe(40);
    expect(s.wastedSessions).toBe(1);
  });
  it("counts back-to-back slots of the same app as one session", () => {
    const w = (c: string, a: string, b: string, planned: boolean | null = null) =>
      e(c, "entertainment", a, b, { value: "waste", planned });
    const r = computeToday({
      entries: [
        w("insta", "12:00", "12:30"),
        w("insta", "12:30", "13:00"),
        w("insta", "13:00", "13:30"), // one 90-min session
        w("tiktok", "13:30", "13:40"), // different app: new session
        w("insta", "14:00", "14:10"), // gap before it: new session
        w("insta", "14:10", "14:20", true), // planned: not wasted
        w("insta", "14:20", "14:30"), // after a planned part: new session
      ],
      day,
      nowMs: now,
      goalMin: 0,
      usualSleepMs: at("24:00"),
    });
    expect(r.wastedMin).toBe(90 + 10 + 10 + 10);
    expect(r.wastedSessions).toBe(4);
  });
  it("tracking % and unknown", () => {
    expect(s.passedMin).toBe(1020);
    expect(s.loggedMin).toBe(180 + 120 + 480 + 60); // 840
    expect(s.unknownMin).toBe(180);
    expect(s.trackedPct).toBeCloseTo((840 / 1020) * 100);
  });
  it("goal remaining and pomodoros", () => {
    expect(s.goalRemainingMin).toBe(60);
    expect(s.pomodorosNeeded).toBe(3); // ceil(60 / 25)
  });
  it("free time left until usual sleep", () => {
    expect(s.freeLeftMin).toBe(240);
    expect(s.pomodorosPossible).toBe(8);
  });
  it("sorts the breakdown, biggest first, merging a category's entries", () => {
    expect(s.byCategory.map((c) => [c.categoryId, c.min])).toEqual([
      ["office", 480],
      ["sleep", 180],
      ["study", 120],
      ["insta", 40],
      ["yt", 20],
    ]);
  });
  it("never goes negative past sleep time or goal", () => {
    const late = computeToday({ entries, day, nowMs: at("23:00"), goalMin: 60, usualSleepMs: at("22:00") });
    expect(late.freeLeftMin).toBe(0);
    expect(late.goalRemainingMin).toBe(0);
  });
  it("ignores the future and handles an empty day", () => {
    const early = computeToday({ entries, day, nowMs: at("07:00"), goalMin: 120, usualSleepMs: at("24:00") });
    expect(early.loggedMin).toBe(240); // sleep 180 + study 60 so far
    const none = computeToday({ entries: [], day, nowMs: at("02:00"), goalMin: 120, usualSleepMs: at("24:00") });
    expect(none.trackedPct).toBe(0);
  });
});

describe("usualSleepMs", () => {
  const dayOffset = (date: string, hhmm: string) => at(hhmm, date);
  it("uses midnight until there are 3 bedtimes", () => {
    expect(usualSleepMs([dayOffset("2026-11-21", "23:00")], day, TZ, 3)).toBe(day.startMs + 21 * 60 * 60_000);
  });
  it("takes the median bedtime, across midnight, ignoring naps", () => {
    const starts = [
      dayOffset("2026-11-20", "23:30"),
      dayOffset("2026-11-22", "00:30"), // belongs to 21 Nov: 21.5 h into that day
      dayOffset("2026-11-22", "23:00"),
      dayOffset("2026-11-21", "15:00"), // nap: ignored
    ];
    // offsets: 20.5h, 21.5h, 20h → median 20.5h = 23:30
    expect(usualSleepMs(starts, day, TZ, 3)).toBe(at("23:30"));
  });
  it("counts bedtimes after the 3 AM day start as the night before", () => {
    const starts = [
      dayOffset("2026-11-20", "03:25"), // 24h 25m into 19 Nov
      dayOffset("2026-11-21", "03:40"),
      dayOffset("2026-11-22", "02:50"),
      dayOffset("2026-11-21", "09:30"), // morning nap: ignored
      dayOffset("2026-11-22", "03:00"), // starts exactly at the day start: a check-in slot after a gap, ignored
    ];
    expect(usualSleepMs(starts, day, TZ, 3)).toBe(at("03:25", "2026-11-24"));
  });
});
