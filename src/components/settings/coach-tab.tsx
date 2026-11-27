"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { fill, variantsFor, type Strictness } from "@/lib/coach/templates";
import { createClient } from "@/lib/supabase/client";
import type { SettingsProfile } from "./types";

const LEVELS: { id: Strictness; label: string; hint: string }[] = [
  { id: "gentle", label: "Gentle", hint: "Soft nudges. No pressure." },
  { id: "balanced", label: "Balanced", hint: "Honest, with a way back. The default." },
  { id: "strict", label: "Strict", hint: "Direct. Holds you to what you said." },
];

// The same situation worded at each level, so the choice is easy to judge.
const SAMPLE = { total: "55m", pomos: 2, pomo_min: "25m" };
const example = (level: Strictness) => fill(variantsFor("drift_2", level)[0], SAMPLE);

type Props = { profile: SettingsProfile; onChanged: () => void };

export function CoachTab({ profile, onChanged }: Props) {
  const [level, setLevel] = useState<Strictness>(profile.coachStrictness);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().from("profiles").update({ coach_strictness: level }).eq("id", profile.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Couldn't save. Check your connection and try again." });
    setMsg({ ok: true, text: "Saved." });
    onChanged();
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-5)", maxWidth: "46rem" }}>
      <div className="field">
        <label>How direct should the coach be?</label>
        <div className="seg" role="group" aria-label="Coach strictness">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <span className="help">{LEVELS.find((l) => l.id === level)?.hint}</span>
      </div>

      <div className="card" style={{ gap: ".6rem" }}>
        <h2 className="card-title">Same moment, three tones</h2>
        <p className="xs muted">Your second unplanned session of the day, 55 minutes lost:</p>
        {LEVELS.map((l) => (
          <div key={l.id} className="sm" data-testid={`example-${l.id}`} style={{ opacity: level === l.id ? 1 : 0.55, fontWeight: level === l.id ? 600 : 400 }}>
            <span className="overline" style={{ marginRight: ".5rem" }}>{l.label}</span>
            {example(l.id)}
          </div>
        ))}
      </div>

      <div className="row">
        <button className="btn btn-primary" onClick={save} disabled={busy || level === profile.coachStrictness}>
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
