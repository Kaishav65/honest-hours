"use client";

import { Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clockOf } from "@/lib/checkin/status";
import { formatClock } from "@/lib/checkin/store";
import { dayOf } from "@/lib/time";

export type WakeInput = {
  quality: number | null;
  planMin: number | null;
  sleepClock: string | null;
  /** Only after a gap (see `gapSinceMs`): when you woke. Otherwise you woke now. */
  wakeClock: string | null;
};

type Props = {
  timeZone: string;
  sleepSinceMs: number;
  /** True when the app went quiet by itself: we don't know when sleep started, so ask. */
  askSleepTime: boolean;
  /**
   * Set when the app opens on a new day with nothing logged since this time (no "Going to sleep" tap):
   * asks when you slept and woke, and offers Skip (start tracking from now).
   */
  gapSinceMs?: number;
  onSkip?: () => void;
  dayStartHour: number;
  weekdayGoalMin: number;
  weekendGoalMin: number;
  onSubmit: (input: WakeInput) => Promise<string | null>;
};

const PLAN_OPTIONS = [0, 60, 120, 180, 240, 300];
const planLabel = (m: number) => (m === 0 ? "None" : m % 60 ? `${m} min` : `${m / 60}h`);

// "I'm awake": sleep quality + today's study plan (and, after an automatic quiet night, when you slept).
export function WakeModal({
  timeZone,
  sleepSinceMs,
  askSleepTime,
  gapSinceMs,
  onSkip,
  dayStartHour,
  weekdayGoalMin,
  weekendGoalMin,
  onSubmit,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [quality, setQuality] = useState<number | null>(null);
  // Prefill the plan with today's goal (weekday or weekend).
  const [goalMin] = useState(() =>
    dayOf(Date.now(), timeZone, dayStartHour).dayType === "weekend" ? weekendGoalMin : weekdayGoalMin,
  );
  const [plan, setPlan] = useState<number | null>(goalMin);
  const gap = gapSinceMs !== undefined;
  // After a long gap the last entry's time is a poor guess for bedtime: suggest 11 PM instead.
  const [sleepClock, setSleepClock] = useState(() =>
    gap && Date.now() - sleepSinceMs > 12 * 60 * 60_000 ? "23:00" : clockOf(sleepSinceMs, timeZone),
  );
  const [wakeClock, setWakeClock] = useState(() => clockOf(Date.now(), timeZone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const options = PLAN_OPTIONS.includes(goalMin) ? PLAN_OPTIONS : [...PLAN_OPTIONS, goalMin].sort((a, b) => a - b);

  async function submit() {
    setBusy(true);
    setError(null);
    const err = await onSubmit({
      quality,
      planMin: plan,
      sleepClock: askSleepTime || gap ? sleepClock : null,
      wakeClock: gap ? wakeClock : null,
    });
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal"
      style={{ width: "min(30rem, 94vw)" }}
      aria-labelledby="wake-title"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="modal-head">
        <h2 id="wake-title" className="card-title" style={{ flex: 1 }}>
          Good morning
        </h2>
      </div>
      <div className="modal-body">
        {gap ? (
          <>
            <p className="sm muted">Nothing is logged since {formatClock(gapSinceMs, timeZone)}. When did you sleep?</p>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <div className="field">
                <label htmlFor="slept-at">Fell asleep</label>
                <input
                  id="slept-at"
                  type="time"
                  className="input"
                  style={{ width: "9rem" }}
                  value={sleepClock}
                  onChange={(e) => setSleepClock(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="woke-at">Woke up</label>
                <input
                  id="woke-at"
                  type="time"
                  className="input"
                  style={{ width: "9rem" }}
                  value={wakeClock}
                  onChange={(e) => setWakeClock(e.target.value)}
                />
              </div>
            </div>
            <span className="xs muted">Time before you fell asleep stays Unknown; fill it from the Timeline.</span>
          </>
        ) : askSleepTime ? (
          <div className="field">
            <label htmlFor="slept-at">When did you sleep?</label>
            <input
              id="slept-at"
              type="time"
              className="input"
              style={{ width: "9rem" }}
              value={sleepClock}
              onChange={(e) => setSleepClock(e.target.value)}
            />
            <span className="help">The app went quiet at {formatClock(sleepSinceMs, timeZone)} after unanswered popups.</span>
          </div>
        ) : (
          <p className="sm muted">You went to sleep at {formatClock(sleepSinceMs, timeZone)}.</p>
        )}
        <div>
          <div className="section-label xs muted">How did you sleep?</div>
          <div style={{ display: "flex", gap: ".4rem" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="chip chip-sm" aria-pressed={quality === n} onClick={() => setQuality(quality === n ? null : n)}>
                {n}
              </button>
            ))}
          </div>
          <p className="xs muted" style={{ marginTop: ".3rem" }}>1 = rough, 5 = great</p>
        </div>
        <div>
          <div className="section-label xs muted">Today&apos;s study plan</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
            {options.map((m) => (
              <button key={m} className="chip chip-sm" aria-pressed={plan === m} onClick={() => setPlan(plan === m ? null : m)}>
                {planLabel(m)}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="modal-foot">
        {gap && onSkip && (
          <button className="btn btn-ghost" onClick={onSkip} disabled={busy} title="Start tracking from now; the gap stays Unknown">
            Skip
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={busy || ((askSleepTime || gap) && !sleepClock) || (gap && !wakeClock)}
        >
          <Sun className="lucide" aria-hidden /> {busy ? "Saving…" : "I'm awake"}
        </button>
      </div>
    </dialog>
  );
}
