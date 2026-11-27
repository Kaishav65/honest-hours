"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountTab } from "./account-tab";
import { CategoriesTab } from "./categories-tab";
import { CoachTab } from "./coach-tab";
import { PresetsTab } from "./presets-tab";
import { ScheduleTab } from "./schedule-tab";
import { StreakTab } from "./streak-tab";
import type { SettingsCategory, SettingsProfile, SettingsQuestion } from "./types";

const TABS = [
  { id: "categories", label: "Categories & questions" },
  { id: "schedule", label: "Popups & schedule" },
  { id: "presets", label: "Busy presets" },
  { id: "streak", label: "Streak & goals" },
  { id: "coach", label: "Coach" },
  { id: "account", label: "Account" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = { profile: SettingsProfile; categories: SettingsCategory[]; questions: SettingsQuestion[] };

export function SettingsView({ profile, categories, questions }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("categories");
  // Re-read from the server after every save so the check-in popup and other pages see the change.
  const refresh = () => router.refresh();

  return (
    <section className="page" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 className="display" style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
        Settings
      </h1>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="scroll" style={{ flex: 1, paddingBottom: "var(--space-4)" }}>
        {tab === "categories" && <CategoriesTab categories={categories} questions={questions} onChanged={refresh} />}
        {tab === "schedule" && <ScheduleTab profile={profile} onChanged={refresh} />}
        {tab === "presets" && <PresetsTab profile={profile} onChanged={refresh} />}
        {tab === "streak" && <StreakTab profile={profile} onChanged={refresh} />}
        {tab === "coach" && <CoachTab profile={profile} onChanged={refresh} />}
        {tab === "account" && <AccountTab profile={profile} onChanged={refresh} />}
      </div>
    </section>
  );
}
