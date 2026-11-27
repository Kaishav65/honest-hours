"use client";

import { Check, Flame, Snowflake } from "lucide-react";
import { useState } from "react";
import { missingSnapshots } from "@/lib/insights/goal-snapshots";
import { FREEZE_EVERY, MAX_FREEZES } from "@/lib/insights/streak";
import { createClient } from "@/lib/supabase/client";
import type { SettingsProfile } from "./types";

type Props = { profile: SettingsProfile; onChanged: () => void };

// Daily study goals (they drive the streak) and the freeze rules.
export function StreakTab({ profile, onChanged }: Props) {
  const [weekdayGoal, setWeekdayGoal] = useState(String(profile.weekdayGoalMin / 60));
  const [weekendGoal, setWeekendGoal] = useState(String(profile.weekendGoalMin / 60));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toMin = (v: string) => Math.round(Number(v) * 60);
  const goalOk = (v: string) => v.trim() !== "" && toMin(v) >= 0 && toMin(v) <= 1440;
  const valid = goalOk(weekdayGoal) && goalOk(weekendGoal);

  async function save() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const wd = toMin(weekdayGoal);
    const we = toMin(weekendGoal);
    if (wd !== profile.weekdayGoalMin || we !== profile.weekendGoalMin) {
      // A day without a saved goal is judged by the current goal, so give every past day its old goal first.
      const [first, logs] = await Promise.all([
        supabase.from("entries").select("start_at").order("start_at").limit(1).maybeSingle(),
        supabase.from("day_logs").select("day"),
      ]);
      if (first.error || logs.error) {
        setBusy(false);
        return setMsg({ ok: false, text: "Couldn't save. Check your connection and try again." });
      }
      if (first.data) {
        const rows = missingSnapshots({
          firstEntryMs: Date.parse(first.data.start_at),
          nowMs: Date.now(),
          existingDays: (logs.data ?? []).map((l) => l.day as string),
          timeZone: profile.timezone,
          dayStartHour: profile.dayStartHour,
          weekdayGoalMin: profile.weekdayGoalMin,
          weekendGoalMin: profile.weekendGoalMin,
        });
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase.from("day_logs").insert(rows.slice(i, i + 500));
          if (error) {
            setBusy(false);
            return setMsg({ ok: false, text: "Couldn't keep your past goals safe, so nothing was changed. Try again." });
          }
        }
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ weekday_goal_min: wd, weekend_goal_min: we })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Couldn't save. Check your connection and try again." });
    setMsg({ ok: true, text: "Saved." });
    onChanged();
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-5)", maxWidth: "46rem" }}>
      <div className="row" style={{ gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="field">
          <label htmlFor="goal-wd">Weekday study goal (hours)</label>
          <input id="goal-wd" className="input" style={{ width: "8rem" }} type="number" min={0} max={24} step={0.25} value={weekdayGoal} onChange={(e) => setWeekdayGoal(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="goal-we">Weekend study goal (hours)</label>
          <input id="goal-we" className="input" style={{ width: "8rem" }} type="number" min={0} max={24} step={0.25} value={weekendGoal} onChange={(e) => setWeekendGoal(e.target.value)} />
        </div>
        <span className="help" style={{ alignSelf: "center", maxWidth: "18rem" }}>
          Past days keep the goal they had. Start low and raise it as it gets easy.
        </span>
      </div>

      <div className="card" style={{ gap: ".6rem" }}>
        <h2 className="card-title">How the streak works</h2>
        <p className="sm">
          <Flame className="lucide" aria-hidden style={{ verticalAlign: "-.15em" }} /> A day counts when you study at least that day&apos;s goal.
          Today joins the streak once its goal is met.
        </p>
        <p className="sm">
          <Snowflake className="lucide" aria-hidden style={{ verticalAlign: "-.15em" }} /> Every {FREEZE_EVERY} goal days earn 1 freeze (you can
          keep {MAX_FREEZES}). A missed day uses a saved freeze automatically, so the streak survives. No freeze, the streak resets.
        </p>
      </div>

      <div className="row">
        <button className="btn btn-primary" onClick={save} disabled={busy || !valid}>
          <Check className="lucide" aria-hidden /> {busy ? "Saving…" : "Save"}
        </button>
        {msg && (
          <span className="sm" role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--success)" : "var(--danger)" }}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
