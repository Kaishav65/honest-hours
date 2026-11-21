"use client";

import { Archive, ArchiveRestore, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { CategoryIcon, ICON_NAMES } from "@/components/checkin/category-icon";
import type { CategoryKind, QuestionType } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/client";
import type { CategoryValue, SettingsCategory, SettingsQuestion } from "./types";

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: "study", label: "Study" },
  { value: "work", label: "Work" },
  { value: "commute", label: "Travel" },
  { value: "routine", label: "Routine (meals, getting ready)" },
  { value: "chore", label: "Chore" },
  { value: "entertainment", label: "Entertainment" },
  { value: "rest", label: "Rest / nap" },
  { value: "sleep", label: "Sleep" },
];
const VALUES: { value: CategoryValue; label: string }[] = [
  { value: "productive", label: "Productive" },
  { value: "neutral", label: "Neutral" },
  { value: "waste", label: "Waste" },
];
const TYPES: { value: QuestionType; label: string }[] = [
  { value: "rating_1_5", label: "Rating 1–5" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_choice", label: "Pick one" },
  { value: "multi_choice", label: "Pick several" },
  { value: "text", label: "Short text" },
  { value: "number", label: "Number" },
  { value: "time", label: "Time" },
];
const defaultValue = (k: CategoryKind): CategoryValue => (k === "study" ? "productive" : k === "entertainment" ? "waste" : "neutral");
const kindLabel = (k: string) => KINDS.find((x) => x.value === k)?.label.split(" (")[0] ?? k;

type Props = { categories: SettingsCategory[]; questions: SettingsQuestion[]; onChanged: () => void };

export function CategoriesTab({ categories, questions, onChanged }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(job: PromiseLike<{ error: { code?: string; message: string } | null }>) {
    setError(null);
    const { error: err } = await job;
    if (err) {
      setError(err.code === "23505" ? "You already have one with that name." : "Couldn't save. Check your connection and try again.");
      return false;
    }
    onChanged();
    return true;
  }

  const nextSort = Math.max(0, ...categories.map((c) => c.sortOrder)) + 10;

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="row">
        <p className="sm muted" style={{ flex: 1 }}>
          These are the choices in your check-in popup. Archived categories stay in your history but disappear from the popup.
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="lucide" aria-hidden /> New category
        </button>
      </div>

      {error && (
        <p className="sm" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {adding && (
        <NewCategory
          onCreate={async (c) => {
            const ok = await run(createClient().from("categories").insert({ ...c, sort_order: nextSort }));
            if (ok) setAdding(false);
            return ok;
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".4rem" }}>
        {categories.map((c) => {
          const isOpen = open === c.id;
          return (
            <li key={c.id} data-kind={c.kind} style={{ border: "1px solid var(--border)", borderLeft: "4px solid var(--k)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)", opacity: c.archived ? 0.6 : 1 }}>
              <button type="button" className="row" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen} style={{ width: "100%", padding: ".55rem .8rem", gap: ".7rem", textAlign: "left", cursor: "pointer" }}>
                {isOpen ? <ChevronDown className="lucide muted" aria-hidden /> : <ChevronRight className="lucide muted" aria-hidden />}
                <span style={{ color: "var(--k-ink)", display: "inline-flex" }}>
                  <CategoryIcon name={c.icon} />
                </span>
                <span style={{ fontWeight: 600, flex: 1 }}>{c.name}</span>
                {c.archived && <span className="badge">Archived</span>}
                <span className="badge">{kindLabel(c.kind)}</span>
                <span className={`badge ${c.value === "waste" ? "badge-danger" : c.value === "productive" ? "badge-success" : ""}`}>{c.value}</span>
              </button>
              {isOpen && (
                <CategoryDetail
                  category={c}
                  questions={questions.filter((q) => q.categoryId === c.id)}
                  nextQuestionSort={Math.max(0, ...questions.filter((q) => q.categoryId === c.id).map((q) => q.sortOrder)) + 10}
                  run={run}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
      {ICON_NAMES.map((n) => (
        <button key={n} type="button" className="chip chip-sm" aria-pressed={value === n} aria-label={n} title={n} onClick={() => onChange(n)} style={{ padding: "0 .5rem" }}>
          <CategoryIcon name={n} />
        </button>
      ))}
    </div>
  );
}

function NewCategory({ onCreate, onCancel }: { onCreate: (c: { name: string; icon: string; kind: CategoryKind; value: CategoryValue }) => Promise<boolean>; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("study");
  const [value, setValue] = useState<CategoryValue>("productive");
  const [icon, setIcon] = useState("circle");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        const ok = await onCreate({ name: name.trim(), icon, kind, value });
        if (!ok) setBusy(false);
      }}
      style={{ gap: "var(--space-3)" }}
    >
      <div className="field">
        <label htmlFor="nc-name">Name</label>
        <input id="nc-name" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gym" autoFocus />
      </div>
      <div className="row" style={{ gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="field">
          <label htmlFor="nc-kind">What kind of activity?</label>
          <select id="nc-kind" className="input" value={kind} onChange={(e) => { const k = e.target.value as CategoryKind; setKind(k); setValue(defaultValue(k)); }}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <span className="help">Scores and totals use this, not the name.</span>
        </div>
        <div className="field">
          <label htmlFor="nc-value">Counts as</label>
          <select id="nc-value" className="input" value={value} onChange={(e) => setValue(e.target.value as CategoryValue)}>
            {VALUES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Icon</label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <div className="row">
        <span className="spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!name.trim() || busy}>Add category</button>
      </div>
    </form>
  );
}

type Run = (job: PromiseLike<{ error: { code?: string; message: string } | null }>) => Promise<boolean>;

function CategoryDetail({ category: c, questions, nextQuestionSort, run }: { category: SettingsCategory; questions: SettingsQuestion[]; nextQuestionSort: number; run: Run }) {
  const [name, setName] = useState(c.name);
  const [value, setValue] = useState<CategoryValue>(c.value);
  const [icon, setIcon] = useState(c.icon);
  const supabase = createClient();
  const dirty = name.trim() !== c.name || value !== c.value || icon !== c.icon;

  return (
    <div style={{ padding: ".4rem .9rem .9rem", display: "grid", gap: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
      <div className="row" style={{ gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, minWidth: "12rem" }}>
          <label htmlFor={`n-${c.id}`}>Name</label>
          <input id={`n-${c.id}`} className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`v-${c.id}`}>Counts as</label>
          <select id={`v-${c.id}`} className="input" value={value} onChange={(e) => setValue(e.target.value as CategoryValue)}>
            {VALUES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" disabled={!dirty || !name.trim()} onClick={() => run(supabase.from("categories").update({ name: name.trim(), value, icon }).eq("id", c.id))}>
          Save
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => run(supabase.from("categories").update({ archived: !c.archived }).eq("id", c.id))}>
          {c.archived ? <ArchiveRestore className="lucide" aria-hidden /> : <Archive className="lucide" aria-hidden />}
          {c.archived ? "Restore" : "Archive"}
        </button>
      </div>
      <div className="field">
        <label>Icon</label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div>
        <div className="section-label xs muted">Questions asked in the popup</div>
        {questions.length === 0 && <p className="sm muted">None. Tap and done.</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".3rem" }}>
          {questions.map((q) => (
            <li key={q.id} className="row sm" style={{ opacity: q.archived ? 0.55 : 1 }}>
              <span style={{ flex: 1 }}>
                {q.label} <span className="muted">· {TYPES.find((t) => t.value === q.type)?.label ?? q.type}{q.options?.length ? ` (${q.options.join(", ")})` : ""}</span>
              </span>
              {q.systemKey && <span className="badge" title="Used by scores and insights">built-in</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => run(supabase.from("category_questions").update({ archived: !q.archived }).eq("id", q.id))}>
                {q.archived ? "Restore" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
        <NewQuestion
          onAdd={(label, type, options) =>
            run(supabase.from("category_questions").insert({ category_id: c.id, label, type, options: options.length ? options : null, sort_order: nextQuestionSort }))
          }
        />
      </div>
    </div>
  );
}

function NewQuestion({ onAdd }: { onAdd: (label: string, type: QuestionType, options: string[]) => Promise<boolean> }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<QuestionType>("rating_1_5");
  const [options, setOptions] = useState("");
  const choice = type === "single_choice" || type === "multi_choice";
  const list = options.split(",").map((o) => o.trim()).filter(Boolean);
  const ready = label.trim() && (!choice || list.length >= 2);
  return (
    <form
      className="row"
      style={{ gap: ".5rem", flexWrap: "wrap", marginTop: ".6rem" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        if (await onAdd(label.trim(), type, choice ? list : [])) {
          setLabel("");
          setOptions("");
        }
      }}
    >
      <input className="input" style={{ flex: 1, minWidth: "10rem", height: "2rem" }} maxLength={60} placeholder="New question, e.g. Which subject?" aria-label="New question" value={label} onChange={(e) => setLabel(e.target.value)} />
      <select className="input" style={{ width: "9rem", height: "2rem" }} aria-label="Answer type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {choice && <input className="input" style={{ flex: 1, minWidth: "10rem", height: "2rem" }} placeholder="Options, comma separated" aria-label="Options" value={options} onChange={(e) => setOptions(e.target.value)} />}
      <button className="btn btn-secondary btn-sm" disabled={!ready}>Add question</button>
    </form>
  );
}
