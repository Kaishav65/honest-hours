"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { duration } from "@/components/checkin/checkin-modal";
import { formatClock } from "@/lib/checkin/store";
import type { Answers, Category, Question } from "@/lib/checkin/types";
import { buildBlocks, type EntryRow } from "@/lib/time/blocks";
import type { TrackedDay } from "@/lib/time";
import { BlockTip, type TipInfo } from "./block-tip";
import { EntryEditor, type EditTarget } from "./entry-editor";

export type TimelineEntry = EntryRow & { answers: Answers };

type Props = {
  day: TrackedDay;
  prevDate: string;
  /** null when this is the latest day (today). */
  nextDate: string | null;
  todayDate: string;
  label: string;
  nowMs: number;
  timeZone: string;
  dayStartHour: number;
  entries: TimelineEntry[];
  categories: Category[];
  questions: Question[];
};

const minutes = (ms: number) => Math.round(ms / 60_000);

export function TimelineView(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [tip, setTip] = useState<TipInfo | null>(null);
  const byId = new Map(p.categories.map((c) => [c.id, c]));
  const entryById = new Map(p.entries.map((e) => [e.id, e]));
  const blocks = buildBlocks(p.entries, p.day, p.nowMs);
  const go = (date: string) => router.push(date === p.todayDate ? "/timeline" : `/timeline?date=${date}`);

  const openBlock = (b: (typeof blocks)[number]) => {
    if (b.type === "gap") return b.open ? undefined : setEditing({ kind: "gap", startMs: b.startMs, endMs: b.endMs });
    const full = entryById.get(b.entry.id)!;
    setEditing({
      kind: "entry",
      id: full.id,
      categoryId: full.categoryId,
      startMs: full.startMs,
      endMs: full.endMs,
      crossesDay: b.crossesDay,
      answers: full.answers,
    });
  };

  const axis = Array.from({ length: 9 }, (_, i) => ({ min: i * 180, label: formatClock(p.day.startMs + i * 180 * 60_000, p.timeZone) }));
  const unknownMin = blocks.reduce((sum, b) => (b.type === "gap" ? sum + minutes(b.endMs - b.startMs) : sum), 0);

  return (
    <section className="page" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <header className="row" style={{ flexWrap: "wrap" }}>
        <h1 className="display" style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
          Timeline
        </h1>
        <span className="spacer" />
        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => go(p.prevDate)} aria-label="Previous day">
          <ChevronLeft className="lucide" aria-hidden />
        </button>
        <input
          type="date"
          className="input"
          style={{ width: "10.5rem", height: "2rem" }}
          aria-label="Pick a day"
          value={p.day.date}
          max={p.todayDate}
          onChange={(e) => e.target.value && e.target.value <= p.todayDate && go(e.target.value)}
        />
        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => p.nextDate && go(p.nextDate)} disabled={!p.nextDate} aria-label="Next day">
          <ChevronRight className="lucide" aria-hidden />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => go(p.todayDate)} disabled={!p.nextDate}>
          Today
        </button>
      </header>

      <div className="card">
        <div className="card-head">
          <h2 className="card-title">{p.label}</h2>
          <span className="spacer" />
          <span className="sm muted">{unknownMin > 0 ? `${duration(unknownMin)} unknown` : "Everything logged"}</span>
        </div>
        <div className="ribbon" aria-hidden>
          {blocks.map((b) => {
            const cat = b.type === "entry" ? byId.get(b.entry.categoryId) : undefined;
            return (
              <div
                key={b.type === "entry" ? b.entry.id : `gap-${b.startMs}`}
                className="blk"
                data-kind={b.type === "gap" ? "unknown" : (cat?.kind ?? "unknown")}
                style={{ "--s": minutes(b.startMs - p.day.startMs), "--d": minutes(b.endMs - b.startMs) } as React.CSSProperties}
                onMouseMove={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.currentTarget.getBoundingClientRect().top,
                    name: b.type === "gap" ? (b.open ? "Now (being tracked)" : "Unknown") : (cat?.name ?? "Deleted category"),
                    kind: b.type === "gap" ? "unknown" : (cat?.kind ?? "unknown"),
                    startMs: b.startMs,
                    endMs: b.endMs,
                    hint: b.type === "gap" ? (b.open ? undefined : "click to fill") : "click to edit",
                  })
                }
                onMouseLeave={() => setTip(null)}
                onClick={() => openBlock(b)}
              />
            );
          })}
        </div>
        <div className="axis" aria-hidden>
          {axis.map((a) => (
            <span key={a.min} style={{ left: `${(a.min / 1440) * 100}%`, whiteSpace: "nowrap" }}>
              {a.label}
            </span>
          ))}
        </div>
      </div>

      {tip && <BlockTip tip={tip} timeZone={p.timeZone} />}

      <div className="card scroll" style={{ flex: 1 }}>
        {blocks.length === 0 ? (
          <p className="sm muted">Nothing here yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".4rem" }}>
            {blocks.map((b) => {
              const cat = b.type === "entry" ? byId.get(b.entry.categoryId) : undefined;
              const mins = minutes(b.endMs - b.startMs);
              const open = b.type === "gap" && b.open;
              return (
                <li key={b.type === "entry" ? b.entry.id : `gap-${b.startMs}`}>
                  <button
                    type="button"
                    className="row tl-row"
                    data-kind={b.type === "gap" ? "unknown" : (cat?.kind ?? "unknown")}
                    data-gap={b.type === "gap" ? (open ? "open" : "unknown") : undefined}
                    onClick={() => openBlock(b)}
                    disabled={open}
                  >
                    <span className="dot" />
                    <span className="tl-time sm">
                      {formatClock(b.startMs, p.timeZone)} – {formatClock(b.endMs, p.timeZone)}
                    </span>
                    <span className="tl-name">
                      {b.type === "gap" ? (open ? "Now: the next check-in covers this" : "Unknown") : (cat?.name ?? "Deleted category")}
                    </span>
                    {b.type === "entry" && b.entry.source === "backfill" && <span className="badge">filled later</span>}
                    <span className="sm muted">{duration(mins)}</span>
                    {b.type === "gap" ? (
                      !open && (
                        <span className="badge badge-info">
                          <Plus className="lucide" aria-hidden /> Fill
                        </span>
                      )
                    ) : (
                      <Pencil className="lucide muted" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <EntryEditor
          key={editing.kind === "entry" ? editing.id : `gap-${editing.startMs}`}
          target={editing}
          day={p.day}
          timeZone={p.timeZone}
          dayStartHour={p.dayStartHour}
          categories={p.categories}
          questions={p.questions}
          onCancel={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
