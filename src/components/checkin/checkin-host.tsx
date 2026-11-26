import { connection } from "next/server";
import { fieldsToAnswers } from "@/lib/checkin/answers";
import { parseRoutineItems } from "@/lib/checkin/office";
import { computeStreak } from "@/lib/insights/streak";
import { loadStudyHistory } from "@/lib/insights/study-history";
import type { Answers, Category, CategoryKind, EntryAnswerFields, Question, QuestionType, SystemKey } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/server";
import type { BusyPreset } from "./busy-modal";
import { CheckinController } from "./checkin-controller";

// Loads what the check-in popup needs (profile, categories, questions, recent entries) on the server.
export async function CheckinHost() {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const [profile, cats, qs, recent, routines] = await Promise.all([
    supabase.from("profiles").select(
        "timezone, day_start_hour, checkin_interval_min, status, status_since, status_until, status_label, weekday_goal_min, weekend_goal_min, settings",
      ).eq("id", userId).single(),
    supabase.from("categories").select("id, name, icon, kind").eq("archived", false).order("sort_order"),
    supabase
      .from("category_questions")
      .select("id, category_id, label, type, options, system_key")
      .eq("archived", false)
      .order("sort_order"),
    supabase
      .from("entries")
      .select("category_id, end_at, planned, trigger, focus, phone_checks, mood_after, answers")
      .order("end_at", { ascending: false })
      .limit(150),
    supabase.from("routines").select("name, items").order("sort_order").limit(1),
  ]);
  if (!profile.data || !cats.data || !qs.data || !recent.data) return null;
  // Rendered per request (after connection()), so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const { history } = await loadStudyHistory(supabase, profile.data, Date.now());
  const { streak, freezes } = computeStreak(history);
  const routineRow = routines.data?.[0];
  const routine = routineRow ? { name: routineRow.name, items: parseRoutineItems(routineRow.items) } : null;

  const categories: Category[] = cats.data.map((c) => ({ ...c, kind: c.kind as CategoryKind }));
  const questions: Question[] = qs.data.map((q) => ({
    id: q.id,
    categoryId: q.category_id,
    label: q.label,
    type: q.type as QuestionType,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    systemKey: q.system_key as SystemKey | null,
  }));

  // Most recent answers per category, newest entry wins.
  const lastAnswers: Record<string, Answers> = {};
  for (const e of recent.data) {
    if (lastAnswers[e.category_id]) continue;
    lastAnswers[e.category_id] = fieldsToAnswers(
      questions.filter((q) => q.categoryId === e.category_id),
      e as EntryAnswerFields,
    );
  }
  const newest = recent.data[0];

  const rawPresets = (profile.data.settings as { busy_presets?: unknown } | null)?.busy_presets;
  const busyPresets: BusyPreset[] = Array.isArray(rawPresets)
    ? rawPresets.filter(
        (p): p is BusyPreset => typeof p?.label === "string" && typeof p?.minutes === "number" && p.minutes > 0,
      )
    : [];

  return (
    <CheckinController
      userId={userId}
      timeZone={profile.data.timezone}
      dayStartHour={profile.data.day_start_hour}
      intervalMin={profile.data.checkin_interval_min}
      status={profile.data.status}
      statusSinceMs={profile.data.status_since ? Date.parse(profile.data.status_since) : null}
      statusUntilMs={profile.data.status_until ? Date.parse(profile.data.status_until) : null}
      statusLabel={profile.data.status_label}
      weekdayGoalMin={profile.data.weekday_goal_min}
      weekendGoalMin={profile.data.weekend_goal_min}
      busyPresets={busyPresets}
      settings={profile.data.settings}
      routine={routine && routine.items.length > 0 ? routine : null}
      categories={categories}
      questions={questions}
      lastEndMs={newest ? Date.parse(newest.end_at) : null}
      lastEntry={newest ? { categoryId: newest.category_id, answers: lastAnswers[newest.category_id] } : null}
      lastAnswers={lastAnswers}
      streak={{ days: streak, freezes }}
    />
  );
}
