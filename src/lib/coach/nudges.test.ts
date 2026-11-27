import { describe, expect, it } from "vitest";
import { streakAtRiskNudge } from "./nudges";

const base = { streakDays: 6, studyMin: 40, goalMin: 120, freeLeftMin: 200, usualSleepLabel: "12:00 AM", localHour: 19 };

describe("streakAtRiskNudge", () => {
  it("says what is left and whether there is time", () => {
    expect(streakAtRiskNudge(base)).toBe(
      "40m studied, 1h 20m to go to keep your 6-day streak. You usually sleep around 12:00 AM, so you still have time (~3h 20m left).",
    );
    expect(streakAtRiskNudge({ ...base, freeLeftMin: 50 })).toContain("time is tight");
  });
  it("stays quiet with no streak, a met goal, or before the evening", () => {
    expect(streakAtRiskNudge({ ...base, streakDays: 0 })).toBeNull();
    expect(streakAtRiskNudge({ ...base, studyMin: 120 })).toBeNull();
    expect(streakAtRiskNudge({ ...base, localHour: 11 })).toBeNull();
  });
});
