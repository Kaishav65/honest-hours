import { render, TEMPLATES, type RuleKey, type Severity, type Strictness } from "./templates";

const MIN = 60_000;

/** "1h 20m" / "45m" */
export const dur = (min: number) => {
  const m = Math.max(0, Math.round(min));
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

/** Everything the rules may look at, built from the user's own data right after an event. */
export type CoachFacts = {
  nowMs: number;
  /** Local clock hours (0–24) of `nowMs`. */
  localHour: number;
  /** Hours since the tracked day started (0–24). Late-night hours after midnight are 21+ with a 3 AM start. */
  hoursIntoDay: number;
  studyMin: number;
  /** Study minutes before the entries that triggered this event were added. */
  studyBeforeMin: number;
  goalMin: number;
  freeLeftMin: number;
  wasted: { totalMin: number; sessions: number; lastSessionMin: number };
  streak: {
    /** Streak including today if its goal is met. */
    days: number;
    freezes: number;
    /** Best streak over the days before today. */
    bestBefore: number;
    todayMet: boolean;
    earnedFreezeToday: boolean;
    /** Finished days in a row, ending yesterday, whose goal was missed (not saved by a freeze). */
    missedInRow: number;
    yesterday: { studyMin: number; goalMin: number; frozen: boolean } | null;
  };
  onTrack: "learning" | "on-track" | "close" | "at-risk" | null;
  trackedPct: number;
  unknownBlocks: number;
  unknownMin: number;
};

export type SavedEntry = {
  categoryName: string;
  kind: string;
  minutes: number;
  value: "productive" | "neutral" | "waste";
  planned: boolean | null;
  trigger: string | null;
  /** Unplanned waste entries with this trigger in the last 7 days, including this one. */
  triggerWeek: number;
};

export type CoachEvent =
  | { type: "checkin"; saved: SavedEntry[] }
  | { type: "pomodoro"; focus: number | null; phoneChecks: number | null; completed: boolean; minutes: number; subject: string }
  | { type: "awake"; wakeHour: number; quality: number | null; planMin: number | null; sleepMin: number | null; timeLabel: string }
  | { type: "sleep"; timeLabel: string }
  | { type: "review"; auto: boolean }
  | { type: "missed"; count: number };

export type Candidate = { rule: RuleKey; priority: number; vars: Record<string, string | number> };

// Priority: Drift > Goal at risk > Praise > Info (PLAN §12). Higher wins.
const P = { drift3: 100, driftLong: 98, drift2: 96, drift1: 94, trigger: 92, lastChance: 90, atRisk: 85, freeNow: 80, tracking: 78, recovery: 70, praise: 60, info: 40 };

const MILESTONES = [3, 7, 14, 30, 50, 100];

/** Rules about today's study: reaching or beating the goal, and the streak that follows. */
function studyRules(f: CoachFacts): Candidate[] {
  const out: Candidate[] = [];
  const crossed = f.studyMin >= f.goalMin && f.studyBeforeMin < f.goalMin;
  const beaten = f.goalMin > 0 && f.studyMin >= f.goalMin * 1.5 && f.studyBeforeMin < f.goalMin * 1.5;
  const pct = f.goalMin > 0 ? Math.round((f.studyMin / f.goalMin) * 100) : 0;
  if (beaten) out.push({ rule: "goal_beaten", priority: P.praise + 1, vars: { study: dur(f.studyMin), pct } });
  else if (crossed) out.push({ rule: "goal_reached", priority: P.praise, vars: { goal: dur(f.goalMin) } });
  if (crossed) {
    if (f.streak.missedInRow >= 2) {
      out.push({ rule: "comeback", priority: P.praise + 5, vars: { n: f.streak.missedInRow } });
    }
    if (f.streak.bestBefore >= 3 && f.streak.days > f.streak.bestBefore) {
      out.push({ rule: "streak_record", priority: P.praise + 4, vars: { streak: f.streak.days, best: f.streak.bestBefore } });
    } else if (MILESTONES.includes(f.streak.days)) {
      out.push({ rule: "streak_milestone", priority: P.praise + 3, vars: { streak: f.streak.days } });
    }
    if (f.streak.earnedFreezeToday) out.push({ rule: "freeze_earned", priority: P.praise + 2, vars: {} });
  }
  return out;
}

/** Rules about whether today's goal is still reachable. */
function riskRules(f: CoachFacts, justLoggedMealOrWalk: boolean): Candidate[] {
  const out: Candidate[] = [];
  const remaining = Math.max(0, f.goalMin - f.studyMin);
  if (remaining <= 0) return out;
  const vars = {
    remaining: dur(remaining),
    free_left: dur(f.freeLeftMin),
    pomos: Math.ceil(remaining / 25),
    s: Math.ceil(remaining / 25) === 1 ? "" : "s",
    streak: f.streak.days,
  };
  if (f.freeLeftMin > 0 && f.freeLeftMin <= 60 && f.streak.freezes === 0 && f.streak.days >= 1) {
    out.push({ rule: "last_chance", priority: P.lastChance, vars });
  }
  if (f.onTrack === "at-risk") out.push({ rule: "goal_at_risk", priority: P.atRisk, vars });
  if (justLoggedMealOrWalk && f.localHour >= 17 && f.freeLeftMin >= 30) {
    out.push({ rule: "free_now", priority: P.freeNow, vars });
  }
  return out;
}

export function candidatesFor(event: CoachEvent, f: CoachFacts): Candidate[] {
  switch (event.type) {
    case "checkin": {
      const out: Candidate[] = [];
      const drifts = event.saved.filter((e) => e.value === "waste" && e.planned !== true && e.minutes >= 15);
      if (drifts.length > 0) {
        const last = drifts[drifts.length - 1];
        const n = f.wasted.sessions;
        const vars = {
          minutes: Math.round(f.wasted.lastSessionMin || last.minutes),
          category: last.categoryName,
          total: dur(f.wasted.totalMin),
          pomos: Math.max(1, Math.round(f.wasted.totalMin / 25)),
          pomo_min: dur(25),
          sessions: n,
        };
        if (f.wasted.lastSessionMin >= 45) out.push({ rule: "drift_long", priority: P.driftLong, vars });
        if (n >= 3) out.push({ rule: "drift_3", priority: P.drift3, vars });
        else if (n === 2) out.push({ rule: "drift_2", priority: P.drift2, vars });
        else out.push({ rule: "drift_1", priority: P.drift1, vars });
        const t = drifts.find((e) => e.trigger && e.triggerWeek >= 3);
        if (t) {
          out.push({ rule: "drift_trigger", priority: P.trigger, vars: { count: t.triggerWeek, trigger: t.trigger ?? "", category: t.categoryName } });
        }
      }
      out.push(...studyRules(f));
      out.push(...riskRules(f, event.saved.some((e) => /meal|walk|dinner/i.test(e.categoryName))));
      return out;
    }
    case "pomodoro": {
      const out = studyRules(f);
      const left = Math.max(0, f.goalMin - f.studyMin);
      const vars = {
        minutes: Math.round(event.minutes),
        subject: event.subject,
        focus: event.focus ?? "?",
        left: left > 0 ? `${dur(left)} to go` : "goal reached",
        phones: event.phoneChecks ? ` with ${event.phoneChecks} phone check${event.phoneChecks === 1 ? "" : "s"}` : "",
      };
      if (!event.completed) out.push({ rule: "pomo_abandoned", priority: P.info + 2, vars });
      else if ((event.focus !== null && event.focus <= 2) || (event.phoneChecks ?? 0) >= 2) {
        out.push({ rule: "pomo_done_weak", priority: P.info + 4, vars });
      } else if (event.focus !== null && event.focus >= 4) out.push({ rule: "pomo_done_good", priority: P.info + 3, vars });
      out.push(...riskRules(f, false));
      return out;
    }
    case "awake": {
      const out: Candidate[] = [];
      const y = f.streak.yesterday;
      if (y && f.streak.missedInRow >= 2) out.push({ rule: "two_missed", priority: P.recovery + 2, vars: { n: f.streak.missedInRow } });
      else if (y && f.streak.missedInRow === 1) {
        out.push({ rule: "missed_yesterday", priority: P.recovery + 1, vars: { yesterday: dur(y.studyMin), y_goal: dur(y.goalMin) } });
      }
      if (y?.frozen) out.push({ rule: "freeze_saved", priority: P.recovery + 3, vars: { streak: f.streak.days, freezes: f.streak.freezes } });
      if (event.quality !== null && event.quality <= 2) {
        out.push({
          rule: "bad_sleep",
          priority: P.recovery + 4,
          vars: { quality: event.quality, slept: event.sleepMin ? ` (${dur(event.sleepMin)})` : "" },
        });
      }
      if (event.wakeHour >= 3 && event.wakeHour < 5) out.push({ rule: "early_start", priority: P.praise, vars: { wake: event.timeLabel } });
      else out.push({ rule: "normal_wake", priority: P.info, vars: { goal: dur(f.goalMin) } });
      if (event.planMin) out.push({ rule: "plan_set", priority: P.info + 1, vars: { plan: dur(event.planMin) } });
      return out;
    }
    case "sleep": {
      // Hours into the tracked day: 21 = midnight, 22 = 1 AM (with a 3 AM start).
      if (f.hoursIntoDay >= 22) return [{ rule: "sleep_late", priority: P.info, vars: { time: event.timeLabel } }];
      if (f.hoursIntoDay >= 14 && f.hoursIntoDay < 21) return [{ rule: "sleep_early", priority: P.praise, vars: { time: event.timeLabel } }];
      return [];
    }
    case "review": {
      const out: Candidate[] = [];
      if (f.trackedPct < 60 && f.unknownBlocks > 0) {
        out.push({
          rule: "low_tracking",
          priority: P.tracking,
          vars: { pct: Math.round(f.trackedPct), blocks: f.unknownBlocks, s: f.unknownBlocks === 1 ? "" : "s", unknown: dur(f.unknownMin) },
        });
      }
      if (event.auto) out.push({ rule: "review_reminder", priority: P.info, vars: {} });
      return out;
    }
    case "missed":
      return event.count >= 3 ? [{ rule: "many_missed", priority: P.info, vars: { count: event.count } }] : [];
  }
}

export type ShownMessage = { rule: string; severity: string; createdMs: number };
export type Picked = { rule: RuleKey; severity: Severity; text: string; vars: Record<string, string | number> };

const DAY = 24 * 60 * MIN;
const SCOLD_STREAK = 5;
/** Never in a row more than this many scolds without a real win: see `pick`. */
const isScold = (s: string) => s === "scold" || s === "pattern";

/**
 * Anti-annoyance (PLAN §12): at most one message per event (highest priority), the same rule never twice
 * within 24 hours, and after 5 scolds in a row a real win (praise) is shown instead of another scold.
 * `shown` is newest first.
 */
export function pick(candidates: Candidate[], shown: ShownMessage[], nowMs: number, strictness: Strictness): Picked | null {
  const fresh = candidates.filter((c) => !shown.some((s) => s.rule === c.rule && nowMs - s.createdMs < DAY));
  if (fresh.length === 0) return null;
  const sorted = [...fresh].sort((a, b) => b.priority - a.priority);
  let chosen = sorted[0];
  const lastScolds = shown.length >= SCOLD_STREAK && shown.slice(0, SCOLD_STREAK).every((s) => isScold(s.severity));
  if (lastScolds && isScold(TEMPLATES[chosen.rule].severity)) {
    const win = sorted.find((c) => TEMPLATES[c.rule].severity === "praise");
    if (win) chosen = win;
  }
  const seen = shown.filter((s) => s.rule === chosen.rule).length;
  return {
    rule: chosen.rule,
    severity: TEMPLATES[chosen.rule].severity,
    text: render(chosen.rule, strictness, seen, chosen.vars),
    vars: chosen.vars,
  };
}

/** Only these may become a browser notification (PLAN §12), at most one per 30 minutes. */
export const NOTIFY_RULES: RuleKey[] = ["drift_3", "goal_at_risk", "last_chance", "free_now"];
export const NOTIFY_GAP_MS = 30 * MIN;
export const canNotify = (rule: RuleKey, lastNotifyMs: number | null, nowMs: number) =>
  NOTIFY_RULES.includes(rule) && (lastNotifyMs === null || nowMs - lastNotifyMs >= NOTIFY_GAP_MS);
