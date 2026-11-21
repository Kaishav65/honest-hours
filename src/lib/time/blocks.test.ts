import { describe, expect, it } from "vitest";
import { buildBlocks, clockToDayMs, type EntryRow } from "./blocks";
import { dayForDate } from "./day";
import { zonedTimeToMs } from "./zone";

const TZ = "Asia/Kolkata";
const day = dayForDate("2026-11-23", TZ, 3);
const at = (hhmm: string, date = "2026-11-23") => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return zonedTimeToMs(TZ, y, m, d, h, min);
};
const e = (id: string, s: number, en: number): EntryRow => ({ id, categoryId: "c", startMs: s, endMs: en, source: "checkin" });

describe("buildBlocks", () => {
  it("shows gaps between entries and from the day start", () => {
    const blocks = buildBlocks([e("a", at("08:00"), at("09:00")), e("b", at("10:00"), at("11:00"))], day, at("23:00"));
    expect(blocks.map((b) => [b.type, b.startMs, b.endMs])).toEqual([
      ["gap", at("03:00"), at("08:00")],
      ["entry", at("08:00"), at("09:00")],
      ["gap", at("09:00"), at("10:00")],
      ["entry", at("10:00"), at("11:00")],
      ["gap", at("11:00"), at("23:00")],
    ]);
  });

  it("marks only the slot running up to now as open", () => {
    const blocks = buildBlocks([e("a", at("08:00"), at("09:00"))], day, at("12:00") + 20_000);
    const gaps = blocks.filter((b) => b.type === "gap");
    expect(gaps.map((g) => g.type === "gap" && g.open)).toEqual([false, true]);
    expect(blocks[blocks.length - 1].endMs).toBe(at("12:00"));
  });

  it("does not call the future Unknown, and a finished past day has no open slot", () => {
    expect(buildBlocks([], day, at("02:00"))).toEqual([]);
    const past = buildBlocks([], day, at("12:00", "2026-11-25"));
    expect(past).toEqual([{ type: "gap", startMs: day.startMs, endMs: day.endMs, open: false }]);
  });

  it("clips entries that cross the day boundary and flags them", () => {
    const sleep = e("s", at("23:00", "2026-11-22"), at("07:00"));
    const [first] = buildBlocks([sleep], day, at("12:00"));
    expect(first).toMatchObject({ type: "entry", startMs: day.startMs, endMs: at("07:00"), crossesDay: true });
  });

  it("drops gaps under a minute and tolerates overlapping input", () => {
    const blocks = buildBlocks([e("a", at("03:00"), at("04:00")), e("b", at("03:30"), at("04:00") + 30_000)], day, at("04:00") + 30_000);
    expect(blocks.every((b) => b.type === "entry")).toBe(true);
  });
});

describe("clockToDayMs", () => {
  it("maps late-night clock times to the next calendar date", () => {
    expect(clockToDayMs("10:00", day, TZ, 3)).toBe(at("10:00"));
    expect(clockToDayMs("01:30", day, TZ, 3)).toBe(at("01:30", "2026-11-24"));
    expect(clockToDayMs("nope", day, TZ, 3)).toBeNull();
  });
});
