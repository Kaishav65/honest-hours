"use client";

import { Bell, Check, RotateCcw, Scissors, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Answers, Category, LastEntry, Question } from "@/lib/checkin/types";
import { formatClock } from "@/lib/checkin/store";
import { CategoryIcon } from "./category-icon";
import { QuestionField } from "./question-field";

export type SavePart = { categoryId: string; minutes: number | null; tagIds: string[]; answers: Answers };

type Part = { key: number; categoryId: string | null; minutes: number; tagIds: string[]; answers: Answers };

type Props = {
  startMs: number;
  endMs: number;
  timeZone: string;
  categories: Category[];
  questions: Question[];
  lastEntry: LastEntry | null;
  lastAnswers: Record<string, Answers>;
  canAskNotifications: boolean;
  onEnableNotifications: () => void;
  /** Returns an error message, or null when saved. `minutes: null` = the part that takes the rest. */
  onSave: (parts: SavePart[]) => Promise<string | null>;
  onSkip: () => void;
};

export function duration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function CheckinModal(p: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keyCounter = useRef(1);
  const total = Math.max(1, Math.round((p.endMs - p.startMs) / 60_000));
  const [parts, setParts] = useState<Part[]>([{ key: 0, categoryId: null, minutes: total, tagIds: [], answers: {} }]);
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const byId = new Map(p.categories.map((c) => [c.id, c]));
  const current = parts[active];
  const currentCat = current.categoryId ? byId.get(current.categoryId) : undefined;
  const currentQuestions = p.questions.filter((q) => q.categoryId === current.categoryId);
  const last = p.lastEntry ? byId.get(p.lastEntry.categoryId) : undefined;
  const ready = parts.every((x) => x.categoryId);

  const patch = (i: number, change: Partial<Part>) =>
    setParts((all) => all.map((x, j) => (j === i ? { ...x, ...change } : x)));

  function pickCategory(id: string) {
    patch(active, {
      categoryId: id,
      answers: p.lastAnswers[id] ?? {},
      tagIds: current.tagIds.filter((t) => t !== id),
    });
  }

  function split() {
    if (current.minutes < 2) return;
    const added = Math.floor(current.minutes / 2);
    const next: Part = { key: keyCounter.current++, categoryId: null, minutes: added, tagIds: [], answers: {} };
    setParts((all) => [
      ...all.slice(0, active),
      { ...current, minutes: current.minutes - added },
      next,
      ...all.slice(active + 1),
    ]);
    setActive(active + 1);
  }

  function removePart() {
    if (parts.length < 2) return;
    const absorber = active === 0 ? 1 : active - 1;
    setParts((all) =>
      all
        .map((x, j) => (j === absorber ? { ...x, minutes: x.minutes + current.minutes } : x))
        .filter((_, j) => j !== active),
    );
    setActive(active === 0 ? 0 : active - 1);
  }

  // Moves the boundary between the active part and the next one.
  function moveBoundary(minutes: number) {
    const next = parts[active + 1];
    if (!next) return;
    const delta = minutes - current.minutes;
    setParts((all) =>
      all.map((x, j) => (j === active ? { ...x, minutes } : j === active + 1 ? { ...x, minutes: next.minutes - delta } : x)),
    );
  }

  async function save(list: SavePart[]) {
    setSaving(true);
    setError(null);
    const err = await p.onSave(list);
    if (err) {
      setError(err);
      setSaving(false);
    }
  }

  const sameAsBefore = () =>
    p.lastEntry && save([{ categoryId: p.lastEntry.categoryId, minutes: null, tagIds: [], answers: p.lastEntry.answers }]);

  const saveParts = () =>
    save(
      parts.map((x, i) => ({
        categoryId: x.categoryId!,
        minutes: i === parts.length - 1 ? null : x.minutes,
        tagIds: x.tagIds,
        answers: x.answers,
      })),
    );

  return (
    <dialog ref={dialog} className="modal" aria-labelledby="checkin-title" onCancel={(e) => { e.preventDefault(); if (!saving) p.onSkip(); }}>
      <div className="modal-head">
        <div style={{ flex: 1 }}>
          <h2 id="checkin-title" className="card-title">
            What did you do since {formatClock(p.startMs, p.timeZone)}?
          </h2>
          <p className="sm muted">
            {duration(total)} · until {formatClock(p.endMs, p.timeZone)}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={p.onSkip} disabled={saving}>
          <X className="lucide" aria-hidden /> Skip
        </button>
      </div>

      <div className="modal-body" style={{ overflowY: "auto" }}>
        {last && parts.length === 1 && (
          <div>
            <button className="btn btn-soft" onClick={sameAsBefore} disabled={saving}>
              <RotateCcw className="lucide" aria-hidden /> Same as before: {last.name}
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
          {p.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              data-kind={c.kind}
              aria-pressed={current.categoryId === c.id}
              onClick={() => pickCategory(c.id)}
            >
              <CategoryIcon name={c.icon} />
              {c.name}
            </button>
          ))}
        </div>

        <div>
          <div className="section-label xs muted">Split</div>
          <div className="split" role="tablist" aria-label="Parts of this slot">
            {parts.map((x, i) => {
              const cat = x.categoryId ? byId.get(x.categoryId) : undefined;
              return (
                <div
                  key={x.key}
                  role="tab"
                  aria-selected={i === active}
                  tabIndex={0}
                  data-kind={cat?.kind ?? "unknown"}
                  style={{
                    flex: `${x.minutes} 1 0`,
                    cursor: "pointer",
                    outline: i === active ? "2px solid var(--ink)" : undefined,
                    outlineOffset: -2,
                  }}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(i)}
                >
                  {cat?.name ?? "?"} {duration(x.minutes)}
                </div>
              );
            })}
          </div>
          {active < parts.length - 1 && (
            <input
              type="range"
              className="range"
              aria-label="Where this part ends"
              min={1}
              max={current.minutes + parts[active + 1].minutes - 1}
              value={current.minutes}
              onChange={(e) => moveBoundary(Number(e.target.value))}
            />
          )}
          <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem" }}>
            <button className="btn btn-secondary btn-sm" onClick={split} disabled={current.minutes < 2}>
              <Scissors className="lucide" aria-hidden /> Split this part
            </button>
            {parts.length > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={removePart}>
                Remove part
              </button>
            )}
          </div>
        </div>

        {currentCat && currentQuestions.length > 0 && (
          <div className="detail">
            <div className="section-label xs muted">{currentCat.name} details</div>
            <div className="qgrid">
              {currentQuestions.map((q) => (
                <FieldRow key={q.id} q={q} answers={current.answers} onChange={(a) => patch(active, { answers: a })} />
              ))}
            </div>
          </div>
        )}

        {currentCat && (
          <div>
            <div className="section-label xs muted">While doing (optional)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
              {p.categories
                .filter((c) => c.id !== current.categoryId)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip chip-sm"
                    data-kind={c.kind}
                    aria-pressed={current.tagIds.includes(c.id)}
                    onClick={() =>
                      patch(active, {
                        tagIds: current.tagIds.includes(c.id) ? current.tagIds.filter((t) => t !== c.id) : [...current.tagIds, c.id],
                      })
                    }
                  >
                    {c.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {error && (
          <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="modal-foot">
        {p.canAskNotifications && (
          <button className="btn btn-ghost btn-sm" onClick={p.onEnableNotifications}>
            <Bell className="lucide" aria-hidden /> Turn on notifications
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={saveParts} disabled={!ready || saving}>
          <Check className="lucide" aria-hidden /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </dialog>
  );
}

function FieldRow({ q, answers, onChange }: { q: Question; answers: Answers; onChange: (a: Answers) => void }) {
  return (
    <>
      <label>{q.label}</label>
      <QuestionField
        question={q}
        value={answers[q.id]}
        onChange={(v) => {
          const next = { ...answers };
          if (v === undefined) delete next[q.id];
          else next[q.id] = v;
          onChange(next);
        }}
      />
    </>
  );
}
