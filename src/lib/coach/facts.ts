import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryKind } from "@/lib/checkin/types";
import { onTrack, pastOutcomes, restOfDaySamples, FREEZE_EVERY } from "@/lib/insights/streak";
import { loadStudyHistory } from "@/lib/insights/study-history";
import { computeToday, usualSleepMs, type InsightEntry } from "@/lib/insights/today";
import { dayOf, localParts } from "@/lib/time";
import { buildBlocks } from "@/lib/time/blocks";
import type { CoachFacts } from "./rules";

const MIN = 60_000;

type Profile = {
  timezone: string;
  day_start_hour: number;
  weekday_goal_min: number;
  weekend_goal_min: number;
};

/**
 * Reads the user's data right after an event and turns it into the numbers the coach rules need.
 * `studyAddedMin` = study minutes the event just added (so the rules can tell when a goal was crossed).
 * `triggers` = the "what made you pick it up" answers of the entries just saved, to count repeats this week.
 */
export async function loadCoachFacts(
  supabase: SupabaseClient,
  profile: Profile,
  sleepStarts: number[],
  nowMs: number,
  studyAddedMin: number,
  triggers: string[] = [],
): Promise<{ facts: CoachFacts; triggerWeek: Record<string, number> }> {
  const tz = profile.timezone;
  const day = dayOf(nowMs, tz, profile.day_start_hour);
  const weekAgo = new Date(nowMs - 7 * 24 * 60 * MIN).toISOString();
  const [cats, rows, hist] = await Promise.all([
    supabase.from("categories").select("id, kind, value"),
    supabase
      .from("entries")
      .select("id, category_id, start_at, end_at, planned, trigger")
      .gt("end_at", weekAgo)
      .order("start_at"),
    loadStudyHistory(supabase, profile, nowMs),
  ]);
  const byId = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const all = (rows.data ?? []).flatMap((r) => {
    const c = byId.get(r.category_id);
    return c
      ? [
          {
            id: r.id as string,
            categoryId: r.category_id as string,
            startMs: Date.parse(r.start_at),
            endMs: Date.parse(r.end_at),
            kind: c.kind as CategoryKind,
            value: c.value as InsightEntry["value"],
            planned: r.planned as boolean | null,
            trigger: r.trigger as string | null,
          },
        ]
      : [];
  });
  const todays = all.filter((e) => e.endMs > day.startMs && e.startMs < day.endMs);

  const goalMin = hist.history.at(-1)?.goalMin ?? (day.dayType === "weekend" ? profile.weekend_goal_min : profile.weekday_goal_min);
  const sleepAt = usualSleepMs(sleepStarts, day, tz, profile.day_start_hour);
  const s = computeToday({ entries: todays, day, nowMs, goalMin, usualSleepMs: sleepAt });

  // Length of the last run of back-to-back unplanned entries of one waste category (a "session").
  let lastSession = 0;
  let prev: { categoryId: string; endMs: number } | null = null;
  for (const e of todays) {
    const wasted = e.value === "waste" && e.planned !== true;
    const min = Math.max(0, Math.min(e.endMs, nowMs) - Math.max(e.startMs, day.startMs)) / MIN;
    if (!wasted) {
      prev = null;
      continue;
    }
    lastSession = prev && prev.categoryId === e.categoryId && e.startMs <= prev.endMs ? lastSession + min : min;
    prev = { categoryId: e.categoryId, endMs: e.endMs };
  }

  const triggerWeek: Record<string, number> = {};
  for (const t of triggers) {
    triggerWeek[t] = all.filter((e) => e.trigger === t && e.value === "waste" && e.planned !== true).length;
  }

  const past = hist.history.slice(0, -1);
  const outs = pastOutcomes(past);
  const metPast = outs.filter((o) => o.met).length;
  const todayMet = s.studyMin >= goalMin;
  const lastOut = outs.at(-1);
  let missedInRow = 0;
  for (let i = outs.length - 1; i >= 0 && !outs[i].met && !outs[i].frozen; i--) missedInRow += 1;
  const streakDays = (lastOut?.streak ?? 0) + (todayMet ? 1 : 0);
  const yesterday = past.at(-1);

  const track = onTrack(s.studyMin, goalMin, restOfDaySamples(hist.history, day, nowMs, hist.study));
  const blocks = buildBlocks(
    todays.map((e) => ({ id: e.id, categoryId: e.categoryId, startMs: e.startMs, endMs: e.endMs, source: "" })),
    day,
    nowMs,
  );
  const gaps = blocks.filter((b) => b.type === "gap" && !b.open);
  const local = localParts(nowMs, tz);

  return {
    triggerWeek,
    facts: {
      nowMs,
      localHour: local.hour + local.minute / 60,
      hoursIntoDay: (nowMs - day.startMs) / (60 * MIN),
      studyMin: s.studyMin,
      studyBeforeMin: Math.max(0, s.studyMin - studyAddedMin),
      goalMin,
      freeLeftMin: s.freeLeftMin,
      wasted: { totalMin: s.wastedMin, sessions: s.wastedSessions, lastSessionMin: lastSession },
      streak: {
        days: streakDays,
        freezes: lastOut?.freezes ?? 0,
        bestBefore: outs.reduce((m, o) => Math.max(m, o.streak), 0),
        todayMet,
        earnedFreezeToday: todayMet && (metPast + 1) % FREEZE_EVERY === 0,
        missedInRow,
        yesterday: yesterday && lastOut ? { studyMin: yesterday.studyMin, goalMin: yesterday.goalMin, frozen: lastOut.frozen } : null,
      },
      onTrack: track?.state ?? null,
      trackedPct: s.trackedPct,
      unknownBlocks: gaps.length,
      unknownMin: s.unknownMin,
    },
  };
}
