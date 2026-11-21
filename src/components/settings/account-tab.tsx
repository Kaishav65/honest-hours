"use client";

import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SettingsProfile } from "./types";

type Msg = { ok: boolean; text: string } | null;
const color = (m: NonNullable<Msg>) => (m.ok ? "var(--success)" : "var(--danger)");

function applyTheme(choice: "light" | "dark" | "system") {
  localStorage.setItem("hh-theme", choice);
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

type Props = { profile: SettingsProfile; onChanged: () => void };

export function AccountTab({ profile, onChanged }: Props) {
  const [name, setName] = useState(profile.displayName);
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<"name" | "pw" | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof localStorage === "undefined") return "light";
    const t = localStorage.getItem("hh-theme");
    return t === "dark" || t === "system" ? t : "light";
  });

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 20) return setNameMsg({ ok: false, text: "Use 1 to 20 characters." });
    setBusy("name");
    setNameMsg(null);
    const { error } = await createClient().from("profiles").update({ display_name: trimmed }).eq("id", profile.id);
    setBusy(null);
    if (error) return setNameMsg({ ok: false, text: "Couldn't save. Check your connection and try again." });
    setNameMsg({ ok: true, text: "Saved." });
    onChanged();
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setPwMsg({ ok: false, text: "The new password must be at least 8 characters." });
    setBusy("pw");
    setPwMsg(null);
    const supabase = createClient();
    // Prove it's you: sign in again with the current password, then change it.
    const check = await supabase.auth.signInWithPassword({ email: profile.email, password: current });
    if (check.error) {
      setBusy(null);
      return setPwMsg({ ok: false, text: "Your current password isn't right." });
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(null);
    if (error) {
      return setPwMsg({
        ok: false,
        text: error.code === "same_password" ? "Pick a password different from the current one." : error.code === "weak_password" ? "That password is too weak. Use a longer one." : "Couldn't change the password. Try again.",
      });
    }
    setCurrent("");
    setNext("");
    setPwMsg({ ok: true, text: "Password changed." });
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "30rem" }}>
      <form onSubmit={saveName} style={{ display: "grid", gap: "var(--space-2)" }}>
        <div className="field">
          <label htmlFor="acc-name">What should we call you?</label>
          <input id="acc-name" className="input" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
          <span className="help">Shown in your greeting and the sidebar. Signed in as {profile.email} · {profile.timezone}</span>
        </div>
        <div className="row">
          <button className="btn btn-primary btn-sm" disabled={busy !== null || name.trim() === profile.displayName || !name.trim()}>
            <Check className="lucide" aria-hidden /> Save name
          </button>
          {nameMsg && <span className="sm" role="status" style={{ color: color(nameMsg) }}>{nameMsg.text}</span>}
        </div>
      </form>

      <form onSubmit={savePassword} style={{ display: "grid", gap: "var(--space-3)" }}>
        <h2 className="card-title">Change password</h2>
        <div className="field">
          <label htmlFor="acc-cur">Current password</label>
          <input id="acc-cur" className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="acc-new">New password</label>
          <input id="acc-new" className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <span className="help">At least 8 characters.</span>
        </div>
        <div className="row">
          <button className="btn btn-primary btn-sm" disabled={busy !== null || !current || !next}>
            {busy === "pw" ? "Changing…" : "Change password"}
          </button>
          {pwMsg && <span className="sm" role="status" style={{ color: color(pwMsg) }}>{pwMsg.text}</span>}
        </div>
      </form>

      <div className="field">
        <label>Theme</label>
        <div className="seg" role="group" aria-label="Theme">
          {(["light", "dark", "system"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => { setTheme(t); applyTheme(t); }}>
              {t === "system" ? "Match my computer" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
