import { describe, expect, it } from "vitest";
import { candidatesFor, canNotify, pick, type Candidate, type CoachFacts, type SavedEntry, type ShownMessage } from "./rules";
import { RULE_KEYS, TEMPLATES, fill, render, variantsFor } from "./templates";

const NOW = 1_800_000_000_000;
const MIN = 60_000;

const base: CoachFacts = {
  nowMs: NOW,
  localHour: 20,
  hoursIntoDay: 17,
  studyMin: 40,
  studyBeforeMin: 40,
  goalMin: 120,
  freeLeftMin: 100,
  wasted: { totalMin: 0, sessions: 0, lastSessionMin: 0 },
  streak: { days: 6, freezes: 0, bestBefore: 6, todayMet: false, earnedFreezeToday: false, missedInRow: 0, yesterday: null },
  onTrack: null,
  trackedPct: 90,
  unknownBlocks: 0,
  unknownMin: 0,
};
const insta = (minutes: number, over: Partial<SavedEntry> = {}): SavedEntry => ({
  categoryName: "Instagram", kind: "entertainment", minutes, value: "waste", planned: false, trigger: null, triggerWeek: 0, ...over,
});
const rules = (c: Candidate[]) => c.map((x) => x.rule);
const top = (c: Candidate[]) => [...c].sort((a, b) => b.priority - a.priority)[0]?.rule;
const pomo = (over = {}) => ({ type: "pomodoro" as const, focus: 3, phoneChecks: 0, completed: true, minutes: 25, subject: "DSA", ...over });

describe("templates", () => {
  it("every rule has wording at every strictness", () => {
    for (const k of RULE_KEYS) {
      expect(TEMPLATES[k].text, k).toBeTruthy();
      for (const s of ["gentle", "balanced", "strict"] as const) expect(variantsFor(k, s).length, `${k}/${s}`).toBeGreaterThan(0);
    }
  });
  it("fills placeholders, leaves unknown ones visible, rotates variants", () => {
    expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
    const v = { minutes: 20, category: "Instagram" };
    expect(render("drift_1", "balanced", 0, v)).not.toBe(render("drift_1", "balanced", 1, v));
    expect(render("drift_1", "balanced", 2, v)).toBe(render("drift_1", "balanced", 0, v));
  });
  it("strictness changes the wording (drift_2)", () => {
    const v = { total: "55m", pomos: 2, pomo_min: "25m" };
    const out = (["gentle", "balanced", "strict"] as const).map((x) => render("drift_2", x, 0, v));
    expect(new Set(out).size).toBe(3);
    expect(out[1]).toContain("55m");
  });
});

describe("drift escalation", () => {
  const sess = (n: number, last = 20) => ({ ...base, wasted: { totalMin: 20 * n, sessions: n, lastSessionMin: last } });
  it("1st gives drift_1, 2nd drift_2, 3rd+ drift_3", () => {
    const ev = { type: "checkin" as const, saved: [insta(20)] };
    expect(top(candidatesFor(ev, sess(1)))).toBe("drift_1");
    expect(top(candidatesFor(ev, sess(2)))).toBe("drift_2");
    expect(top(candidatesFor(ev, sess(3)))).toBe("drift_3");
  });
  it("planned or short entertainment is not drift", () => {
    expect(rules(candidatesFor({ type: "checkin", saved: [insta(20, { planned: true })] }, sess(1)))).not.toContain("drift_1");
    expect(rules(candidatesFor({ type: "checkin", saved: [insta(10)] }, sess(1)))).not.toContain("drift_1");
  });
  it("a 50-minute session also triggers drift_long, which outranks drift_1", () => {
    const c = candidatesFor({ type: "checkin", saved: [insta(50)] }, sess(1, 50));
    expect(rules(c)).toContain("drift_long");
    expect(top(c)).toBe("drift_long");
  });
  it("the 3rd time this week with the same trigger adds drift_trigger", () => {
    const c = candidatesFor({ type: "checkin", saved: [insta(20, { trigger: "tired", triggerWeek: 3 })] }, sess(1));
    expect(rules(c)).toContain("drift_trigger");
  });
  it("one message per event: one each, never repeated within a day", () => {
    const shown: ShownMessage[] = [];
    const seq: string[] = [];
    for (let n = 1; n <= 4; n++) {
      const at = NOW + n * 30 * MIN;
      const p = pick(candidatesFor({ type: "checkin", saved: [insta(20)] }, sess(n)), shown, at, "balanced");
      if (p) {
        seq.push(p.rule);
        shown.unshift({ rule: p.rule, severity: p.severity, createdMs: at });
      }
    }
    expect(seq).toEqual(["drift_1", "drift_2", "drift_3"]); // the 4th is drift_3 again within 24 h, so silent
  });
});

describe("study and streak rules", () => {
  const met = { ...base, studyMin: 125, studyBeforeMin: 95, streak: { ...base.streak, days: 7, bestBefore: 9, todayMet: true } };
  it("goal reached + milestone + good session", () => {
    const c = candidatesFor(pomo({ focus: 5, minutes: 30 }), met);
    expect(rules(c)).toEqual(expect.arrayContaining(["goal_reached", "streak_milestone", "pomo_done_good"]));
  });
  it("no goal message when the goal was already met before", () => {
    expect(rules(candidatesFor(pomo({ focus: 5 }), { ...met, studyBeforeMin: 125 }))).not.toContain("goal_reached");
  });
  it("beating 150% gives goal_beaten", () => {
    expect(rules(candidatesFor(pomo(), { ...met, studyMin: 190, studyBeforeMin: 170 }))).toContain("goal_beaten");
  });
  it("new best streak and comeback", () => {
    expect(rules(candidatesFor(pomo(), { ...met, streak: { ...met.streak, days: 12, bestBefore: 11 } }))).toContain("streak_record");
    expect(rules(candidatesFor(pomo(), { ...met, streak: { ...met.streak, days: 1, missedInRow: 2 } }))).toContain("comeback");
  });
  it("a freeze earned today", () => {
    expect(rules(candidatesFor(pomo(), { ...met, streak: { ...met.streak, earnedFreezeToday: true } }))).toContain("freeze_earned");
  });
  it("weak and abandoned sessions", () => {
    expect(top(candidatesFor(pomo({ focus: 2, phoneChecks: 3 }), base))).toBe("pomo_done_weak");
    expect(top(candidatesFor(pomo({ focus: null, phoneChecks: null, completed: false, minutes: 11 }), base))).toBe("pomo_abandoned");
  });
});

describe("goal at risk and free time", () => {
  const ev = { type: "checkin" as const, saved: [{ ...insta(30), categoryName: "Meal", kind: "routine", value: "neutral" as const }] };
  it("free_now after a meal in the evening when the goal isn't met", () => {
    expect(rules(candidatesFor(ev, base))).toContain("free_now");
    expect(rules(candidatesFor(ev, { ...base, localHour: 12 }))).not.toContain("free_now");
    expect(rules(candidatesFor(ev, { ...base, studyMin: 130 }))).not.toContain("free_now");
  });
  it("goal_at_risk when the on-track check is red; last_chance in the last hour with no freeze", () => {
    expect(rules(candidatesFor(ev, { ...base, onTrack: "at-risk" }))).toContain("goal_at_risk");
    const c = candidatesFor(ev, { ...base, freeLeftMin: 50 });
    expect(top(c)).toBe("last_chance");
    expect(rules(candidatesFor(ev, { ...base, freeLeftMin: 50, streak: { ...base.streak, freezes: 1 } }))).not.toContain("last_chance");
  });
});

describe("morning, night, tracking", () => {
  const awake = { type: "awake" as const, wakeHour: 7, quality: 4, planMin: 150, sleepMin: 300, timeLabel: "3:40 AM" };
  it("early start before 5, normal wake after", () => {
    expect(rules(candidatesFor({ ...awake, wakeHour: 3.7 }, base))).toContain("early_start");
    expect(rules(candidatesFor(awake, base))).toContain("normal_wake");
  });
  it("bad sleep outranks the greeting; plan_set is offered", () => {
    const c = candidatesFor({ ...awake, quality: 2 }, base);
    expect(top(c)).toBe("bad_sleep");
    expect(rules(c)).toContain("plan_set");
  });
  it("recovery: one missed day, two missed days, freeze saved", () => {
    const y = { studyMin: 35, goalMin: 120, frozen: false };
    expect(rules(candidatesFor(awake, { ...base, streak: { ...base.streak, missedInRow: 1, yesterday: y } }))).toContain("missed_yesterday");
    expect(rules(candidatesFor(awake, { ...base, streak: { ...base.streak, missedInRow: 2, yesterday: y } }))).toContain("two_missed");
    expect(rules(candidatesFor(awake, { ...base, streak: { ...base.streak, yesterday: { ...y, frozen: true } } }))).toContain("freeze_saved");
  });
  it("sleep before midnight, after 1 AM, and in between", () => {
    expect(rules(candidatesFor({ type: "sleep", timeLabel: "11:30 PM" }, { ...base, hoursIntoDay: 20.5 }))).toEqual(["sleep_early"]);
    expect(rules(candidatesFor({ type: "sleep", timeLabel: "1:20 AM" }, { ...base, hoursIntoDay: 22.3 }))).toEqual(["sleep_late"]);
    expect(candidatesFor({ type: "sleep", timeLabel: "12:30 AM" }, { ...base, hoursIntoDay: 21.5 })).toEqual([]);
  });
  it("low_tracking under 60%, review_reminder only when opened by itself, many_missed at 3", () => {
    expect(rules(candidatesFor({ type: "review", auto: false }, { ...base, trackedPct: 55, unknownBlocks: 2 }))).toEqual(["low_tracking"]);
    expect(rules(candidatesFor({ type: "review", auto: true }, base))).toEqual(["review_reminder"]);
    expect(candidatesFor({ type: "missed", count: 2 }, base)).toEqual([]);
    expect(rules(candidatesFor({ type: "missed", count: 3 }, base))).toEqual(["many_missed"]);
  });
});

describe("anti-annoyance", () => {
  const scold: Candidate = { rule: "drift_2", priority: 96, vars: { total: "1h", pomos: 2, pomo_min: "25m" } };
  const win: Candidate = { rule: "goal_reached", priority: 60, vars: { goal: "2h" } };
  const sc = (i: number): ShownMessage => ({ rule: `drift_x${i}`, severity: "scold", createdMs: NOW - i * 60 * MIN });
  it("highest priority wins", () => {
    expect(pick([win, scold], [], NOW, "balanced")?.rule).toBe("drift_2");
  });
  it("same rule is not repeated within 24 h, but is allowed after", () => {
    expect(pick([scold], [{ rule: "drift_2", severity: "scold", createdMs: NOW - 23 * 60 * MIN }], NOW, "balanced")).toBeNull();
    expect(pick([scold], [{ rule: "drift_2", severity: "scold", createdMs: NOW - 25 * 60 * MIN }], NOW, "balanced")?.rule).toBe("drift_2");
  });
  it("after 5 scolds in a row the next real win shows instead", () => {
    const five = [1, 2, 3, 4, 5].map(sc);
    expect(pick([win, scold], five, NOW, "balanced")?.rule).toBe("goal_reached");
    expect(pick([win, scold], five.slice(0, 4), NOW, "balanced")?.rule).toBe("drift_2");
    expect(pick([scold], five, NOW, "balanced")?.rule).toBe("drift_2"); // no win available: the scold still shows
  });
  it("variants rotate by how many times the rule was shown", () => {
    const old = (n: number): ShownMessage[] =>
      Array.from({ length: n }, (_, i) => ({ rule: "plan_set", severity: "info", createdMs: NOW - (30 + i) * 60 * MIN }));
    const c: Candidate = { rule: "plan_set", priority: 41, vars: { plan: "2h" } };
    expect(pick([c], old(1), NOW, "balanced")?.text).not.toBe(pick([c], old(0), NOW, "balanced")?.text);
  });
  it("browser notifications: only 4 rules, at most one per 30 minutes", () => {
    expect(canNotify("drift_3", null, NOW)).toBe(true);
    expect(canNotify("goal_reached", null, NOW)).toBe(false);
    expect(canNotify("free_now", NOW - 10 * MIN, NOW)).toBe(false);
    expect(canNotify("free_now", NOW - 31 * MIN, NOW)).toBe(true);
  });
});
