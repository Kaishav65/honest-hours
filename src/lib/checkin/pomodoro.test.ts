import { describe, expect, it } from "vitest";
import { formatTimer, pomodoroSpan } from "./pomodoro";

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 27, 10, 5, 40); // 10:05:40

describe("formatTimer", () => {
  it("shows minutes and seconds, rounding up", () => {
    expect(formatTimer(25 * MIN)).toBe("25:00");
    expect(formatTimer(24 * MIN + 59_001)).toBe("25:00");
    expect(formatTimer(61_000)).toBe("01:01");
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(-5000)).toBe("00:00");
  });
});

describe("pomodoroSpan", () => {
  it("logs whole minutes", () => {
    const s = pomodoroSpan({ startedMs: T0, endedMs: T0 + 25 * MIN, lastEndMs: null })!;
    expect(s.endMs - s.startMs).toBe(25 * MIN);
    expect(s.startMs % MIN).toBe(0);
  });
  it("never starts before the newest entry's end", () => {
    const lastEnd = T0 - 20_000 + 0; // 10:05:20, after the floored start 10:05:00
    const s = pomodoroSpan({ startedMs: T0, endedMs: T0 + 10 * MIN, lastEndMs: lastEnd })!;
    expect(s.startMs).toBe(lastEnd);
  });
  it("is null under a minute", () => {
    expect(pomodoroSpan({ startedMs: T0, endedMs: T0 + 10_000, lastEndMs: null })).toBeNull();
    expect(pomodoroSpan({ startedMs: T0, endedMs: T0 + 10 * MIN, lastEndMs: T0 + 10 * MIN })).toBeNull();
  });
});
