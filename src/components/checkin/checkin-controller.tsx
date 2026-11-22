"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { answersToFields } from "@/lib/checkin/answers";
import {
  dueWithOffice,
  isOfficeSlot,
  officeWindow,
  routineSegments,
  type RoutineItem,
} from "@/lib/checkin/office";
import { armChime, playChime } from "@/lib/checkin/chime";
import { floorToMinute, slotStartMs } from "@/lib/checkin/schedule";
import {
  busyEndMs,
  isLateNight,
  lastClockOccurrence,
  nextClockOccurrence,
  QUIET_AFTER_MISSED,
} from "@/lib/checkin/status";
import { formatClock, onCommand, setCheckinStatus, type Mode } from "@/lib/checkin/store";
import type { Answers, Category, LastEntry, Question } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/client";
import { dayOf, splitSlot } from "@/lib/time";
import { BusyModal, type BusyChoice, type BusyPreset } from "./busy-modal";
import { CheckinModal, type SavePart } from "./checkin-modal";
import { NoticeModal } from "./notice-modal";
import { OfficeModal } from "./office-modal";
import { WakeModal, type WakeInput } from "./wake-modal";

type Props = {
  userId: string;
  timeZone: string;
  dayStartHour: number;
  intervalMin: number;
  /** profiles.status. Popups only appear while "normal". "pomodoro" arrives in v2. */
  status: string;
  statusSinceMs: number | null;
  statusUntilMs: number | null;
  statusLabel: string | null;
  weekdayGoalMin: number;
  weekendGoalMin: number;
  busyPresets: BusyPreset[];
  /** profiles.settings (office hours per day type). */
  settings: unknown;
  /** The one-tap routine (e.g. "Office day"), or null. */
  routine: { name: string; items: RoutineItem[] } | null;
  categories: Category[];
  questions: Question[];
  lastEndMs: number | null;
  lastEntry: LastEntry | null;
  lastAnswers: Record<string, Answers>;
};

type Prompt = {
  startMs: number;
  endMs: number;
  promptedAt: number;
  subtitle?: string;
  /** Slot lies inside office hours: ask the short "Office as usual?" first. */
  office?: boolean;
};
type Status = Mode["status"];

// Written to profiles.status_label when the app went quiet by itself (we don't know when sleep began).
const AUTO_QUIET = "auto-quiet";

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

const toStatus = (s: string): Status => (s === "busy" || s === "sleeping" ? s : "normal");

// Owns the check-in timer, the popups, and Busy / Sleep. All timing comes from saved timestamps, not
// from counting timers, because background tabs throttle timers: after 70 minutes away the next
// check-in covers 70 minutes.
export function CheckinController(props: Props) {
  const { userId, timeZone, dayStartHour, intervalMin, categories, questions } = props;
  // Re-render the server-rendered pages (Today, Timeline) after a save, so new entries show without a reload.
  const router = useRouter();
  // The clock is only read after mount (never while rendering), so server rendering stays stable.
  const [slotStart, setSlotStart] = useState<number | null>(null);
  const [lastEndMs, setLastEndMs] = useState(props.lastEndMs);
  const [lastPrompt, setLastPrompt] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [lastEntry, setLastEntry] = useState(props.lastEntry);
  const [lastAnswers, setLastAnswers] = useState(props.lastAnswers);
  const [mode, setMode] = useState<Mode>({
    status: toStatus(props.status),
    label: props.statusLabel,
    sinceMs: props.statusSinceMs,
    untilMs: props.statusUntilMs,
  });
  const [wakeOpen, setWakeOpen] = useState(false);
  const [busyOpen, setBusyOpen] = useState(false);
  const missedInARow = useRef(0);
  const routineBusy = useRef(false);
  const [, bump] = useState(0);

  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const officeCat = categories.find((c) => c.kind === "work");

  // A skipped popup waits one more interval; the slot itself keeps growing. Office hours use a longer interval.
  const dueBase = slotStart === null ? null : Math.max(slotStart, lastPrompt ?? 0);
  const due =
    dueBase === null
      ? null
      : dueWithOffice(dueBase, intervalMin, officeWindow(dueBase, timeZone, dayStartHour, props.settings));
  const active = mode.status === "normal" && !wakeOpen && !busyOpen;

  useEffect(() => {
    const id = setTimeout(() => {
      setSlotStart((s) => s ?? slotStartMs(props.lastEndMs, Date.now(), timeZone, dayStartHour));
      // A night's sleep ends with the "I'm awake" popup, which opens by itself when the app loads while sleeping.
      if (props.status === "sleeping") setWakeOpen(true);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on mount
  }, []);

  // Entries edited on the Timeline page change what's already logged: the next slot may never start
  // before the newest entry's end, or saving a check-in would overlap it.
  useEffect(() => {
    const newest = props.lastEndMs;
    if (newest === null) return;
    const id = setTimeout(() => {
      setLastEndMs((v) => Math.max(v ?? 0, newest));
      setSlotStart((s) => (s === null ? s : Math.max(s, newest)));
    }, 0);
    return () => clearTimeout(id);
  }, [props.lastEndMs]);

  // Sound needs a first click/key press on the page before the browser allows it.
  useEffect(() => armChime(), []);

  const openPrompt = useCallback(
    (subtitle?: string) => {
      const now = Date.now();
      const endMs = floorToMinute(now);
      if (slotStart === null || endMs - slotStart < 60_000) return;
      const office =
        !subtitle &&
        officeCat !== undefined &&
        isOfficeSlot({ startMs: slotStart, endMs }, officeWindow(slotStart, timeZone, dayStartHour, props.settings));
      setPrompt({ startMs: slotStart, endMs, promptedAt: now, subtitle, office });
      if (document.hidden) playChime();
      if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const n = new Notification("Honest Hours", {
          body: `What did you do since ${formatClock(slotStart, timeZone)}?`,
          tag: "hh-checkin",
        });
        n.onclick = () => window.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settings/officeCat are fixed props
    [slotStart, timeZone, dayStartHour],
  );

  async function updateStatus(next: Mode) {
    const { error } = await createClient()
      .from("profiles")
      .update({
        status: next.status,
        status_since: next.sinceMs === null ? null : new Date(next.sinceMs).toISOString(),
        status_until: next.untilMs === null ? null : new Date(next.untilMs).toISOString(),
        status_label: next.label,
      })
      .eq("id", userId);
    if (error) return "Couldn't save your status. Check your connection and try again.";
    setMode({ status: next.status, label: next.label, sinceMs: next.sinceMs, untilMs: next.untilMs });
    return null;
  }

  const recordCheckin = (promptedAt: number, status: "skipped" | "missed") =>
    createClient()
      .from("checkins")
      .insert({ prompted_at: new Date(promptedAt).toISOString(), status })
      .then(({ error }) => error && console.error(`Check-in (${status}) not recorded:`, error.message));

  // Show the live state and next check-in time in the status bar.
  useEffect(() => {
    setCheckinStatus({ nextDueMs: active ? due : null, timeZone, mode, routineName: props.routine?.name ?? null });
  }, [due, active, timeZone, mode, props.routine?.name]);

  // Open the popup when due. Checked on a timer and whenever the tab becomes visible again.
  useEffect(() => {
    if (prompt || !active || due === null) return;
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

  // An open popup nobody answered for a whole interval counts as missed.
  // Two missed in a row late at night = you're asleep: go quiet, ask "When did you sleep?" in the morning.
  useEffect(() => {
    if (!prompt) return;
    const check = () => {
      const now = Date.now();
      if (now - prompt.promptedAt < intervalMin * 60_000) return;
      recordCheckin(prompt.promptedAt, "missed");
      missedInARow.current += 1;
      setPrompt(null);
      if (missedInARow.current >= QUIET_AFTER_MISSED && isLateNight(now, timeZone, dayStartHour)) {
        missedInARow.current = 0;
        updateStatus({ status: "sleeping", label: AUTO_QUIET, sinceMs: prompt.startMs, untilMs: null });
      } else {
        setLastPrompt(now);
      }
    };
    const id = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateStatus/recordCheckin only use stable props
  }, [prompt, intervalMin, timeZone, dayStartHour]);

  // Busy ends by itself at its end time (also if the app was closed meanwhile): then log the block.
  const endBusy = useCallback(async () => {
    const label = mode.label;
    const err = await updateStatus({ status: "normal", label: null, sinceMs: null, untilMs: null });
    if (err) return;
    setLastPrompt(null);
    openPrompt(label ? `Busy: ${label}` : "Busy time");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateStatus only uses stable props
  }, [mode.label, openPrompt]);

  useEffect(() => {
    if (mode.status !== "busy" || mode.untilMs === null) return;
    const until = mode.untilMs;
    const check = () => {
      if (Date.now() >= until) endBusy();
    };
    check();
    const id = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [mode.status, mode.untilMs, endBusy]);

  // One tap: write the routine (e.g. Office day) for today as entries. Parts of the routine that
  // overlap something already logged are cut out, and the part still in the future is not logged.
  async function runRoutine() {
    const routine = props.routine;
    if (!routine || routineBusy.current) return;
    routineBusy.current = true;
    try {
      const supabase = createClient();
      const now = Date.now();
      const day = dayOf(now, timeZone, dayStartHour);
      const { data: existing, error: readError } = await supabase
        .from("entries")
        .select("start_at, end_at")
        .lt("start_at", new Date(day.endMs).toISOString())
        .gt("end_at", new Date(day.startMs).toISOString());
      if (readError || !existing) {
        setNotice({ title: routine.name, message: "Couldn't read today's entries. Check your connection and try again." });
        return;
      }
      const segments = routineSegments(
        routine.items,
        day.date,
        timeZone,
        dayStartHour,
        now,
        existing.map((e) => ({ startMs: Date.parse(e.start_at), endMs: Date.parse(e.end_at) })),
      );
      if (segments.length === 0) {
        setNotice({ title: routine.name, message: "Nothing to add: this time is already logged, or hasn't happened yet." });
        return;
      }
      const { error } = await supabase.from("entries").insert(
        segments.map((s) => ({
          category_id: s.categoryId,
          start_at: new Date(s.startMs).toISOString(),
          end_at: new Date(s.endMs).toISOString(),
          source: "office_day",
          answers: s.answers,
        })),
      );
      if (error) {
        setNotice({
          title: routine.name,
          message:
            error.code === "23P01"
              ? "Something changed while saving. Reload the page and try again."
              : "Couldn't save. Check your connection and try again.",
        });
        return;
      }
      // Next check-in starts after the routine; time before it that was never logged stays Unknown.
      const newEnd = Math.max(...segments.map((s) => s.endMs));
      setLastEndMs((v) => Math.max(v ?? 0, newEnd));
      setSlotStart((s) => Math.max(s ?? 0, newEnd));
      setLastPrompt(null);
      router.refresh();
      setNotice({
        title: routine.name,
        message: `Added ${segments.length} ${segments.length === 1 ? "entry" : "entries"} to today.`,
      });
    } finally {
      routineBusy.current = false;
    }
  }

  // Commands from the status bar and the L key.
  useEffect(() => {
    const run = (command: string) => {
      if (command === "log-now" && !prompt && mode.status === "normal") openPrompt();
      if (command === "busy" && !prompt && mode.status === "normal") setBusyOpen(true);
      if (command === "end-busy" && mode.status === "busy") endBusy();
      if (command === "sleep" && !prompt && mode.status === "normal") {
        updateStatus({ status: "sleeping", label: null, sinceMs: floorToMinute(Date.now()), untilMs: null });
      }
      if (command === "awake" && mode.status === "sleeping") setWakeOpen(true);
      if (command === "routine" && !prompt && mode.status === "normal") runRoutine();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l" || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      run("log-now");
    };
    window.addEventListener("keydown", onKey);
    const off = onCommand(run);
    return () => {
      window.removeEventListener("keydown", onKey);
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateStatus only uses stable props
  }, [prompt, mode.status, openPrompt, endBusy]);

  async function startBusy(choice: BusyChoice, label: string): Promise<string | null> {
    const now = Date.now();
    const since = floorToMinute(now);
    const until =
      "minutes" in choice ? busyEndMs(since, choice.minutes) : nextClockOccurrence(choice.untilClock, now, timeZone);
    if (until === null || until <= since) return "Pick a valid end time.";
    const err = await updateStatus({ status: "busy", label: label || null, sinceMs: since, untilMs: until });
    if (!err) setBusyOpen(false);
    return err;
  }

  async function wake(input: WakeInput): Promise<string | null> {
    if (mode.status !== "sleeping" || mode.sinceMs === null) return null;
    const supabase = createClient();
    const now = Date.now();
    const endMs = floorToMinute(now);

    let sleepStart = mode.sinceMs;
    if (input.sleepClock) {
      const picked = lastClockOccurrence(input.sleepClock, now, timeZone);
      if (picked === null) return "Enter a valid time.";
      sleepStart = picked;
    }
    // Never overlap something already logged.
    sleepStart = Math.max(sleepStart, lastEndMs ?? 0);

    if (endMs - sleepStart >= 60_000) {
      const sleepCat = categories.find((c) => c.kind === "sleep");
      if (!sleepCat) return "You don't have a Sleep category. Add one in Settings, then try again.";
      const { error } = await supabase.from("entries").insert({
        category_id: sleepCat.id,
        start_at: new Date(sleepStart).toISOString(),
        end_at: new Date(endMs).toISOString(),
        source: "sleep_button",
        answers: {},
      });
      if (error) {
        return error.code === "23P01"
          ? "Part of that time already has an entry. Pick a later time you fell asleep."
          : "Couldn't save your sleep. Check your connection and try again.";
      }
    }

    // One day_logs row per day: keep the goal snapshot if today already has one.
    const day = dayOf(now, timeZone, dayStartHour);
    const goal = day.dayType === "weekend" ? props.weekendGoalMin : props.weekdayGoalMin;
    const dayFields = {
      wake_at: new Date(now).toISOString(),
      sleep_quality: input.quality,
      planned_study_min: input.planMin,
    };
    const existing = await supabase.from("day_logs").select("day").eq("day", day.date).maybeSingle();
    const logResult = existing.data
      ? await supabase.from("day_logs").update(dayFields).eq("day", day.date)
      : await supabase.from("day_logs").insert({ day: day.date, study_goal_min: goal, ...dayFields });
    if (logResult.error) console.error("Day log not saved:", logResult.error.message);
    router.refresh(); // the sleep entry and day log are saved even if the status update below fails

    const err = await updateStatus({ status: "normal", label: null, sinceMs: null, untilMs: null });
    if (err) return err;
    if (endMs - sleepStart >= 60_000) setLastEndMs(endMs);
    setSlotStart(endMs);
    setLastPrompt(null);
    missedInARow.current = 0;
    setWakeOpen(false);
    return null;
  }

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
    router.refresh();

    const lastPart = parts[parts.length - 1];
    setLastEntry({ categoryId: lastPart.categoryId, answers: lastPart.answers });
    setLastAnswers((prev) => ({ ...prev, ...Object.fromEntries(parts.map((p) => [p.categoryId, p.answers])) }));
    setLastEndMs(prompt.endMs);
    setSlotStart(prompt.endMs);
    setLastPrompt(null);
    missedInARow.current = 0;
    setPrompt(null);
    return null;
  }

  function skip() {
    if (!prompt) return;
    recordCheckin(prompt.promptedAt, "skipped");
    missedInARow.current = 0; // skipping is an answer: you're awake
    setLastPrompt(Date.now());
    setPrompt(null);
  }

  return (
    <>
      {prompt?.office && officeCat && (
        <OfficeModal
          key={prompt.promptedAt}
          startMs={prompt.startMs}
          endMs={prompt.endMs}
          timeZone={timeZone}
          onYes={() =>
            save([{ categoryId: officeCat.id, minutes: null, tagIds: [], answers: lastAnswers[officeCat.id] ?? {} }])
          }
          onSplit={() => setPrompt({ ...prompt, office: false })}
          onSkip={skip}
        />
      )}
      {notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}
      {prompt && !prompt.office && (
        <CheckinModal
          key={prompt.promptedAt}
          startMs={prompt.startMs}
          endMs={prompt.endMs}
          subtitle={prompt.subtitle}
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
      )}
      {busyOpen && <BusyModal presets={props.busyPresets} onStart={startBusy} onCancel={() => setBusyOpen(false)} />}
      {wakeOpen && mode.status === "sleeping" && mode.sinceMs !== null && (
        <WakeModal
          timeZone={timeZone}
          sleepSinceMs={mode.sinceMs}
          askSleepTime={mode.label === AUTO_QUIET}
          dayStartHour={dayStartHour}
          weekdayGoalMin={props.weekdayGoalMin}
          weekendGoalMin={props.weekendGoalMin}
          onSubmit={wake}
        />
      )}
    </>
  );
}
