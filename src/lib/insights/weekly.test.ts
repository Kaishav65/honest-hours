import { describe, expect, it } from "vitest";
import { dayOf, zonedTimeToMs } from "@/lib/time";
import { computeWeek, gradeOf, weekOf, type WEntry, type WeekInput } from "./weekly";

const TZ = "Asia/Kolkata";
const at = (date: string, hhmm: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return zonedTimeToMs(TZ, y, m, d, h, mi);
};
const E = (
  kind: WEntry["kind"],
  date: string,
  hhmm: string,
  minutes: number,
  extra: Partial<WEntry> = {},
): WEntry => ({
  categoryId: kind,
  kind,
  value: kind === "entertainment" ? "waste" : "productive",
  startMs: at(date, hhmm),
  endMs: at(date, hhmm) + minutes * 60_000,
  planned: null,
  trigger: null,
  focus: null,
  phoneChecks: null,
  ...extra,
});

// Week Mon 23 – Sun 29 Nov 2026, "now" = Thu 26 Nov 20:00. Goals: 2 h weekdays, 4 h weekends.
const NOW = at("2026-11-26", "20:00");
const today = dayOf(NOW, TZ, 3);
const days = weekOf(today, 0, TZ, 3);
const entries: WEntry[] = [
  // last week (history for the averages): 90 min each weekday, Wed 100; Sat 200, Sun 100
  E("study", "2026-11-16", "06:00", 90, { focus: 5, phoneChecks: 0 }),
  E("study", "2026-11-17", "19:00", 90),
  E("study", "2026-11-18", "19:00", 100),
  E("study", "2026-11-19", "19:00", 90),
  E("study", "2026-11-20", "19:00", 90),
  E("study", "2026-11-21", "10:00", 200),
  E("study", "2026-11-22", "10:00", 100),
  // this week
  E("study", "2026-11-23", "06:00", 130, { focus: 5, phoneChecks: 0 }),
  E("commute", "2026-11-23", "09:00", 60),
  E("entertainment", "2026-11-23", "21:00", 30, { trigger: "tired" }),
  E("study", "2026-11-24", "19:00", 60, { focus: 3, phoneChecks: 2 }),
  E("entertainment", "2026-11-24", "21:00", 60, { trigger: "tired" }),
  E("study", "2026-11-25", "20:00", 130),
  E("study", "2026-11-26", "06:00", 120, { focus: 4, phoneChecks: 0 }),
];
const goalByDate = Object.fromEntries(days.map((d) => [d.date, d.dayType === "weekend" ? 240 : 120]));
const input: WeekInput = {
  days,
  nowMs: NOW,
  timeZone: TZ,
  dayStartHour: 3,
  entries,
  goalByDate,
  plannedByDate: { "2026-11-23": 150 },
  pomodoros: [
    { startedMs: at("2026-11-23", "06:00"), completed: true },
    { startedMs: at("2026-11-24", "19:00"), completed: false },
    { startedMs: at("2026-11-26", "06:00"), completed: true },
  ],
  sleepStarts: [],
};
const w = computeWeek(input);
const metric = (k: string) => w.metrics.find((m) => m.key === k)!;

describe("weekOf / gradeOf", () => {
  it("Monday to Sunday containing today, and last week", () => {
    expect(days.map((d) => d.date)).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
    expect(weekOf(today, -1, TZ, 3)[0].date).toBe("2026-11-16");
  });
  it("grade boundaries", () => {
    expect([100, 85, 84.9, 70, 55, 40, 39.9, 0].map(gradeOf)).toEqual(["A", "A", "B", "B", "C", "D", "F", "F"]);
  });
});

describe("computeWeek: this week", () => {
  it("study so far, goal and unlocks after 4 logged days", () => {
    expect(w.loggedDays).toBe(4);
    expect(w.unlocked).toBe(true);
    expect(w.studySoFar).toBe(440); // 130 + 60 + 130 + 120
    expect(w.weeklyGoal).toBe(1080); // 5×120 + 2×240
  });
  it("projection = study so far + average study of each remaining day's type (28 days)", () => {
    // weekday average over logged days before today: (90 + 90 + 100 + 90 + 90 + 130 + 60 + 130 + 130 ... see below
    // = last week Mon–Fri 460 + this week Mon 130, Tue 60, Wed 130 = 780 ÷ 8 = 97.5; weekend average = (200 + 100) ÷ 2 = 150
    expect(w.projection).toBeCloseTo(440 + 97.5 + 150 + 150, 5);
    expect(w.remainingDays).toBe(3);
    expect(w.dailyGap).toBeCloseTo((1080 - 837.5) / 3, 5);
    expect(w.stats[4].expectedMin).toBeCloseTo(97.5, 5); // Friday
    expect(w.stats[5].expectedMin).toBe(150); // Saturday
  });
  it("wasted / recoverable time, triggers, busiest 2-hour window, commute", () => {
    expect(w.wastedMin).toBe(90);
    expect(w.recoverableHalfMin).toBe(45);
    expect(w.recoverablePomodoros).toBe(2);
    expect(w.triggers).toEqual([{ trigger: "tired", min: 90, share: 100 }]);
    expect(w.topWindow).toEqual({ startHour: 20, min: 90 }); // 21:00–22:00 falls in the 20–22 window
    expect(w.commuteMin).toBe(60);
  });
  it("best focus hour needs 3+ rated sessions in that hour; strong / weak weekday need 2+ days", () => {
    expect(w.bestFocusHour?.hour).toBe(6);
    expect(w.bestFocusHour?.sessions).toBe(3);
    expect(w.bestFocusHour?.avg).toBeCloseTo((5 + 5 + 4) / 3, 5);
    // Mon (90+130)/2 = 110, Tue (90+60)/2 = 75, Wed (100+130)/2 = 115
    expect(w.strongDay?.dow).toBe(2);
    expect(w.weakDay?.dow).toBe(1);
  });
  it("weekly focus and discipline scores", () => {
    // focus: (130×5 + 60×3 + 120×4) ÷ 310 = 4.226 → base 80.65, phone 2 in 5.17 h → penalty 1.94 → 79
    expect(w.focus).toBe(79);
    // discipline: plan 150 + 120 + 120 + 120 = 510, study 440 → 0.863; planned fun 0 of 90; goal days 3 of 4
    // (0.5×0.863 + 0.3×0 + 0.2×0.75) × 100 = 58
    expect(w.discipline).toBe(58);
  });
  it("report card metrics and grades", () => {
    expect(metric("goal")).toMatchObject({ score: 75, grade: "B", value: "3 of 4 days" });
    expect(metric("wasted")).toMatchObject({ score: 81, grade: "B" }); // 90 min ÷ 4 days = 22.5 → 100 × (1 − 22.5/120)
    expect(metric("early")).toMatchObject({ score: 50, grade: "D", value: "2 of 4 days" }); // Mon and Thu before 8 AM
    expect(metric("pomodoro")).toMatchObject({ score: 67, grade: "C", value: "2 of 3 finished" });
    expect(metric("phone")).toMatchObject({ score: 92, grade: "A" }); // 2 checks in 5.17 h
    expect(metric("sleep")).toMatchObject({ score: null, grade: null });
  });
  it("strong = A/B, needs work = C/D/F, and the one thing to fix is the lowest score", () => {
    expect(w.strong.every((m) => m.grade === "A" || m.grade === "B")).toBe(true);
    expect(w.needsWork.map((m) => m.key)).toContain("early");
    const lowest = w.metrics.filter((m) => m.score !== null).sort((a, b) => (a.score as number) - (b.score as number))[0];
    expect(w.fix?.metric.key).toBe(lowest.key); // here tracking completeness: only a few hours a day are logged
    expect(w.fix?.metric.key).toBe("tracking");
    expect(w.fix?.gain).toBeNull();
  });
});

describe("computeWeek: edge cases", () => {
  it("locked until 4 days are logged", () => {
    const few = computeWeek({ ...input, entries: entries.filter((e) => e.startMs < at("2026-11-25", "00:00")) });
    expect(few.loggedDays).toBe(2);
    expect(few.unlocked).toBe(false);
  });
  it("heavy wasting makes wasted time the one thing to fix, with the gain in study time", () => {
    // fill every day's time with Rest so tracking completeness is 100% and doesn't win
    const fill = ["2026-11-23", "2026-11-24", "2026-11-25"].map((d) => E("rest", d, "03:00", 21 * 60)).concat(E("rest", "2026-11-26", "03:00", 17 * 60));
    const wasteful = computeWeek({ ...input, entries: [...entries, ...fill, E("entertainment", "2026-11-25", "22:00", 240, { trigger: "bored" })] });
    expect(wasteful.fix?.metric.key).toBe("wasted");
    expect(wasteful.fix?.gain).toContain("+2h 45m");
  });
  it("no strongest / weakest weekday when every day is the same", () => {
    const flat = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-23", "2026-11-24", "2026-11-25"].map((d) => E("study", d, "19:00", 100));
    const r = computeWeek({ ...input, entries: flat });
    expect(r.strongDay).toBeNull();
    expect(r.weakDay).toBeNull();
  });
  it("a finished week projects nothing and has no remaining days", () => {
    const last = computeWeek({ ...input, days: weekOf(today, -1, TZ, 3) });
    expect(last.remainingDays).toBe(0);
    expect(last.projection).toBe(last.studySoFar);
    expect(last.dailyGap).toBeNull();
  });
  it("no history for a day type gives no projection (not a made-up number)", () => {
    const noWeekend = computeWeek({ ...input, entries: entries.filter((e) => !["2026-11-21", "2026-11-22"].some((d) => e.startMs >= at(d, "00:00") && e.startMs < at(d, "23:59"))) });
    expect(noWeekend.projection).toBeNull();
  });
});
