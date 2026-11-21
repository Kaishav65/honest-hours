"use client";

import { useCallback, useEffect, useState } from "react";
import { answersToFields } from "@/lib/checkin/answers";
import { floorToMinute, nextDueMs, slotStartMs } from "@/lib/checkin/schedule";
import { formatClock, onLogNow, setCheckinStatus } from "@/lib/checkin/store";
import type { Answers, Category, LastEntry, Question } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/client";
import { splitSlot } from "@/lib/time";
import { CheckinModal, type SavePart } from "./checkin-modal";

type Props = {
  timeZone: string;
  dayStartHour: number;
  intervalMin: number;
  /** profiles.status: popups only appear while "normal" (busy / sleep arrive in step 6). */
  status: string;
  categories: Category[];
  questions: Question[];
  lastEndMs: number | null;
  lastEntry: LastEntry | null;
  lastAnswers: Record<string, Answers>;
};

type Prompt = { startMs: number; endMs: number; promptedAt: number };

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// Owns the check-in timer and popup. All timing comes from saved timestamps, not from counting
// timers, because background tabs throttle timers: after 70 minutes away the next check-in covers 70 minutes.
export function CheckinController(props: Props) {
  const { timeZone, dayStartHour, intervalMin, status, categories, questions } = props;
  const [slotStart, setSlotStart] = useState(() =>
    slotStartMs(props.lastEndMs, Date.now(), timeZone, dayStartHour),
  );
  const [lastPrompt, setLastPrompt] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [lastEntry, setLastEntry] = useState(props.lastEntry);
  const [lastAnswers, setLastAnswers] = useState(props.lastAnswers);
  const [, bump] = useState(0);

  const due = nextDueMs(slotStart, lastPrompt, intervalMin);
  const active = status === "normal";

  const openPrompt = useCallback(() => {
    const now = Date.now();
    const endMs = floorToMinute(now);
    if (endMs - slotStart < 60_000) return;
    setPrompt({ startMs: slotStart, endMs, promptedAt: now });
    if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
      const n = new Notification("Honest Hours", {
        body: `What did you do since ${formatClock(slotStart, timeZone)}?`,
        tag: "hh-checkin",
      });
      n.onclick = () => window.focus();
    }
  }, [slotStart, timeZone]);

  // Show the next-check-in time in the status bar.
  useEffect(() => {
    setCheckinStatus({ nextDueMs: active ? due : null, timeZone });
  }, [due, active, timeZone]);

  // Open the popup when due. Checked on a timer and whenever the tab becomes visible again.
  useEffect(() => {
    if (prompt || !active) return;
    const check = () => {
      if (Date.now() >= due) openPrompt();
    };
    check();
    const id = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [prompt, active, due, openPrompt]);

  // "Log now" button and L key.
  useEffect(() => {
    const open = () => {
      if (!prompt) openPrompt();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l" || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      open();
    };
    window.addEventListener("keydown", onKey);
    const off = onLogNow(open);
    return () => {
      window.removeEventListener("keydown", onKey);
      off();
    };
  }, [prompt, openPrompt]);

  async function save(parts: SavePart[]): Promise<string | null> {
    if (!prompt) return null;
    const spans = splitSlot(prompt, parts.map((p) => p.minutes));
    const supabase = createClient();

    const rows = parts.map((p, i) => ({
      category_id: p.categoryId,
      start_at: new Date(spans[i].startMs).toISOString(),
      end_at: new Date(spans[i].endMs).toISOString(),
      source: "checkin",
      ...answersToFields(
        questions.filter((q) => q.categoryId === p.categoryId),
        p.answers,
      ),
    }));
    const { data, error } = await supabase.from("entries").insert(rows).select("id, start_at");
    if (error) {
      return error.code === "23P01"
        ? "Part of this time already has an entry. Reload the page and try again."
        : "Couldn't save. Check your connection and try again.";
    }

    // Tags and the check-in record are secondary: the entries above are what counts.
    const idByStart = new Map(data.map((r) => [Date.parse(r.start_at), r.id]));
    const tags = parts.flatMap((p, i) =>
      p.tagIds.map((tag) => ({ entry_id: idByStart.get(spans[i].startMs), tag_category_id: tag })),
    );
    const secondary = await Promise.all([
      tags.length ? supabase.from("entry_tags").insert(tags) : null,
      supabase.from("checkins").insert({
        prompted_at: new Date(prompt.promptedAt).toISOString(),
        answered_at: new Date().toISOString(),
        status: "answered",
      }),
    ]);
    secondary.forEach((r) => r?.error && console.error("Check-in extras not saved:", r.error.message));

    const lastPart = parts[parts.length - 1];
    setLastEntry({ categoryId: lastPart.categoryId, answers: lastPart.answers });
    setLastAnswers((prev) => ({ ...prev, ...Object.fromEntries(parts.map((p) => [p.categoryId, p.answers])) }));
    setSlotStart(prompt.endMs);
    setLastPrompt(null);
    setPrompt(null);
    return null;
  }

  function skip() {
    if (!prompt) return;
    createClient()
      .from("checkins")
      .insert({ prompted_at: new Date(prompt.promptedAt).toISOString(), status: "skipped" })
      .then(({ error }) => error && console.error("Skip not recorded:", error.message));
    setLastPrompt(Date.now());
    setPrompt(null);
  }

  if (!prompt) return null;
  return (
    <CheckinModal
      key={prompt.promptedAt}
      startMs={prompt.startMs}
      endMs={prompt.endMs}
      timeZone={timeZone}
      categories={categories}
      questions={questions}
      lastEntry={lastEntry}
      lastAnswers={lastAnswers}
      canAskNotifications={typeof Notification !== "undefined" && Notification.permission === "default"}
      onEnableNotifications={() => Notification.requestPermission().then(() => bump((n) => n + 1))}
      onSave={save}
      onSkip={skip}
    />
  );
}
