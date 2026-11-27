import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/shell/page-loading";
import { FocusView, type Session, type Subject } from "@/components/focus/focus-view";
import { createClient } from "@/lib/supabase/server";
import { dayOf } from "@/lib/time";

export default function FocusPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <FocusData />
    </Suspense>
  );
}

async function FocusData() {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("timezone, day_start_hour").eq("id", userId).single();
  if (!profile) return null;
  // Rendered per request (after connection()), so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const day = dayOf(Date.now(), profile.timezone, profile.day_start_hour);

  const [subjects, pomos, lastPomo] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("archived", false).order("created_at"),
    supabase
      .from("pomodoros")
      .select("id, subject_id, started_at, ended_at, planned_min, completed, entry_id")
      .gte("started_at", new Date(day.startMs).toISOString())
      .lt("started_at", new Date(day.endMs).toISOString())
      .order("started_at"),
    supabase.from("pomodoros").select("subject_id").order("started_at", { ascending: false }).limit(1),
  ]);
  if (!subjects.data || !pomos.data) return null;

  const entryIds = pomos.data.flatMap((p) => (p.entry_id ? [p.entry_id] : []));
  const entries = entryIds.length
    ? ((await supabase.from("entries").select("id, focus, phone_checks").in("id", entryIds)).data ?? [])
    : [];
  const byEntry = new Map(entries.map((e) => [e.id, e]));
  const nameById = new Map(subjects.data.map((s) => [s.id, s.name]));

  const sessions: Session[] = pomos.data.map((p) => {
    const e = p.entry_id ? byEntry.get(p.entry_id) : undefined;
    return {
      id: p.id,
      subject: p.subject_id ? (nameById.get(p.subject_id) ?? "Archived subject") : "No subject",
      startMs: Date.parse(p.started_at),
      endMs: p.ended_at ? Date.parse(p.ended_at) : null,
      plannedMin: p.planned_min,
      completed: p.completed,
      focus: e?.focus ?? null,
      phoneChecks: e?.phone_checks ?? null,
    };
  });

  return (
    <FocusView
      subjects={subjects.data as Subject[]}
      sessions={sessions}
      lastSubjectId={lastPomo.data?.[0]?.subject_id ?? null}
      timeZone={profile.timezone}
    />
  );
}

export const metadata: Metadata = { title: "Focus · Honest Hours" };
