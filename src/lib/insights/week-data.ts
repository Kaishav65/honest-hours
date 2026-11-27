import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryKind } from "@/lib/checkin/types";
import { dayOf } from "@/lib/time";
import { computeWeek, HISTORY_WEEKS, weekOf, type WEntry } from "./weekly";

const PAGE = 1000; // PostgREST returns at most 1000 rows per request
const DAY = 24 * 60 * 60_000;

type Profile = { timezone: string; day_start_hour: number; weekday_goal_min: number; weekend_goal_min: number };

/** Loads the entries of a week plus 8 weeks of history and runs `computeWeek` for it. `offsetWeeks`: 0 = this week, -1 = last week. */
export async function loadWeek(supabase: SupabaseClient, profile: Profile, nowMs: number, offsetWeeks: number) {
  const tz = profile.timezone;
  const startHour = profile.day_start_hour;
  const today = dayOf(nowMs, tz, startHour);
  const days = weekOf(today, offsetWeeks, tz, startHour);
  const weekStart = days[0].startMs;
  const weekEnd = days[6].endMs;
  const from = weekStart - HISTORY_WEEKS * 7 * DAY;

  const [cats, logs, pomos] = await Promise.all([
    supabase.from("categories").select("id, kind, value"),
    supabase
      .from("day_logs")
      .select("day, study_goal_min, planned_study_min")
      .gte("day", days[0].date)
      .lte("day", days[6].date),
    supabase
      .from("pomodoros")
      .select("started_at, completed")
      .not("ended_at", "is", null)
      .gte("started_at", new Date(weekStart).toISOString())
      .lt("started_at", new Date(weekEnd).toISOString()),
  ]);
  const byId = new Map((cats.data ?? []).map((c) => [c.id as string, c]));

  const entries: WEntry[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await supabase
      .from("entries")
      .select("category_id, start_at, end_at, planned, trigger, focus, phone_checks")
      .gt("end_at", new Date(from).toISOString())
      .lt("start_at", new Date(weekEnd).toISOString())
      .order("start_at")
      .range(offset, offset + PAGE - 1);
    if (!data) break;
    for (const r of data) {
      const c = byId.get(r.category_id);
      if (!c) continue;
      entries.push({
        categoryId: r.category_id,
        kind: c.kind as CategoryKind,
        value: c.value as WEntry["value"],
        startMs: Date.parse(r.start_at),
        endMs: Date.parse(r.end_at),
        planned: r.planned,
        trigger: r.trigger,
        focus: r.focus,
        phoneChecks: r.phone_checks,
      });
    }
    if (data.length < PAGE) break;
  }

  const logByDate = new Map((logs.data ?? []).map((l) => [l.day as string, l]));
  const goalByDate: Record<string, number> = {};
  const plannedByDate: Record<string, number | null> = {};
  for (const d of days) {
    const l = logByDate.get(d.date);
    goalByDate[d.date] = l?.study_goal_min ?? (d.dayType === "weekend" ? profile.weekend_goal_min : profile.weekday_goal_min);
    plannedByDate[d.date] = l?.planned_study_min ?? null;
  }

  const week = computeWeek({
    days,
    nowMs,
    timeZone: tz,
    dayStartHour: startHour,
    entries,
    goalByDate,
    plannedByDate,
    pomodoros: (pomos.data ?? []).map((p) => ({ startedMs: Date.parse(p.started_at), completed: p.completed === true })),
    sleepStarts: entries.filter((e) => e.kind === "sleep").map((e) => e.startMs),
  });
  return { week, days, today };
}
