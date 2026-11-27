// All coach wording in one place (PLAN §12). Lookup = rule key + strictness + variant; no other selection logic.
// Language is one more key later (Hinglish): add a second copy of TEMPLATES and pick by a setting.
// Every scold carries a way back. Every number is filled from real data ({placeholders}).

export type Strictness = "gentle" | "balanced" | "strict";
export type Severity = "scold" | "praise" | "recovery" | "pattern" | "info";

export const RULE_KEYS = [
  "early_start", "normal_wake", "plan_set", "bad_sleep",
  "pomo_done_good", "pomo_done_weak", "pomo_abandoned", "goal_reached", "goal_beaten",
  "drift_1", "drift_2", "drift_3", "drift_long", "drift_trigger",
  "free_now", "goal_at_risk", "last_chance", "freeze_saved",
  "sleep_early", "sleep_late", "review_reminder",
  "missed_yesterday", "two_missed", "comeback",
  "streak_milestone", "streak_record", "freeze_earned",
  "low_tracking", "many_missed",
] as const;
export type RuleKey = (typeof RULE_KEYS)[number];

/** Wording that doesn't change with strictness: just variants. Otherwise per strictness (balanced is required). */
type Wording = string[] | ({ balanced: string[] } & Partial<Record<Strictness, string[]>>);

export const TEMPLATES: Record<RuleKey, { severity: Severity; text: Wording }> = {
  // 🌅 Morning
  early_start: {
    severity: "praise",
    text: [
      "Up at {wake}, before the world wakes up. This is a great window for focus. Start a session? 🌅",
      "{wake} wake-up. Nobody is asking anything of you yet. One pomodoro now is a head start on the whole day.",
    ],
  },
  normal_wake: {
    severity: "info",
    text: [
      "Good morning. Today's goal: {goal}. Even one pomodoro now makes the evening easier.",
      "New day, goal {goal}. The first pomodoro is the hardest, so do it early.",
    ],
  },
  plan_set: {
    severity: "info",
    text: [
      "Plan locked: {plan} today. Let's see if evening-you keeps morning-you's promise.",
      "{plan} planned for today. A plan you keep beats a big plan you break.",
    ],
  },
  bad_sleep: {
    severity: "info",
    text: [
      "Rough night{slept}. Don't go for a hero day. A shorter plan you keep beats a big plan you break.",
      "Sleep was {quality}/5{slept}. Go easy: aim for the goal, not extra, and sleep earlier tonight.",
    ],
  },
  // 📚 Study
  pomo_done_good: {
    severity: "praise",
    text: [
      "{minutes} min of solid focus on {subject} ✅ {left}. Keep the chain going?",
      "Focus {focus}/5 on {subject} ✅ {left}. Another one?",
    ],
  },
  pomo_done_weak: {
    severity: "scold",
    text: {
      gentle: ["Session done. Focus was {focus}/5{phones}. Maybe the phone in another room for the next one?"],
      balanced: [
        "Session done, but focus was {focus}/5{phones}. Put the phone in another room for the next one.",
        "{minutes} min logged, focus {focus}/5{phones}. Next session: phone away, and make it count.",
      ],
      strict: ["Focus {focus}/5{phones}. That's not your best. Phone out of reach, then go again."],
    },
  },
  pomo_abandoned: {
    severity: "info",
    text: [
      "Stopped at {minutes} min. It happens. Try a shorter 15-min session, starting is the hard part.",
      "{minutes} min before stopping. Still counts. A 15-min session is an easy way back in.",
    ],
  },
  goal_reached: {
    severity: "praise",
    text: [
      "{goal} done 🎯 Today's goal is in the bag. Anything extra is a bonus.",
      "Goal of {goal} reached 🎯 That's the promise kept. Take the evening, or add a bonus session.",
    ],
  },
  goal_beaten: {
    severity: "praise",
    text: [
      "{study} today, {pct}% of your goal. That's a big day 🔥",
      "{pct}% of today's goal ({study}). You went well past it 🔥",
    ],
  },
  // 📱 Drift (escalates, resets daily)
  drift_1: {
    severity: "scold",
    text: {
      gentle: ["{minutes} min of {category}, unplanned. Just checking: was this a break? You can stop here whenever you like."],
      balanced: [
        "{minutes} min of {category}, unplanned. Was this a break or a slip? Either way, you can stop here.",
        "{category} for {minutes} min without a plan. If it's a break, fine. If not, stop now and start a 25-min session.",
      ],
      strict: ["{minutes} min of unplanned {category}. Decide now: stop, or plan it. A pomodoro is the better trade."],
    },
  },
  drift_2: {
    severity: "scold",
    text: {
      gentle: ["That's {total} of unplanned time today. No stress. Want to switch to a 25-min session now?"],
      balanced: [
        "Second unplanned session today: {total} lost so far. That's {pomos} pomodoros. Close it now and start one?",
        "{total} gone to unplanned entertainment today, in 2 sessions. One pomodoro wins {pomo_min} back.",
      ],
      strict: ["{total} gone, twice today. You said studying matters. Prove it: phone down, pomodoro now."],
    },
  },
  drift_3: {
    severity: "scold",
    text: {
      gentle: ["{total} of unplanned time today across {sessions} sessions. A single pomodoro would turn the day around."],
      balanced: [
        "{total} wasted today. This is becoming a wasted evening. Stop now, start one pomodoro, and save the day. You've done it before.",
        "{sessions} unplanned sessions, {total} lost. It's not too late: one pomodoro, right now.",
      ],
      strict: ["{total} wasted, {sessions} sessions. Enough. Close it, start a pomodoro now, and finish the day properly."],
    },
  },
  drift_long: {
    severity: "scold",
    text: [
      "{minutes} min straight of {category}. That wasn't a break, that was autopilot. Reset: water, stand up, 25-min session.",
      "{minutes} min on {category} in one go, unplanned. Stand up, drink water, then one pomodoro to reset.",
    ],
  },
  drift_trigger: {
    severity: "pattern",
    text: [
      "{count} times this week: '{trigger}' → {category}. This is a pattern, not an accident. Try something else first, like a 15-min walk.",
      "'{trigger}' led to {category} {count} times this week. Next time it hits, do 10 minutes of something else before you pick up the phone.",
    ],
  },
  // ⏳ Goal at risk / free time
  free_now: {
    severity: "info",
    text: [
      "You're free now with ~{free_left} before your usual sleep. {pomos} pomodoro{s} finish today's goal. Start one?",
      "Free time: ~{free_left} until usual sleep, and {remaining} of study left. A pomodoro now?",
    ],
  },
  goal_at_risk: {
    severity: "scold",
    text: {
      gentle: ["{remaining} still to go, and ~{free_left} of free time left. It's still possible. Maybe start in the next 10 minutes?"],
      balanced: [
        "{remaining} still needed, ~{free_left} of free time left. At your usual pace the goal is at risk. Start in the next 10 min.",
        "Goal at risk: {remaining} to go with ~{free_left} before usual sleep. One pomodoro now keeps it alive.",
      ],
      strict: ["{remaining} to go and your pace says you won't make it. Start a pomodoro now, not in an hour."],
    },
  },
  last_chance: {
    severity: "scold",
    text: [
      "Your {streak}-day streak ends tonight unless you do {remaining} more. {pomos} pomodoro{s}. Go.",
      "{remaining} left and ~{free_left} before usual sleep. The {streak}-day streak is on the line. Start now.",
    ],
  },
  freeze_saved: {
    severity: "info",
    text: [
      "Missed yesterday, but a freeze saved your {streak}-day streak 🧊 You have {freezes} left. Don't spend it today.",
    ],
  },
  // 🌙 Night
  sleep_early: {
    severity: "praise",
    text: ["Before midnight 👌 Good call. Tomorrow-you says thanks.", "{time}. Early night, good call 👌 Sleep is part of the plan."],
  },
  sleep_late: {
    severity: "info",
    text: [
      "{time}. Late nights usually cost the next day's focus. Tomorrow: phone away at 11:30.",
      "It's {time}. Sleep now; a short night makes tomorrow's goal harder. Tomorrow, wind down earlier.",
    ],
  },
  review_reminder: {
    severity: "info",
    text: ["1-minute review: how did today go, and what's tomorrow's one goal?"],
  },
  // 🔁 Recovery
  missed_yesterday: {
    severity: "recovery",
    text: [
      "Yesterday: {yesterday} of {y_goal}. It's done, don't carry it. Today is a fresh start, and one early session fixes the mood.",
      "{yesterday} of {y_goal} yesterday. Missing one day is normal; missing two is a habit. Start today with one pomodoro.",
    ],
  },
  two_missed: {
    severity: "recovery",
    text: [
      "{n} days in a row now. This is how habits slip. Make today small but certain: just 2 pomodoros.",
      "{n} missed days. Don't aim big. Two pomodoros today, and the chain is back.",
    ],
  },
  comeback: {
    severity: "praise",
    text: ["Comeback day ✅ After {n} missed days, you showed up. That's real discipline."],
  },
  // 🏆 Milestones
  streak_milestone: {
    severity: "praise",
    text: ["{streak}-day streak 🔥 You're becoming the person who studies daily.", "{streak} days in a row 🔥 This is what consistency looks like."],
  },
  streak_record: {
    severity: "praise",
    text: ["New record: {streak} days, beating your old best of {best} 🏆"],
  },
  freeze_earned: {
    severity: "praise",
    text: ["5 goal days → freeze earned 🧊 Use it only when life really happens."],
  },
  // 📝 Tracking honesty
  low_tracking: {
    severity: "scold",
    text: [
      "Only {pct}% of today logged. Can't fix what you can't see. Fill the {blocks} grey block{s} now (1 min).",
      "{pct}% tracked today, {unknown} unknown. Open the Timeline and fill the gaps before you sleep.",
    ],
  },
  many_missed: {
    severity: "info",
    text: ["{count} check-ins skipped. Busy? Use Busy mode so the gaps make sense."],
  },
};

/** Replaces {name} with vars[name]; an unknown name is left as is, so a typo is visible. */
export function fill(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** The variants for a rule at a strictness (falls back to Balanced). */
export function variantsFor(rule: RuleKey, strictness: Strictness): string[] {
  const w = TEMPLATES[rule].text;
  return Array.isArray(w) ? w : (w[strictness] ?? w.balanced);
}

/** Wording for `rule`; `seen` = how many times it was shown before, so variants rotate. */
export function render(rule: RuleKey, strictness: Strictness, seen: number, vars: Record<string, string | number>) {
  const list = variantsFor(rule, strictness);
  return fill(list[seen % list.length], vars);
}
