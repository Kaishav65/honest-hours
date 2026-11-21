import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SettingsView } from "@/components/settings/settings-view";
import type { SettingsCategory, SettingsQuestion } from "@/components/settings/types";
import type { CategoryKind, QuestionType, SystemKey } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/server";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsData />
    </Suspense>
  );
}

async function SettingsData() {
  await connection(); // per-user: render at request time, never prerender
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const [profile, cats, qs] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, timezone, day_start_hour, checkin_interval_min, weekday_goal_min, weekend_goal_min, settings")
      .eq("id", userId)
      .single(),
    supabase.from("categories").select("id, name, icon, kind, value, sort_order, archived").order("sort_order"),
    supabase
      .from("category_questions")
      .select("id, category_id, label, type, options, system_key, sort_order, archived")
      .order("sort_order"),
  ]);
  if (!profile.data || !cats.data || !qs.data) return null;
  const p = profile.data;

  const categories: SettingsCategory[] = cats.data.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    kind: c.kind as CategoryKind,
    value: c.value as SettingsCategory["value"],
    sortOrder: c.sort_order,
    archived: c.archived,
  }));
  const questions: SettingsQuestion[] = qs.data.map((q) => ({
    id: q.id,
    categoryId: q.category_id,
    label: q.label,
    type: q.type as QuestionType,
    options: Array.isArray(q.options) ? (q.options as string[]) : null,
    systemKey: q.system_key as SystemKey | null,
    sortOrder: q.sort_order,
    archived: q.archived,
  }));

  return (
    <SettingsView
      profile={{
        id: userId,
        displayName: p.display_name,
        email: String(claims?.claims.email ?? ""),
        timezone: p.timezone,
        dayStartHour: p.day_start_hour,
        checkinIntervalMin: p.checkin_interval_min,
        weekdayGoalMin: p.weekday_goal_min,
        weekendGoalMin: p.weekend_goal_min,
        settings: (p.settings ?? {}) as Record<string, unknown>,
      }}
      categories={categories}
      questions={questions}
    />
  );
}

export const metadata: Metadata = { title: "Settings · Honest Hours" };
