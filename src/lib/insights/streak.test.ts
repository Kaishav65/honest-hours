import { describe, expect, it } from "vitest";
import { dayForDate, zonedTimeToMs } from "@/lib/time";
import { computeStreak, daysBetween, minutesIn, onTrack, pastOutcomes, restOfDaySamples, streakSummary, type StudyDay } from "./streak";

const TZ = "Asia/Kolkata";
const at = (date: string, hhmm: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return zonedTimeToMs(TZ, y, m, d, h, min);
};
const days = (...study: number[]) => study.map((studyMin) => ({ studyMin, goalMin: 120 }));

describe("computeStreak", () => {
  it("counts met days ending yesterday; today joins once met", () => {
    expect(computeStreak(days(0, 120, 150, 30))).toEqual({ streak: 2, freezes: 0, todayMet: false });
    expect(computeStreak(days(0, 120, 150, 130))).toEqual({ streak: 3, freezes: 0, todayMet: true });
  });
  it("breaks on a missed day without a freeze", () => {
    expect(computeStreak(days(120, 120, 10, 120, 0)).streak).toBe(1);
  });
  it("earns a freeze every 5 met days (max 2) and uses it on a missed day", () => {
    // 5 met → 1 freeze; missed day uses it and still counts; streak 6 + today
    const r = computeStreak(days(120, 120, 120, 120, 120, 0, 120));
    expect(r).toEqual({ streak: 7, freezes: 0, todayMet: true });
    expect(computeStreak(days(...Array(16).fill(120), 0)).freezes).toBe(2); // 15 met days, capped at 2
  });
  it("uses each day's own goal", () => {
    expect(computeStreak([{ studyMin: 200, goalMin: 240 }, { studyMin: 0, goalMin: 120 }]).streak).toBe(0);
  });
  it("handles no history", () => {
    expect(computeStreak([])).toEqual({ streak: 0, freezes: 0, todayMet: false });
  });
});

describe("daysBetween / minutesIn", () => {
  it("lists tracked days from the first entry to today", () => {
    const today = dayForDate("2026-11-26", TZ, 3);
    expect(daysBetween(at("2026-11-24", "02:00"), today, TZ, 3).map((d) => d.date)).toEqual([
      "2026-11-23", // 2 AM belongs to the day before
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
    ]);
  });
  it("clips spans to a window", () => {
    const spans = [{ startMs: at("2026-11-24", "02:00"), endMs: at("2026-11-24", "04:00") }];
    const d = dayForDate("2026-11-24", TZ, 3);
    expect(minutesIn(spans, d.startMs, d.endMs)).toBe(60);
  });
});

describe("onTrack", () => {
  it("is learning until 7 same-type days exist", () => {
    expect(onTrack(30, 120, [60, 60])).toEqual({ state: "learning", daysToGo: 5 });
  });
  it("projects study so far + average rest of day", () => {
    expect(onTrack(60, 120, Array(7).fill(60))).toEqual({ state: "on-track", pct: 100 });
    expect(onTrack(60, 120, Array(7).fill(40))).toEqual({ state: "close", pct: 83 });
    expect(onTrack(0, 120, Array(7).fill(60))).toEqual({ state: "at-risk", pct: 50 });
  });
  it("is null once the goal is reached", () => {
    expect(onTrack(120, 120, [])).toBeNull();
  });
});

describe("restOfDaySamples", () => {
  it("takes study after the same time on past days of the same type, last 28 days", () => {
    const today = dayForDate("2026-11-26", TZ, 3); // Thursday
    const mk = (date: string): StudyDay => ({ day: dayForDate(date, TZ, 3), studyMin: 0, goalMin: 120 });
    const history = [mk("2026-10-20"), mk("2026-11-24"), mk("2026-11-25"), mk("2026-11-22"), mk("2026-11-26")];
    const study = [
      { startMs: at("2026-11-24", "18:00"), endMs: at("2026-11-24", "21:00") }, // 1h before 20:00, 1h after
      { startMs: at("2026-11-25", "20:00"), endMs: at("2026-11-25", "21:30") }, // 90 after
      { startMs: at("2026-11-22", "20:00"), endMs: at("2026-11-22", "21:00") }, // Sunday: other day type
    ];
    // 20 Oct is older than 28 days, 22 Nov is a weekend day, 26 Nov is today
    expect(restOfDaySamples(history, today, at("2026-11-26", "20:00"), study)).toEqual([60, 90]);
  });
});

describe("pastOutcomes", () => {
  it("reports met / frozen / broken days with the running streak and earned freezes", () => {
    const o = pastOutcomes(days(120, 120, 120, 120, 120, 0, 0));
    expect(o[4]).toMatchObject({ met: true, streak: 5, freezes: 1, earnedFreeze: true });
    expect(o[5]).toMatchObject({ met: false, frozen: true, streak: 6, freezes: 0 });
    expect(o[6]).toMatchObject({ met: false, frozen: false, streak: 0 });
  });
});

describe("streakSummary", () => {
  const d = (date: string): StudyDay["day"] => dayForDate(date, TZ, 3);
  const mk = (rows: [string, number][]): StudyDay[] => rows.map(([date, studyMin]) => ({ day: d(date), studyMin, goalMin: 120 }));
  it("cells, current/best streak, freezes and their history match computeStreak", () => {
    const history = mk([
      ["2026-11-01", 120], ["2026-11-02", 120], ["2026-11-03", 120], ["2026-11-04", 120], ["2026-11-05", 120], // freeze earned
      ["2026-11-06", 10], // freeze used
      ["2026-11-07", 10], // broken
      ["2026-11-08", 130], // met, today
    ]);
    const r = streakSummary(history);
    expect(r.cells.map((c) => c.state)).toEqual(["met", "met", "met", "met", "met", "frozen", "missed", "today"]);
    expect(r.current).toBe(computeStreak(history).streak);
    expect(r.current).toBe(1);
    expect(r.best).toBe(6);
    expect(r.freezes).toBe(0);
    expect(r.metDays).toBe(6);
    expect(r.events).toEqual([{ date: "2026-11-05", type: "earned" }, { date: "2026-11-06", type: "used" }]);
  });
  it("today's goal met counts and can earn the freeze", () => {
    const r = streakSummary(mk([["2026-11-01", 120], ["2026-11-02", 120], ["2026-11-03", 120], ["2026-11-04", 120], ["2026-11-05", 125]]));
    expect(r.current).toBe(5);
    expect(r.freezes).toBe(1);
    expect(r.events).toEqual([{ date: "2026-11-05", type: "earned" }]);
  });
});
