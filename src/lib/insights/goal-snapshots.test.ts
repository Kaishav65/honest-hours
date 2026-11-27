import { describe, expect, it } from "vitest";
import { zonedTimeToMs } from "@/lib/time";
import { missingSnapshots } from "./goal-snapshots";

const TZ = "Asia/Kolkata";
const at = (m: number, d: number, h = 12) => zonedTimeToMs(TZ, 2026, m, d, h, 0);

describe("missingSnapshots", () => {
  it("gives every past day without a row its old goal by day type, and leaves today alone", () => {
    // Wed 25 Nov first entry, now Mon 30 Nov; 26 Nov already has a row
    const rows = missingSnapshots({
      firstEntryMs: at(11, 25),
      nowMs: at(11, 30),
      existingDays: ["2026-11-26"],
      timeZone: TZ,
      dayStartHour: 3,
      weekdayGoalMin: 120,
      weekendGoalMin: 240,
    });
    expect(rows).toEqual([
      { day: "2026-11-25", study_goal_min: 120 },
      { day: "2026-11-27", study_goal_min: 120 },
      { day: "2026-11-28", study_goal_min: 240 }, // Saturday
      { day: "2026-11-29", study_goal_min: 240 }, // Sunday
    ]);
  });
  it("nothing to do when there are no entries yet or every day has a row", () => {
    const base = { nowMs: at(11, 30), timeZone: TZ, dayStartHour: 3, weekdayGoalMin: 120, weekendGoalMin: 240 };
    expect(missingSnapshots({ ...base, firstEntryMs: at(11, 30), existingDays: [] })).toEqual([]);
    expect(missingSnapshots({ ...base, firstEntryMs: at(11, 29), existingDays: ["2026-11-29"] })).toEqual([]);
  });
});
