"use client";

import { Check, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/checkin/category-icon";
import { QuestionField } from "@/components/checkin/question-field";
import { answersToFields } from "@/lib/checkin/answers";
import { clockOf } from "@/lib/checkin/status";
import { formatClock } from "@/lib/checkin/store";
import type { Answers, Category, Question } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/client";
import { clockToDayMs } from "@/lib/time/blocks";
import type { TrackedDay } from "@/lib/time";

export type EditTarget =
  /** Unknown time to fill: saves a new entry with source = backfill. */
  | { kind: "gap"; startMs: number; endMs: number }
  | { kind: "entry"; id: string; categoryId: string; startMs: number; endMs: number; crossesDay: boolean; answers: Answers };

type Props = {
  target: EditTarget;
  day: TrackedDay;
  timeZone: string;
  dayStartHour: number;
  categories: Category[];
  questions: Question[];
  /** Called after a successful save or delete. */
  onDone: () => void;
  onCancel: () => void;
};

const NULL_ANSWER_COLUMNS = { planned: null, trigger: null, focus: null, phone_checks: null, mood_after: null };

export function EntryEditor(p: Props) {
  const { target } = p;
  const dialog = useRef<HTMLDialogElement>(null);
  const isEntry = target.kind === "entry";
  const timesLocked = isEntry && target.crossesDay;
  const [categoryId, setCategoryId] = useState<string | null>(isEntry ? target.categoryId : null);
  const [answers, setAnswers] = useState<Answers>(isEntry ? target.answers : {});
  const [start, setStart] = useState(clockOf(target.startMs, p.timeZone));
  const [end, setEnd] = useState(clockOf(target.endMs, p.timeZone));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const questions = p.questions.filter((q) => q.categoryId === categoryId);
  const cat = p.categories.find((c) => c.id === categoryId);

  function pick(id: string) {
    if (id === categoryId) return;
    setCategoryId(id);
    // Answers belong to a category's questions: keep them only if the category didn't change.
    setAnswers(isEntry && id === target.categoryId ? target.answers : {});
  }

  /** Parse the two time fields into instants, or return an error message. */
  function readTimes(): { startMs: number; endMs: number } | string {
    if (timesLocked) return { startMs: target.startMs, endMs: target.endMs };
    const startMs = clockToDayMs(start, p.day, p.timeZone, p.dayStartHour);
    // The very end of the day reads as the day-start clock (03:00), which would otherwise mean its start.
    const endMs = end === clockOf(p.day.endMs, p.timeZone) ? p.day.endMs : clockToDayMs(end, p.day, p.timeZone, p.dayStartHour);
    if (startMs === null || endMs === null) return "Enter a start and end time.";
    if (endMs - startMs < 60_000) return "The end must be at least a minute after the start.";
    if (target.kind === "gap" && (startMs < target.startMs || endMs > target.endMs)) {
      return `Stay inside the unknown time: ${formatClock(target.startMs, p.timeZone)} – ${formatClock(target.endMs, p.timeZone)}.`;
    }
    return { startMs, endMs };
  }

  async function save() {
    if (!categoryId) return;
    const times = readTimes();
    if (typeof times === "string") return setError(times);
    setBusy(true);
    setError(null);
    const fields = answersToFields(questions, answers);
    const supabase = createClient();
    const result =
      target.kind === "gap"
        ? await supabase.from("entries").insert({
            category_id: categoryId,
            start_at: new Date(times.startMs).toISOString(),
            end_at: new Date(times.endMs).toISOString(),
            source: "backfill",
            ...fields,
          })
        : await supabase
            .from("entries")
            .update({
              category_id: categoryId,
              ...(timesLocked
                ? {}
                : { start_at: new Date(times.startMs).toISOString(), end_at: new Date(times.endMs).toISOString() }),
              ...NULL_ANSWER_COLUMNS,
              ...fields,
            })
            .eq("id", target.id);
    if (result.error) {
      setError(
        result.error.code === "23P01"
          ? "That overlaps another entry. Shorten it, or edit the neighbouring entry first."
          : "Couldn't save. Check your connection and try again.",
      );
      setBusy(false);
      return;
    }
    p.onDone();
  }

  async function remove() {
    if (target.kind !== "entry") return;
    setBusy(true);
    const { error: err } = await createClient().from("entries").delete().eq("id", target.id);
    if (err) {
      setError("Couldn't delete. Check your connection and try again.");
      setBusy(false);
      return;
    }
    p.onDone();
  }

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="editor-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) p.onCancel();
      }}
    >
      <div className="modal-head">
        <div style={{ flex: 1 }}>
          <h2 id="editor-title" className="card-title">
            {isEntry ? "Edit entry" : "Fill unknown time"}
          </h2>
          <p className="sm muted">
            {formatClock(target.startMs, p.timeZone)} – {formatClock(target.endMs, p.timeZone)}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={p.onCancel} disabled={busy}>
          <X className="lucide" aria-hidden /> Cancel
        </button>
      </div>

      <div className="modal-body" style={{ overflowY: "auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
          {p.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              data-kind={c.kind}
              aria-pressed={categoryId === c.id}
              onClick={() => pick(c.id)}
            >
              <CategoryIcon name={c.icon} />
              {c.name}
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: "1rem", flexWrap: "wrap" }}>
          <div className="field">
            <label htmlFor="ed-start">From</label>
            <input id="ed-start" type="time" className="input" style={{ width: "9rem" }} value={start} disabled={timesLocked} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ed-end">To</label>
            <input id="ed-end" type="time" className="input" style={{ width: "9rem" }} value={end} disabled={timesLocked} onChange={(e) => setEnd(e.target.value)} />
          </div>
          {timesLocked && <p className="xs muted">This entry runs past midnight of this day, so its times can&apos;t be changed here.</p>}
        </div>

        {cat && questions.length > 0 && (
          <div className="detail">
            <div className="section-label xs muted">{cat.name} details</div>
            <div className="qgrid">
              {questions.map((q) => (
                <FieldRow key={q.id} q={q} answers={answers} onChange={setAnswers} />
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
        {isEntry && (
          <button className={confirmDelete ? "btn btn-danger" : "btn btn-ghost"} onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))} disabled={busy}>
            <Trash2 className="lucide" aria-hidden /> {confirmDelete ? "Really delete?" : "Delete"}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={save} disabled={!categoryId || busy}>
          <Check className="lucide" aria-hidden /> {busy ? "Saving…" : "Save"}
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
