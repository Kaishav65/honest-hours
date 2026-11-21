import { describe, expect, it } from "vitest";
import { zonedTimeToMs } from "@/lib/time";
import { answersToFields, fieldsToAnswers } from "./answers";
import { nextDueMs, slotStartMs } from "./schedule";
import type { Question } from "./types";

const IST = "Asia/Kolkata";
const at = (h: number, m = 0, day = 21) => zonedTimeToMs(IST, 2026, 11, day, h, m);
const MIN = 60_000;

describe("check-in schedule", () => {
  it("away for 70 minutes: the next check-in covers the whole 70 minutes", () => {
    const start = slotStartMs(at(10, 0), at(11, 10), IST, 3);
    expect(start).toBe(at(10, 0));
    expect(nextDueMs(start, null, 30)).toBe(at(10, 30)); // already overdue at 11:10
    expect(at(11, 10) - start).toBe(70 * MIN);
  });
  it("first ever check-in starts from now", () => {
    expect(slotStartMs(null, at(9, 5) + 20_000, IST, 3)).toBe(at(9, 5));
  });
  it("a slot never starts before today's 3 AM", () => {
    expect(slotStartMs(at(22, 0, 20), at(9, 0), IST, 3)).toBe(at(3, 0));
  });
  it("a skipped popup waits another interval but keeps the slot start", () => {
    expect(nextDueMs(at(10, 0), at(10, 30), 30)).toBe(at(11, 0));
  });
});

const q = (id: string, systemKey: Question["systemKey"], type: Question["type"] = "text"): Question => ({
  id,
  categoryId: "c",
  label: id,
  type,
  options: null,
  systemKey,
});
const questions = [
  q("q-focus", "focus", "rating_1_5"),
  q("q-phone", "phone_checks", "number"),
  q("q-planned", "planned", "yes_no"),
  q("q-why", "trigger"),
  q("q-mood", "mood_after"),
  q("q-learned", null),
];

describe("answers <-> entry columns", () => {
  it("system questions go to their own columns, the rest into answers", () => {
    const f = answersToFields(questions, {
      "q-focus": 4,
      "q-phone": 2,
      "q-planned": false,
      "q-why": "bored",
      "q-mood": "worse",
      "q-learned": "integration",
    });
    expect(f).toEqual({
      focus: 4,
      phone_checks: 2,
      planned: false,
      trigger: "bored",
      mood_after: "worse",
      answers: { "q-learned": "integration" },
    });
  });
  it("unanswered / empty values are skipped (0 and false still count)", () => {
    const f = answersToFields(questions, { "q-phone": 0, "q-planned": false, "q-learned": "" });
    expect(f).toEqual({ phone_checks: 0, planned: false, answers: {} });
  });
  it("round-trips to prefill the next check-in", () => {
    const answers = { "q-focus": 5, "q-planned": true, "q-learned": "limits" };
    expect(fieldsToAnswers(questions, answersToFields(questions, answers))).toEqual(answers);
  });
});

import { busyEndMs, clockOf, isLateNight, lastClockOccurrence, nextClockOccurrence, parseClock } from "./status";

describe("busy / sleep helpers", () => {
  it("parses clock strings", () => {
    expect(parseClock("23:30")).toEqual({ h: 23, m: 30 });
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("")).toBeNull();
  });
  it("when did you sleep: 11:30 PM said at 7 AM means last night", () => {
    expect(lastClockOccurrence("23:30", at(7, 0), IST)).toBe(at(23, 30, 20));
  });
  it("when did you sleep: 1:00 AM said at 7 AM means earlier today", () => {
    expect(lastClockOccurrence("01:00", at(7, 0), IST)).toBe(at(1, 0));
  });
  it("busy until 3:30 PM said at 4 PM means tomorrow; said at 2 PM means today", () => {
    expect(nextClockOccurrence("15:30", at(16, 0), IST)).toBe(at(15, 30, 22));
    expect(nextClockOccurrence("15:30", at(14, 0), IST)).toBe(at(15, 30));
  });
  it("busy preset adds minutes", () => {
    expect(busyEndMs(at(10, 0), 60)).toBe(at(11, 0));
  });
  it("clockOf prefills inputs in the user's zone", () => {
    expect(clockOf(at(23, 5), IST)).toBe("23:05");
  });
  it("late night is 10 PM until the day starts", () => {
    expect(isLateNight(at(23, 0), IST, 3)).toBe(true);
    expect(isLateNight(at(2, 59), IST, 3)).toBe(true);
    expect(isLateNight(at(3, 0), IST, 3)).toBe(false);
    expect(isLateNight(at(15, 0), IST, 3)).toBe(false);
  });
});
