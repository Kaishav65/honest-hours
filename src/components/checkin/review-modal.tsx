"use client";

import { Moon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GOAL_MAX_CHARS, planGapMin } from "@/lib/checkin/review";

export type ReviewSummary = {
  studyMin: number;
  goalMin: number;
  wastedMin: number;
  wastedSessions: number;
  plannedMin: number | null;
  trackedPct: number;
  unknownMin: number;
  focusScore: number | null;
  disciplineScore: number | null;
};

type Props = {
  summary: ReviewSummary | null; // null while loading
  /** The goal already set for tomorrow, if any. */
  currentGoal: string | null;
  /** Shown on the main button: "Save" or "Save & go to sleep". */
  confirmLabel: string;
  onSave: (goal: string) => Promise<string | null>;
  onSkip: () => void;
};

const plain = (min: number) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

// The 1-minute evening review (PLAN §4.10): how today went, and one goal for tomorrow.
export function ReviewModal({ summary, currentGoal, confirmLabel, onSave, onSkip }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [goal, setGoal] = useState(currentGoal ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    const err = await onSave(goal);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  const gap = summary ? planGapMin(summary.plannedMin, summary.studyMin) : null;
  const metGoal = summary ? summary.studyMin >= summary.goalMin : false;

  return (
    <dialog
      ref={dialog}
      className="modal"
      style={{ width: "min(32rem, 94vw)" }}
      aria-labelledby="review-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onSkip();
      }}
    >
      <div className="modal-head">
        <h2 id="review-title" className="card-title" style={{ flex: 1 }}>
          How did today go?
        </h2>
      </div>
      <div className="modal-body">
        {summary ? (
          <div className="review-grid">
            <div>
              <span className="overline">Study</span>
              <div className="review-val" style={{ color: metGoal ? "var(--success)" : undefined }}>
                {plain(summary.studyMin)} <span className="xs muted">of {plain(summary.goalMin)}</span>
              </div>
            </div>
            <div>
              <span className="overline">Wasted</span>
              <div className="review-val" style={{ color: summary.wastedMin > 0 ? "var(--value-waste)" : undefined }}>
                {plain(summary.wastedMin)}{" "}
                <span className="xs muted">
                  {summary.wastedSessions} session{summary.wastedSessions === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div>
              <span className="overline">Plan vs actual</span>
              <div className="review-val">
                {summary.plannedMin === null ? (
                  <span className="muted">No plan set</span>
                ) : (
                  <>
                    {plain(summary.plannedMin)} <span className="xs muted">planned</span>
                  </>
                )}
              </div>
              {gap !== null && (
                <span className="xs muted">
                  {gap > 0 ? `${plain(gap)} short of the plan` : gap < 0 ? `${plain(-gap)} over the plan` : "Plan kept exactly"}
                </span>
              )}
            </div>
            <div>
              <span className="overline">Tracked</span>
              <div className="review-val">{Math.round(summary.trackedPct)}%</div>
              {summary.unknownMin >= 1 && <span className="xs muted">{plain(summary.unknownMin)} unknown</span>}
            </div>
            <div>
              <span className="overline">Focus</span>
              <div className="review-val" data-testid="review-focus">
                {summary.focusScore ?? <span className="muted">—</span>}
              </div>
              {summary.focusScore === null && <span className="xs muted">no rated session</span>}
            </div>
            <div>
              <span className="overline">Discipline</span>
              <div className="review-val" data-testid="review-discipline">
                {summary.disciplineScore ?? <span className="muted">—</span>}
              </div>
            </div>
          </div>
        ) : (
          <p className="sm muted">Adding up today…</p>
        )}
        <div className="field">
          <label htmlFor="tomorrow-goal">Tomorrow&apos;s one goal</label>
          <input
            id="tomorrow-goal"
            className="input"
            value={goal}
            maxLength={GOAL_MAX_CHARS}
            placeholder="e.g. Finish the graphs problem set before 10"
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && summary && save()}
          />
          <span className="help">Optional. It shows on Today tomorrow.</span>
        </div>
        {error && (
          <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onSkip} disabled={busy}>
          Skip
        </button>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={save} disabled={busy || !summary}>
          <Moon className="lucide" aria-hidden /> {busy ? "Saving…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
