import type { createClient } from "@/lib/supabase/server";
import { dayOf } from "@/lib/time";
import { daysBetween, minutesIn, type StudyDay } from "./streak";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Profile = { timezone: string; day_start_hour: number; weekday_goal_min: number; weekend_goal_min: number };
const PAGE = 1000; // PostgREST returns at most 1000 rows per request

/**
 * Study minutes and goal for every tracked day from the first entry to today (today counted up to now),
 * plus the raw study spans, for the streak and the on-track check. Archived study categories still count.
 * A day's goal is its day_logs snapshot, or the current weekday/weekend goal when it has no row.
 */
export async function loadStudyHistory(supabase: Supabase, profile: Profile, nowMs: number) {
  const tz = profile.timezone;
  const today = dayOf(nowMs, tz, profile.day_start_hour);
  const [first, cats, logs] = await Promise.all([
    supabase.from("entries").select("start_at").order("start_at").limit(1).maybeSingle(),
    supabase.from("categories").select("id").eq("kind", "study"),
    supabase.from("day_logs").select("day, study_goal_min"),
  ]);
  if (!first.data || !cats.data?.length) return { history: [] as StudyDay[], study: [], today };

  const study: { startMs: number; endMs: number }[] = [];
  const ids = cats.data.map((c) => c.id);
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("entries")
      .select("start_at, end_at")
      .in("category_id", ids)
      .order("start_at")
      .range(from, from + PAGE - 1);
    if (!data) break;
    study.push(...data.map((e) => ({ startMs: Date.parse(e.start_at), endMs: Date.parse(e.end_at) })));
    if (data.length < PAGE) break;
  }

  const goals = new Map((logs.data ?? []).map((l) => [l.day, l.study_goal_min]));
  const history: StudyDay[] = daysBetween(Date.parse(first.data.start_at), today, tz, profile.day_start_hour).map(
    (day) => ({
      day,
      studyMin: minutesIn(study, day.startMs, Math.min(day.endMs, nowMs)),
      goalMin: goals.get(day.date) ?? (day.dayType === "weekend" ? profile.weekend_goal_min : profile.weekday_goal_min),
    }),
  );
  return { history, study, today };
}
