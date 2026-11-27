"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DaySchedule, SettingsProfile } from "./types";

const DEFAULT_WEEKDAY: DaySchedule = { office: true, office_start: "10:00", office_end: "18:00", office_checkin_min: 120 };
const DEFAULT_WEEKEND: DaySchedule = { office: false, office_start: "10:00", office_end: "18:00", office_checkin_min: 120 };

function readDay(settings: Record<string, unknown>, day: "weekday" | "weekend"): DaySchedule {
  const raw = (settings.schedule as Record<string, Partial<DaySchedule>> | undefined)?.[day] ?? {};
  const base = day === "weekday" ? DEFAULT_WEEKDAY : DEFAULT_WEEKEND;
  return {
    office: raw.office ?? base.office,
    office_start: raw.office_start ?? base.office_start,
    office_end: raw.office_end ?? base.office_end,
    office_checkin_min: raw.office_checkin_min ?? base.office_checkin_min,
  };
}

const INTERVALS = [15, 30, 45, 60];
const OFFICE_EVERY = [60, 90, 120, 180];
const hourLabel = (h: number) => (h === 0 ? "12:00 AM (midnight)" : h === 12 ? "12:00 PM (noon)" : `${h}:00 AM`);

type Props = { profile: SettingsProfile; onChanged: () => void };

export function ScheduleTab({ profile, onChanged }: Props) {
  const [interval, setInterval] = useState(profile.checkinIntervalMin);
  const [dayStart, setDayStart] = useState(profile.dayStartHour);
  const [weekday, setWeekday] = useState(readDay(profile.settings, "weekday"));
  const [weekend, setWeekend] = useState(readDay(profile.settings, "weekend"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const officeOk = (d: DaySchedule) => !d.office || (d.office_start < d.office_end && d.office_start !== "" && d.office_end !== "");
  const valid = officeOk(weekday) && officeOk(weekend);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await createClient()
      .from("profiles")
      .update({
        checkin_interval_min: interval,
        day_start_hour: dayStart,
        settings: { ...profile.settings, schedule: { weekday, weekend } },
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Couldn't save. Check your connection and try again." });
    setMsg({ ok: true, text: "Saved." });
    onChanged();
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-5)", maxWidth: "46rem" }}>
      <div className="field">
        <label>Check-in popup every</label>
        <div className="seg" role="group" aria-label="Check-in interval">
          {INTERVALS.map((m) => (
            <button key={m} type="button" aria-pressed={interval === m} onClick={() => setInterval(m)}>
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="day-start">Your day starts at</label>
        <select id="day-start" className="input" style={{ width: "14rem" }} value={dayStart} onChange={(e) => setDayStart(Number(e.target.value))}>
          {Array.from({ length: 13 }, (_, h) => (
            <option key={h} value={h}>{hourLabel(h)}</option>
          ))}
        </select>
        <span className="help">Time before this still counts towards the evening before (study at 1 AM belongs to yesterday).</span>
      </div>

      <OfficeBlock title="Weekdays (Mon–Fri)" id="wd" value={weekday} onChange={setWeekday} />
      <OfficeBlock title="Weekends (Sat–Sun)" id="we" value={weekend} onChange={setWeekend} />

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

function OfficeBlock({ title, id, value, onChange }: { title: string; id: string; value: DaySchedule; onChange: (v: DaySchedule) => void }) {
  const set = (patch: Partial<DaySchedule>) => onChange({ ...value, ...patch });
  return (
    <div className="card" style={{ gap: "var(--space-3)" }}>
      <label className="row" style={{ cursor: "pointer" }}>
        <input type="checkbox" className="switch" checked={value.office} onChange={(e) => set({ office: e.target.checked })} aria-label={`Office hours on ${title}`} />
        <span className="card-title">{title}</span>
        <span className="sm muted">Office hours</span>
      </label>
      {value.office && (
        <div className="row" style={{ gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="field">
            <label htmlFor={`${id}-from`}>From</label>
            <input id={`${id}-from`} type="time" className="input" style={{ width: "9rem" }} value={value.office_start} onChange={(e) => set({ office_start: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor={`${id}-to`}>To</label>
            <input id={`${id}-to`} type="time" className="input" style={{ width: "9rem" }} value={value.office_end} onChange={(e) => set({ office_end: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor={`${id}-every`}>Popup every</label>
            <select id={`${id}-every`} className="input" style={{ width: "9rem" }} value={value.office_checkin_min} onChange={(e) => set({ office_checkin_min: Number(e.target.value) })}>
              {OFFICE_EVERY.map((m) => (
                <option key={m} value={m}>{m % 60 === 0 ? `${m / 60} h` : `${m} min`}</option>
              ))}
            </select>
          </div>
          {value.office_start >= value.office_end && <p className="sm" style={{ color: "var(--danger)", alignSelf: "center" }}>End must be after the start.</p>}
        </div>
      )}
      {!value.office && <p className="sm muted">No office: the normal popup interval applies all day.</p>}
    </div>
  );
}
