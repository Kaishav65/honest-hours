"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusyPresetRow, SettingsProfile } from "./types";

function readPresets(settings: Record<string, unknown>): BusyPresetRow[] {
  const raw = settings.busy_presets;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is BusyPresetRow => typeof p?.label === "string" && typeof p?.minutes === "number" && p.minutes > 0);
}

type Props = { profile: SettingsProfile; onChanged: () => void };

// Busy presets: one-tap choices in the Busy popup ("Interview · 1 h").
export function PresetsTab({ profile, onChanged }: Props) {
  const [rows, setRows] = useState(() => readPresets(profile.settings));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const valid = rows.every((r) => r.label.trim() && Number.isFinite(r.minutes) && r.minutes >= 5 && r.minutes <= 1440);
  const patch = (i: number, p: Partial<BusyPresetRow>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...p } : r)));

  async function save() {
    setBusy(true);
    setMsg(null);
    const cleaned = rows.map((r) => ({ label: r.label.trim(), minutes: Math.round(r.minutes) }));
    const { error } = await createClient()
      .from("profiles")
      .update({ settings: { ...profile.settings, busy_presets: cleaned } })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Couldn't save. Check your connection and try again." });
    setMsg({ ok: true, text: "Saved." });
    onChanged();
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: "36rem" }}>
      <p className="sm muted">Shortcuts shown when you tap Busy, next to 30 min / 1 h / 2 h.</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".5rem" }}>
        {rows.map((r, i) => (
          <li key={i} className="row" style={{ gap: ".5rem" }}>
            <input className="input" style={{ flex: 1 }} maxLength={30} aria-label="Preset name" value={r.label} onChange={(e) => patch(i, { label: e.target.value })} />
            <input className="input" style={{ width: "6rem" }} type="number" min={5} max={1440} step={5} aria-label="Minutes" value={Number.isFinite(r.minutes) ? r.minutes : ""} onChange={(e) => patch(i, { minutes: e.target.value === "" ? NaN : Number(e.target.value) })} />
            <span className="sm muted">min</span>
            <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Remove ${r.label || "preset"}`} onClick={() => setRows((all) => all.filter((_, j) => j !== i))}>
              <X className="lucide" aria-hidden />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="sm muted">No presets yet.</li>}
      </ul>
      <div className="row">
        <button className="btn btn-secondary btn-sm" onClick={() => setRows((all) => [...all, { label: "", minutes: 60 }])} disabled={rows.length >= 10}>
          <Plus className="lucide" aria-hidden /> Add preset
        </button>
        <span className="spacer" />
        {msg && (
          <span className="sm" role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--success)" : "var(--danger)" }}>
            {msg.text}
          </span>
        )}
        <button className="btn btn-primary" onClick={save} disabled={busy || !valid}>
          <Check className="lucide" aria-hidden /> {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
