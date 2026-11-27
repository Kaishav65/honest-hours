import { describe, expect, it } from "vitest";
import { mergeWake } from "./day-log";

const morning = { wake_at: "2026-11-22T02:23:00Z", sleep_quality: 4, planned_study_min: 240, tomorrow_goal: "Graphs" };
const nap = { wake_at: "2026-11-22T15:45:51Z", sleep_quality: 5, planned_study_min: 120, tomorrow_goal: "Nap goal" };

describe("mergeWake", () => {
  it("uses the input when the day has no row yet", () => {
    expect(mergeWake(null, morning)).toEqual(morning);
  });

  it("keeps the morning wake time, quality and plan when woken again after a nap", () => {
    expect(mergeWake(morning, nap)).toEqual(morning);
  });

  it("fills only the fields that are still empty", () => {
    const partial = { wake_at: morning.wake_at, sleep_quality: null, planned_study_min: null, tomorrow_goal: null };
    expect(mergeWake(partial, nap)).toEqual({ wake_at: morning.wake_at, sleep_quality: 5, planned_study_min: 120, tomorrow_goal: "Nap goal" });
  });

  it("does not turn a kept value into null when the later popup left it blank", () => {
    expect(mergeWake(morning, { wake_at: nap.wake_at, sleep_quality: null, planned_study_min: null, tomorrow_goal: null })).toEqual(morning);
  });
});
