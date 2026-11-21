"use client";

import { Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type BusyPreset = { label: string; minutes: number };
export type BusyChoice = { minutes: number } | { untilClock: string };

type Props = {
  presets: BusyPreset[];
  onStart: (choice: BusyChoice, label: string) => Promise<string | null>;
  onCancel: () => void;
};

const QUICK = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

export function BusyModal({ presets, onStart, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [minutes, setMinutes] = useState<number | null>(60);
  const [untilClock, setUntilClock] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const useUntil = minutes === null;
  const ready = useUntil ? untilClock !== "" : true;

  async function start() {
    setBusy(true);
    setError(null);
    const err = await onStart(useUntil ? { untilClock } : { minutes: minutes! }, label.trim());
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
      aria-labelledby="busy-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="modal-head">
        <h2 id="busy-title" className="card-title" style={{ flex: 1 }}>
          Busy for how long?
        </h2>
      </div>
      <div className="modal-body">
        <p className="sm muted">No popups while you&apos;re busy. When it ends, you&apos;ll log what you did.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
          {QUICK.map((q) => (
            <button key={q.minutes} className="chip" aria-pressed={minutes === q.minutes} onClick={() => setMinutes(q.minutes)}>
              {q.label}
            </button>
          ))}
          <button className="chip" aria-pressed={useUntil} onClick={() => setMinutes(null)}>
            Until a time
          </button>
        </div>
        {useUntil && (
          <div className="field">
            <label htmlFor="busy-until">Busy until</label>
            <input
              id="busy-until"
              type="time"
              className="input"
              style={{ width: "9rem" }}
              value={untilClock}
              onChange={(e) => setUntilClock(e.target.value)}
            />
          </div>
        )}
        {presets.length > 0 && (
          <div>
            <div className="section-label xs muted">Presets</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  className="chip chip-sm"
                  onClick={() => {
                    setMinutes(p.minutes);
                    setLabel(p.label);
                  }}
                >
                  {p.label} · {p.minutes >= 60 ? `${Math.floor(p.minutes / 60)}h${p.minutes % 60 ? ` ${p.minutes % 60}m` : ""}` : `${p.minutes}m`}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="busy-label">What for? (optional)</label>
          <input
            id="busy-label"
            className="input"
            maxLength={40}
            placeholder="Interview"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        {error && (
          <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={start} disabled={!ready || busy}>
          <Pause className="lucide" aria-hidden /> {busy ? "Starting…" : "Start busy"}
        </button>
      </div>
    </dialog>
  );
}
