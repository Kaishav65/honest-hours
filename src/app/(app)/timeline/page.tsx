import { connection } from "next/server";
import { Suspense } from "react";
import { fieldsToAnswers } from "@/lib/checkin/answers";
import type { Category, CategoryKind, EntryAnswerFields, Question, QuestionType, SystemKey } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/server";
import { dayForDate, dayOf } from "@/lib/time";
import { TimelineView } from "@/components/timeline/timeline-view";

export default function TimelinePage({ searchParams }: PageProps<"/timeline">) {
  return (
    <Suspense>
      <TimelineData searchParams={searchParams} />
    </Suspense>
  );
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function TimelineData({ searchParams }: { searchParams: PageProps<"/timeline">["searchParams"] }) {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const raw = (await searchParams).date;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("timezone, day_start_hour").eq("id", userId).single();
  if (!profile) return null;
  const tz = profile.timezone;
  const startHour = profile.day_start_hour;

  // Server component rendered per request (after connection()), so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const today = dayOf(nowMs, tz, startHour);
  // Only valid days up to today: the future has nothing to show.
  const asked = typeof raw === "string" && DATE.test(raw) && raw <= today.date ? raw : today.date;
  const day = dayForDate(asked, tz, startHour);

  const [cats, qs, rows] = await Promise.all([
    supabase.from("categories").select("id, name, icon, kind").order("sort_order"),
    supabase.from("category_questions").select("id, category_id, label, type, options, system_key").eq("archived", false).order("sort_order"),
    supabase
      .from("entries")
      .select("id, category_id, start_at, end_at, source, planned, trigger, focus, phone_checks, mood_after, answers")
      .lt("start_at", new Date(day.endMs).toISOString())
      .gt("end_at", new Date(day.startMs).toISOString())
      .order("start_at"),
  ]);
  if (!cats.data || !qs.data || !rows.data) return null;

  const categories: Category[] = cats.data.map((c) => ({ ...c, kind: c.kind as CategoryKind }));
  const questions: Question[] = qs.data.map((q) => ({
    id: q.id,
    categoryId: q.category_id,
    label: q.label,
    type: q.type as QuestionType,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    systemKey: q.system_key as SystemKey | null,
  }));
  const entries = rows.data.map((e) => ({
    id: e.id,
    categoryId: e.category_id,
    startMs: Date.parse(e.start_at),
    endMs: Date.parse(e.end_at),
    source: e.source,
    answers: fieldsToAnswers(
      questions.filter((q) => q.categoryId === e.category_id),
      e as EntryAnswerFields,
    ),
  }));

  const isToday = day.date === today.date;
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    Date.parse(`${day.date}T00:00:00Z`),
  );

  return (
    <TimelineView
      day={day}
      prevDate={dayOf(day.startMs - 1, tz, startHour).date}
      nextDate={isToday ? null : dayOf(day.endMs, tz, startHour).date}
      todayDate={today.date}
      label={isToday ? `Today · ${weekday}` : weekday}
      nowMs={nowMs}
      timeZone={tz}
      dayStartHour={startHour}
      entries={entries}
      categories={categories}
      questions={questions}
    />
  );
}
