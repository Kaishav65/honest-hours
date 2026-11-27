import { describe, expect, it } from "vitest";
import { heatColumns, heatLevel } from "./heatmap";
import type { StreakCell } from "./streak";
import { dayForDate } from "@/lib/time";

const cell = (date: string, studyMin: number, state: StreakCell["state"], goalMin = 120): StreakCell => ({
  day: dayForDate(date, "Asia/Kolkata", 3),
  studyMin,
  goalMin,
  state,
});

describe("heatLevel", () => {
  it("freeze, missed, partial, met and well past the goal", () => {
    expect(heatLevel({ state: "frozen", studyMin: 10, goalMin: 120 })).toBe("f");
    expect(heatLevel({ state: "missed", studyMin: 0, goalMin: 120 })).toBe("0");
    expect(heatLevel({ state: "missed", studyMin: 20, goalMin: 120 })).toBe("1");
    expect(heatLevel({ state: "missed", studyMin: 70, goalMin: 120 })).toBe("2");
    expect(heatLevel({ state: "met", studyMin: 120, goalMin: 120 })).toBe("3");
    expect(heatLevel({ state: "met", studyMin: 190, goalMin: 120 })).toBe("4");
  });
});

describe("heatColumns", () => {
  // Thursday 26 Nov 2026
  const cells = [cell("2026-11-23", 130, "met"), cell("2026-11-24", 10, "frozen"), cell("2026-11-25", 0, "missed"), cell("2026-11-26", 40, "today")];
  const cols = heatColumns(cells, "2026-11-26", 3);
  it("is 3 week columns of 7, Monday first, ending today (later days are empty)", () => {
    expect(cols).toHaveLength(3);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    const last = cols[2];
    expect(last.map((d) => d?.date)).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", undefined, undefined, undefined]);
    expect(last.slice(0, 4).map((d) => d?.level)).toEqual(["3", "f", "0", "1"]);
  });
  it("days before the first tracked day are no data", () => {
    expect(cols[0][0]?.level).toBe("x");
    expect(cols[0][0]?.title).toContain("no data");
  });
});
