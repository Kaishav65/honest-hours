"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/checkin/store";

export type PomodoroResult = { focus: number | null; phoneChecks: number; completed: boolean };

type Props = {
  subjectName: string;
  startMs: number;
  endMs: number;
  timeZone: string;
  /** True when the timer ran out; false when the user stopped it. */
  completed: boolean;
  onSave: (result: PomodoroResult) => Promise<string | null>;
};

// When a pomodoro ends (or is stopped): focus 1–5, phone checks, completed or stopped early.
// It can't be dismissed: the Study entry is only written when this is saved.
export function PomodoroEndModal({ subjectName, startMs, endMs, timeZone, completed: initiallyCompleted, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [phoneChecks, setPhoneChecks] = useState(0);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    const err = await onSave({ focus, phoneChecks, completed });
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  const minutes = Math.round((endMs - startMs) / 60_000);

  return (
    <dialog
      ref={dialog}
      className="modal"
      style={{ width: "min(30rem, 94vw)" }}
      aria-labelledby="pomo-title"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="modal-head">
        <h2 id="pomo-title" className="card-title" style={{ flex: 1 }}>
          {initiallyCompleted ? "Session done" : "Session stopped"}
        </h2>
      </div>
      <div className="modal-body">
        <p className="sm muted">
          {subjectName} · {formatClock(startMs, timeZone)} – {formatClock(endMs, timeZone)} ({minutes} min). It will be
          logged as Study.
        </p>
        <div>
          <div className="section-label xs muted">How focused were you?</div>
          <div style={{ display: "flex", gap: ".4rem" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="chip chip-sm" aria-pressed={focus === n} onClick={() => setFocus(focus === n ? null : n)}>
                {n}
              </button>
            ))}
          </div>
          <p className="xs muted" style={{ marginTop: ".3rem" }}>1 = distracted, 5 = deep focus</p>
        </div>
        <div className="field">
          <label htmlFor="pomo-phone">Times you checked your phone</label>
          <input
            id="pomo-phone"
            type="number"
            min={0}
            max={99}
            className="input"
            style={{ width: "6rem" }}
            value={phoneChecks}
            onChange={(e) => setPhoneChecks(Math.max(0, Math.min(99, Math.floor(Number(e.target.value) || 0))))}
          />
        </div>
        <div>
          <div className="section-label xs muted">How did it end?</div>
          <div className="seg" data-single>
            <button aria-pressed={completed} onClick={() => setCompleted(true)}>
              Completed
            </button>
            <button aria-pressed={!completed} onClick={() => setCompleted(false)}>
              Stopped early
            </button>
          </div>
        </div>
        {error && (
          <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="modal-foot">
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={save} disabled={busy} autoFocus>
          <Check className="lucide" aria-hidden /> {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </dialog>
  );
}
