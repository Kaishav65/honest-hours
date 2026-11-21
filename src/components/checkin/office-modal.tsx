"use client";

import { Check, Scissors, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/checkin/store";
import { duration } from "./checkin-modal";

type Props = {
  startMs: number;
  endMs: number;
  timeZone: string;
  /** Returns an error message, or null when saved. */
  onYes: () => Promise<string | null>;
  onSplit: () => void;
  onSkip: () => void;
};

// Short check-in used inside office hours: "Office as usual?" Yes saves the whole slot as Office.
export function OfficeModal(p: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function yes() {
    setSaving(true);
    setError(null);
    const err = await p.onYes();
    if (err) {
      setError(err);
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="office-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) p.onSkip();
      }}
    >
      <div className="modal-head">
        <div style={{ flex: 1 }}>
          <h2 id="office-title" className="card-title">
            Office as usual?
          </h2>
          <p className="sm muted">
            {formatClock(p.startMs, p.timeZone)} – {formatClock(p.endMs, p.timeZone)} · {duration(Math.round((p.endMs - p.startMs) / 60_000))}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={p.onSkip} disabled={saving}>
          <X className="lucide" aria-hidden /> Skip
        </button>
      </div>
      <div className="modal-body">
        <p className="sm muted">Yes logs this whole stretch as Office. Choose Split if something else happened.</p>
        {error && (
          <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="modal-foot">
        <span style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={p.onSplit} disabled={saving}>
          <Scissors className="lucide" aria-hidden /> Split
        </button>
        <button className="btn btn-primary" onClick={yes} disabled={saving} autoFocus>
          <Check className="lucide" aria-hidden /> {saving ? "Saving…" : "Yes"}
        </button>
      </div>
    </dialog>
  );
}
