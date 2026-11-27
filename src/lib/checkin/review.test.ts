import { describe, expect, it } from "vitest";
import { cleanGoal, planGapMin, reviewDue } from "./review";

const MIN = 60_000;
const base = { usualSleepMs: 1_000 * MIN, dayEndMs: 2_000 * MIN, done: false, offered: false };

describe("reviewDue", () => {
  it("opens 30 minutes before usual sleep, not earlier", () => {
    expect(reviewDue({ ...base, nowMs: 969 * MIN })).toBe(false);
    expect(reviewDue({ ...base, nowMs: 970 * MIN })).toBe(true);
  });
  it("never twice: not when done or already offered", () => {
    expect(reviewDue({ ...base, nowMs: 990 * MIN, done: true })).toBe(false);
    expect(reviewDue({ ...base, nowMs: 990 * MIN, offered: true })).toBe(false);
  });
  it("not after the day ended", () => {
    expect(reviewDue({ ...base, nowMs: 2_000 * MIN })).toBe(false);
  });
});

describe("planGapMin / cleanGoal", () => {
  it("plan vs actual", () => {
    expect(planGapMin(120, 90)).toBe(30);
    expect(planGapMin(120, 150)).toBe(-30);
    expect(planGapMin(null, 90)).toBeNull();
  });
  it("trims, collapses spaces, caps, and empties to null", () => {
    expect(cleanGoal("  finish   graphs  ")).toBe("finish graphs");
    expect(cleanGoal("   ")).toBeNull();
    expect(cleanGoal("x".repeat(300))).toHaveLength(140);
  });
});
