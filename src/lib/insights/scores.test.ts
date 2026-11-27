import { describe, expect, it } from "vitest";
import { disciplineScore, focusScore, type ScoreEntry } from "./scores";

const MIN = 60_000;
const DAY_START = 0;
const DAY_END = 24 * 60 * MIN;
let cursor = 0;
const e = (kind: ScoreEntry["kind"], minutes: number, over: Partial<ScoreEntry> = {}): ScoreEntry => {
  const startMs = cursor;
  cursor += minutes * MIN;
  return { kind, startMs, endMs: cursor, planned: null, focus: null, phoneChecks: null, ...over };
};

// A hand-calculated day: goal 2 h, plan 2 h 30 m.
//   Study A 60 min focus 4, 1 phone check | B 30 min focus 2, 2 phone checks | C 30 min, never rated
//   Entertainment: Instagram 40 min planned, YouTube 20 min unplanned
function day() {
  cursor = 0;
  return [
    e("study", 60, { focus: 4, phoneChecks: 1 }),
    e("study", 30, { focus: 2, phoneChecks: 2 }),
    e("study", 30),
    e("entertainment", 40, { planned: true }),
    e("entertainment", 20, { planned: false }),
  ];
}

describe("focusScore", () => {
  it("matches the hand calculation: base 58.3 − penalty 10 = 48", () => {
    // minute-weighted focus = (60×4 + 30×2) ÷ 90 = 3.33 → base 58.33; 3 phone checks in 1.5 h = 2/h → penalty 10
    expect(focusScore(day(), DAY_START, DAY_END)).toBe(48);
  });
  it("1 → 0, 3 → 50, 5 → 100 with no phone checks", () => {
    for (const [f, score] of [[1, 0], [3, 50], [5, 100]] as const) {
      cursor = 0;
      expect(focusScore([e("study", 25, { focus: f, phoneChecks: 0 })], DAY_START, DAY_END)).toBe(score);
    }
  });
  it("the phone penalty is capped at 30 and the score never goes below 0", () => {
    cursor = 0;
    expect(focusScore([e("study", 60, { focus: 5, phoneChecks: 40 })], DAY_START, DAY_END)).toBe(70);
    cursor = 0;
    expect(focusScore([e("study", 60, { focus: 1, phoneChecks: 40 })], DAY_START, DAY_END)).toBe(0);
  });
  it("null when no study entry was rated; unrated and non-study entries are ignored", () => {
    cursor = 0;
    expect(focusScore([e("study", 60), e("entertainment", 30, { focus: 5 })], DAY_START, DAY_END)).toBeNull();
  });
  it("only counts the part of an entry inside the period", () => {
    cursor = 0;
    const a = e("study", 60, { focus: 5, phoneChecks: 0 });
    expect(focusScore([a], 30 * MIN, DAY_END)).toBe(100);
    expect(focusScore([a], 70 * MIN, DAY_END)).toBeNull();
  });
});

describe("disciplineScore", () => {
  const base = { fromMs: DAY_START, toMs: DAY_END, goalMin: 120 };
  it("matches the hand calculation: (0.5×0.8 + 0.3×0.667 + 0.2×1) × 100 = 80", () => {
    // study 120 ÷ plan 150 = 0.8; planned fun 40 ÷ 60 = 0.667; goal met = 1
    expect(disciplineScore({ ...base, entries: day(), plannedStudyMin: 150, goalHit: 1 })).toBe(80);
  });
  it("no plan uses the daily goal as the plan", () => {
    expect(disciplineScore({ ...base, entries: day(), plannedStudyMin: null, goalHit: 1 })).toBe(90); // 0.5 + 0.2 + 0.2
    expect(disciplineScore({ ...base, entries: day(), plannedStudyMin: 0, goalHit: 1 })).toBe(90);
  });
  it("beating the plan does not score above 100%; no entertainment counts as fully planned", () => {
    cursor = 0;
    expect(disciplineScore({ ...base, entries: [e("study", 300)], plannedStudyMin: 120, goalHit: 1 })).toBe(100);
  });
  it("goal hit can be a weekly ratio (4 of 7 days)", () => {
    cursor = 0;
    const r = disciplineScore({ ...base, entries: [e("study", 120)], plannedStudyMin: null, goalHit: 4 / 7 });
    expect(r).toBe(Math.round((0.5 + 0.3 + 0.2 * (4 / 7)) * 100)); // 91
  });
  it("null for a day with nothing logged", () => {
    expect(disciplineScore({ ...base, entries: [], plannedStudyMin: null, goalHit: 0 })).toBeNull();
  });
});
