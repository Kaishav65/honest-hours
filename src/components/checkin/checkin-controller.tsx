"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { answersToFields } from "@/lib/checkin/answers";
import { mergeWake } from "@/lib/checkin/day-log";
import { cleanGoal, reviewDue } from "@/lib/checkin/review";
import { disciplineScore, focusScore, type ScoreEntry } from "@/lib/insights/scores";
import { computeToday, usualSleepMs, type InsightEntry } from "@/lib/insights/today";
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
import { pomodoroSpan } from "@/lib/checkin/pomodoro";
import {
  formatClock,
  onCommand,
  onPomodoro,
  setCheckinStatus,
  type Mode,
  type PomodoroRequest,
} from "@/lib/checkin/store";
import type { Answers, Category, LastEntry, Question } from "@/lib/checkin/types";
import { createClient } from "@/lib/supabase/client";
import { dayOf, localParts, splitSlot } from "@/lib/time";
import { BusyModal, type BusyChoice, type BusyPreset } from "./busy-modal";
import { CheckinModal, type SavePart } from "./checkin-modal";
import { NoticeModal } from "./notice-modal";
import { CoachToast, type ToastMessage } from "@/components/coach/coach-toast";
import { loadCoachFacts } from "@/lib/coach/facts";
import { candidatesFor, canNotify, pick, type CoachEvent, type SavedEntry, type ShownMessage } from "@/lib/coach/rules";
import type { Strictness } from "@/lib/coach/templates";
import { OfficeModal } from "./office-modal";
import { ReviewModal, type ReviewSummary } from "./review-modal";
import { PomodoroEndModal, type PomodoroResult } from "./pomodoro-end-modal";
import { WakeModal, type WakeInput } from "./wake-modal";

type Props = {
  userId: string;
  timeZone: string;
  dayStartHour: number;
  intervalMin: number;
  /** profiles.status. Popups only appear while "normal". */
  status: string;
  statusSinceMs: number | null;
  statusUntilMs: number | null;
  statusLabel: string | null;
  weekdayGoalMin: number;
  weekendGoalMin: number;
  busyPresets: BusyPreset[];
  /** The running pomodoro (the open `pomodoros` row), when status is "pomodoro". */
  pomodoro: { id: string; subjectId: string | null; plannedMin: number } | null;
  /** profiles.settings (office hours per day type). */
  settings: unknown;
  /** The one-tap routine (e.g. "Office day"), or null. */
  routine: { name: string; items: RoutineItem[] } | null;
  categories: Category[];
  questions: Question[];
  lastEndMs: number | null;
  lastEntry: LastEntry | null;
  lastAnswers: Record<string, Answers>;
  /** For the status bar. */
  streak: { days: number; freezes: number };
  /** Start times of sleep entries in the last 14 days (for the usual sleep time). */
  sleepStarts: number[];
  /** Today's day_logs: review already saved? one-goal already set? */
  reviewDone: boolean;
  todayGoal: string | null;
  /** Coach wording level, and the messages already shown (newest first). */
  strictness: Strictness;
  coachRecent: ShownMessage[];
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
// Opening the app on a new day with nothing logged for this long asks "When did you sleep / wake?"
// instead of starting the first slot at the day start (which made sleep look like it began at 3:00 AM).
const MORNING_GAP_MIN = 180;

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

const toStatus = (s: string): Status => (s === "busy" || s === "sleeping" || s === "pomodoro" ? s : "normal");

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
  /** Last entry's end when the Good-morning popup opened after a gap (not sleeping), else null. */
  const [gapSince, setGapSince] = useState<number | null>(null);
  const [busyOpen, setBusyOpen] = useState(false);
  const [pomo, setPomo] = useState(props.pomodoro);
  /** Set when the timer ran out or was stopped: the end popup is open until it is saved. */
  const [pomoEnd, setPomoEnd] = useState<{ endMs: number; completed: boolean } | null>(null);
  /** The evening review: opened by itself before usual sleep, or from "Going to sleep" (`thenSleep`). */
  const [review, setReview] = useState<{ summary: ReviewSummary | null; currentGoal: string | null; thenSleep: boolean } | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);
  // Set the moment a popup / the review opens, so two effects firing in the same tick can't both open one.
  const promptOpen = useRef(false);
  const reviewOpen = useRef(false);
  const missedInARow = useRef(0);
  const shownMessages = useRef(props.coachRecent);
  const coachChain = useRef<Promise<void>>(Promise.resolve());
  const [toast, setToast] = useState<ToastMessage | null>(null);
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
  const active = mode.status === "normal" && !wakeOpen && !busyOpen && !review;
  const pomodoroRunning = mode.status === "pomodoro" && pomo !== null && mode.untilMs !== null && mode.sinceMs !== null;

  useEffect(() => {
    const id = setTimeout(() => {
      const now = Date.now();
      const last = props.lastEndMs;
      if (
        props.status === "normal" &&
        last !== null &&
        last < dayOf(now, timeZone, dayStartHour).startMs &&
        now - last >= MORNING_GAP_MIN * 60_000
      ) {
        // The slot starts once the popup is answered (at the wake time) or skipped (now).
        setGapSince(last);
        setWakeOpen(true);
        return;
      }
      setSlotStart((s) => s ?? slotStartMs(last, now, timeZone, dayStartHour));
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

  // Status says "pomodoro" but there is no open session (e.g. the row was lost): go back to normal.
  useEffect(() => {
    if (props.status === "pomodoro" && !props.pomodoro) {
      void updateStatus({ status: "normal", label: null, sinceMs: null, untilMs: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on mount
  }, []);

  // Clear the guards only when a popup really closes (not on mount: StrictMode re-runs effects with stale state).
  const wasPrompt = useRef(false);
  const wasReview = useRef(false);
  useEffect(() => {
    if (wasPrompt.current && prompt === null) promptOpen.current = false;
    wasPrompt.current = prompt !== null;
  }, [prompt]);
  useEffect(() => {
    if (wasReview.current && review === null) reviewOpen.current = false;
    wasReview.current = review !== null;
  }, [review]);

  // Sound needs a first click/key press on the page before the browser allows it.
  useEffect(() => armChime(), []);

  const openPrompt = useCallback(
    (subtitle?: string) => {
      const now = Date.now();
      const endMs = floorToMinute(now);
      if (slotStart === null || endMs - slotStart < 60_000 || reviewOpen.current) return;
      const office =
        !subtitle &&
        officeCat !== undefined &&
        isOfficeSlot({ startMs: slotStart, endMs }, officeWindow(slotStart, timeZone, dayStartHour, props.settings));
      promptOpen.current = true;
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
    setCheckinStatus({
      nextDueMs: active ? due : null,
      timeZone,
      mode,
      routineName: props.routine?.name ?? null,
      streak: props.streak,
    });
  }, [due, active, timeZone, mode, props.routine?.name, props.streak]);

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
      if (missedInARow.current >= 3) emitCoach(() => ({ type: "missed", count: missedInARow.current }));
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

  // A pomodoro ends at its end time (also if the app was closed meanwhile): chime, notification, then the end popup.
  useEffect(() => {
    if (!pomodoroRunning || pomoEnd || mode.untilMs === null) return;
    const until = mode.untilMs;
    const check = () => {
      if (Date.now() < until) return;
      setPomoEnd({ endMs: until, completed: true });
      playChime();
      if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const n = new Notification("Honest Hours", {
          body: `${mode.label ?? "Your session"} is done. How did it go?`,
          tag: "hh-pomodoro",
        });
        n.onclick = () => window.focus();
      }
    };
    check();
    const id = setInterval(check, 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pomodoroRunning, pomoEnd, mode.untilMs, mode.label]);

  async function startPomodoro(req: PomodoroRequest) {
    if (mode.status !== "normal" || prompt || wakeOpen || busyOpen) {
      setNotice({ title: "Focus", message: "Finish what's open first (popup, busy or sleep), then start the session." });
      return;
    }
    const supabase = createClient();
    const startedMs = Date.now();
    const { data, error } = await supabase
      .from("pomodoros")
      .insert({ subject_id: req.subjectId, started_at: new Date(startedMs).toISOString(), planned_min: req.minutes })
      .select("id")
      .single();
    if (error || !data) {
      setNotice({ title: "Focus", message: "Couldn't start the session. Check your connection and try again." });
      return;
    }
    const err = await updateStatus({
      status: "pomodoro",
      label: req.subjectName,
      sinceMs: startedMs,
      untilMs: startedMs + req.minutes * 60_000,
    });
    if (err) {
      await supabase.from("pomodoros").delete().eq("id", data.id);
      setNotice({ title: "Focus", message: err });
      return;
    }
    setPomo({ id: data.id, subjectId: req.subjectId, plannedMin: req.minutes });
    setPomoEnd(null);
    markActedOn();
  }

  async function stopPomodoro() {
    if (!pomodoroRunning || pomoEnd || !pomo || mode.sinceMs === null) return;
    const now = Date.now();
    if (now - mode.sinceMs < 60_000) {
      // Under a minute: nothing worth logging. Drop the session.
      const { error } = await createClient().from("pomodoros").delete().eq("id", pomo.id);
      if (error) return setNotice({ title: "Focus", message: "Couldn't stop the session. Try again." });
      if (!(await updateStatus({ status: "normal", label: null, sinceMs: null, untilMs: null }))) {
        setPomo(null);
        router.refresh();
        setNotice({ title: "Focus", message: "Stopped before one minute, so nothing was logged." });
      }
      return;
    }
    setPomoEnd({ endMs: now, completed: false });
  }

  // End popup saved: Study entry + the pomodoros row, then back to normal tracking after the entry.
  async function savePomodoro(result: PomodoroResult): Promise<string | null> {
    if (!pomo || !pomoEnd || mode.sinceMs === null) return null;
    const studyCat = categories.find((c) => c.kind === "study");
    if (!studyCat) return "You don't have a Study category. Add one in Settings, then try again.";
    const supabase = createClient();
    const span = pomodoroSpan({ startedMs: mode.sinceMs, endedMs: pomoEnd.endMs, lastEndMs });
    let entryId: string | null = null;
    if (span) {
      const { data, error } = await supabase
        .from("entries")
        .insert({
          category_id: studyCat.id,
          start_at: new Date(span.startMs).toISOString(),
          end_at: new Date(span.endMs).toISOString(),
          source: "pomodoro",
          subject_id: pomo.subjectId,
          focus: result.focus,
          phone_checks: result.phoneChecks,
          answers: {},
        })
        .select("id")
        .single();
      if (error || !data) {
        return error?.code === "23P01"
          ? "Part of this time already has an entry. Reload the page and try again."
          : "Couldn't save. Check your connection and try again.";
      }
      entryId = data.id;
    }
    const { error: rowError } = await supabase
      .from("pomodoros")
      .update({ ended_at: new Date(pomoEnd.endMs).toISOString(), completed: result.completed, entry_id: entryId })
      .eq("id", pomo.id);
    if (rowError) console.error("Pomodoro row not saved:", rowError.message);
    const err = await updateStatus({ status: "normal", label: null, sinceMs: null, untilMs: null });
    if (err) return err;
    if (span) {
      setLastEndMs(span.endMs);
      setSlotStart(span.endMs); // the next check-in starts right after the session
      setLastEntry({ categoryId: studyCat.id, answers: lastAnswers[studyCat.id] ?? {} });
    }
    setLastPrompt(null);
    missedInARow.current = 0;
    setPomo(null);
    setPomoEnd(null);
    router.refresh();
    const minutes = span ? (span.endMs - span.startMs) / 60_000 : 0;
    emitCoach(
      () => ({ type: "pomodoro", focus: result.focus, phoneChecks: result.phoneChecks, completed: result.completed, minutes, subject: mode.label ?? "Study" }),
      minutes,
    );
    return null;
  }

  useEffect(() => {
    return onPomodoro((c) => {
      if (c.type === "start") void startPomodoro(c.request);
      else void stopPomodoro();
    });
  });

  // ---- Coach (PLAN §12): an event happened -> maybe one message ----
  // Events are handled one after another so two quick saves can't both show the same message.
  function emitCoach(makeEvent: (triggerWeek: Record<string, number>) => CoachEvent, studyAddedMin = 0, triggers: string[] = []) {
    coachChain.current = coachChain.current.then(async () => {
      try {
        const supabase = createClient();
        const nowMs = Date.now();
        const { facts, triggerWeek } = await loadCoachFacts(
          supabase,
          { timezone: timeZone, day_start_hour: dayStartHour, weekday_goal_min: props.weekdayGoalMin, weekend_goal_min: props.weekendGoalMin },
          props.sleepStarts,
          nowMs,
          studyAddedMin,
          triggers,
        );
        const picked = pick(candidatesFor(makeEvent(triggerWeek), facts), shownMessages.current, nowMs, props.strictness);
        if (!picked) return;
        const { data, error } = await supabase
          .from("coach_messages")
          .insert({ rule_key: picked.rule, severity: picked.severity, text: picked.text })
          .select("id")
          .single();
        if (error || !data) return console.error("Coach message not saved:", error?.message);
        shownMessages.current = [{ rule: picked.rule, severity: picked.severity, createdMs: nowMs }, ...shownMessages.current];
        setToast({ id: data.id, rule: picked.rule, severity: picked.severity, text: picked.text });
        let last: number | null = null;
        try {
          last = Number(localStorage.getItem("hh-coach-notified")) || null;
        } catch {
          // no storage: treat as never notified
        }
        if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted" && canNotify(picked.rule, last, nowMs)) {
          const n = new Notification("Honest Hours", { body: picked.text, tag: "hh-coach" });
          n.onclick = () => window.focus();
          try {
            localStorage.setItem("hh-coach-notified", String(nowMs));
          } catch {
            // ignore
          }
        }
        router.refresh();
      } catch (e) {
        console.error("Coach failed:", e);
      }
    });
  }

  // A pomodoro started within 10 minutes of a message counts as acting on it (shows which nudges work).
  function markActedOn() {
    void createClient()
      .from("coach_messages")
      .update({ acted_on: true })
      .eq("acted_on", false)
      .gt("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .then(({ error }) => error && console.error("acted_on not saved:", error.message));
  }

  // ---- Evening review (PLAN §4.10) ----
  const offeredKey = (date: string) => `hh-review-offered:${date}`;
  const wasOffered = (date: string) => {
    try {
      return localStorage.getItem(offeredKey(date)) !== null;
    } catch {
      return false;
    }
  };

  async function openReview(thenSleep: boolean) {
    reviewOpen.current = true;
    const nowMs = Date.now();
    const day = dayOf(nowMs, timeZone, dayStartHour);
    try {
      localStorage.setItem(offeredKey(day.date), "1"); // never offered twice in a day
    } catch {
      // private mode: the review may be offered again after a reload
    }
    setReview({ summary: null, currentGoal: null, thenSleep });
    const supabase = createClient();
    const tomorrow = dayOf(day.endMs, timeZone, dayStartHour);
    const [rows, cats, log, next] = await Promise.all([
      supabase
        .from("entries")
        .select("category_id, start_at, end_at, planned, focus, phone_checks")
        .lt("start_at", new Date(day.endMs).toISOString())
        .gt("end_at", new Date(day.startMs).toISOString()),
      supabase.from("categories").select("id, kind, value"),
      supabase.from("day_logs").select("study_goal_min, planned_study_min").eq("day", day.date).maybeSingle(),
      supabase.from("day_logs").select("tomorrow_goal").eq("day", tomorrow.date).maybeSingle(),
    ]);
    if (!rows.data || !cats.data) {
      setReview(null);
      if (thenSleep) sleepNow();
      return;
    }
    const byId = new Map(cats.data.map((c) => [c.id, c]));
    const entries: InsightEntry[] = rows.data.flatMap((r) => {
      const c = byId.get(r.category_id);
      return c
        ? [
            {
              categoryId: r.category_id,
              startMs: Date.parse(r.start_at),
              endMs: Date.parse(r.end_at),
              kind: c.kind as InsightEntry["kind"],
              value: c.value as InsightEntry["value"],
              planned: r.planned,
            },
          ]
        : [];
    });
    const goalMin = log.data?.study_goal_min ?? (day.dayType === "weekend" ? props.weekendGoalMin : props.weekdayGoalMin);
    const s = computeToday({ entries, day, nowMs, goalMin, usualSleepMs: nowMs });
    const scoreEntries: ScoreEntry[] = rows.data.flatMap((r) => {
      const c = byId.get(r.category_id);
      return c
        ? [{ kind: c.kind as ScoreEntry["kind"], startMs: Date.parse(r.start_at), endMs: Date.parse(r.end_at), planned: r.planned, focus: r.focus, phoneChecks: r.phone_checks }]
        : [];
    });
    const to = Math.min(day.endMs, nowMs);
    setReview({
      summary: {
        studyMin: s.studyMin,
        goalMin,
        wastedMin: s.wastedMin,
        wastedSessions: s.wastedSessions,
        plannedMin: log.data?.planned_study_min ?? null,
        trackedPct: s.trackedPct,
        unknownMin: s.unknownMin,
        focusScore: focusScore(scoreEntries, day.startMs, to),
        disciplineScore: disciplineScore({
          entries: scoreEntries,
          fromMs: day.startMs,
          toMs: to,
          plannedStudyMin: log.data?.planned_study_min ?? null,
          goalMin,
          goalHit: s.studyMin >= goalMin ? 1 : 0,
        }),
      },
      currentGoal: next.data?.tomorrow_goal ?? null,
      thenSleep,
    });
    emitCoach(() => ({ type: "review", auto: !thenSleep }));
  }

  function sleepNow() {
    const since = floorToMinute(Date.now());
    void updateStatus({ status: "sleeping", label: null, sinceMs: since, untilMs: null }).then((err) => {
      if (!err) emitCoach(() => ({ type: "sleep", timeLabel: formatClock(since, timeZone) }));
    });
  }

  function closeReview() {
    const thenSleep = review?.thenSleep;
    setReview(null);
    if (thenSleep) sleepNow();
  }

  async function saveReview(goalText: string): Promise<string | null> {
    const supabase = createClient();
    const day = dayOf(Date.now(), timeZone, dayStartHour);
    const tomorrow = dayOf(day.endMs, timeZone, dayStartHour);
    const goalFor = (type: string) => (type === "weekend" ? props.weekendGoalMin : props.weekdayGoalMin);
    const upsert = async (date: string, type: string, fields: { review_done?: boolean; tomorrow_goal?: string }) => {
      const found = await supabase.from("day_logs").select("day").eq("day", date).maybeSingle();
      if (found.error) return found.error;
      const res = found.data
        ? await supabase.from("day_logs").update(fields).eq("day", date)
        : await supabase.from("day_logs").insert({ day: date, study_goal_min: goalFor(type), ...fields });
      return res.error;
    };
    const goal = cleanGoal(goalText);
    const err = await upsert(day.date, day.dayType, { review_done: true });
    if (err) return "Couldn't save the review. Check your connection and try again.";
    if (goal) {
      const goalErr = await upsert(tomorrow.date, tomorrow.dayType, { tomorrow_goal: goal });
      if (goalErr) return "Saved the review, but not tomorrow's goal. Try again.";
    }
    setReviewSaved(true);
    router.refresh();
    closeReview();
    return null;
  }

  // Offer the review ~30 min before usual sleep (once a day).
  useEffect(() => {
    if (!active || prompt || pomoEnd) return;
    const check = () => {
      const now = Date.now();
      const day = dayOf(now, timeZone, dayStartHour);
      const sleepAt = usualSleepMs(props.sleepStarts, day, timeZone, dayStartHour);
      if (promptOpen.current || reviewOpen.current) return;
      if (
        reviewDue({
          nowMs: now,
          usualSleepMs: sleepAt,
          dayEndMs: day.endMs,
          done: props.reviewDone || reviewSaved,
          offered: wasOffered(day.date),
        })
      )
        void openReview(false);
    };
    check();
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openReview only uses stable props
  }, [active, prompt, pomoEnd, props.sleepStarts, props.reviewDone, reviewSaved, timeZone, dayStartHour]);

  // One tap: write the routine (e.g. Office day) for today as entries. Parts of the routine that
  // overlap something already logged are cut out, and the part still in the future is not logged.
  async function runRoutine() {
    const routine = props.routine;
    if (!routine || routineBusy.current) return;
    routineBusy.current = true;
    try {
      const supabase = createClient();
      const now = floorToMinute(Date.now()); // whole minutes, like check-in slots, so later slots don't inherit stray seconds
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
        // The review is offered once a day; skipping it never blocks sleep.
        const day = dayOf(Date.now(), timeZone, dayStartHour);
        if (props.reviewDone || reviewSaved || wasOffered(day.date)) sleepNow();
        else void openReview(true);
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
  }, [prompt, mode.status, openPrompt, endBusy, reviewSaved, props.reviewDone]);

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

  // "I'm awake" after sleeping, or the Good-morning popup after a gap (`gapSince`; status stays normal).
  async function wake(input: WakeInput): Promise<string | null> {
    const gap = mode.status !== "sleeping";
    const since = gap ? gapSince : mode.sinceMs;
    if (since === null) return null;
    const supabase = createClient();
    const now = Date.now();

    let endMs = floorToMinute(now);
    if (input.wakeClock) {
      const picked = lastClockOccurrence(input.wakeClock, now, timeZone);
      if (picked === null) return "Enter a valid time.";
      endMs = picked;
    }
    if (gap && endMs <= since) return `Pick a wake-up time after ${formatClock(since, timeZone)}.`;

    let sleepStart = since;
    if (input.sleepClock) {
      const picked = lastClockOccurrence(input.sleepClock, endMs, timeZone);
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
        source: gap ? "backfill" : "sleep_button",
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
      wake_at: new Date(endMs).toISOString(),
      sleep_quality: input.quality,
      planned_study_min: input.planMin,
      tomorrow_goal: input.goal ? cleanGoal(input.goal) : null,
    };
    // The first wake of the day wins: a later "I'm awake" (after a nap) must not replace the morning wake time or plan.
    const existing = await supabase
      .from("day_logs")
      .select("wake_at, sleep_quality, planned_study_min, tomorrow_goal")
      .eq("day", day.date)
      .maybeSingle();
    const logResult = existing.data
      ? await supabase.from("day_logs").update(mergeWake(existing.data, dayFields)).eq("day", day.date)
      : await supabase.from("day_logs").insert({ day: day.date, study_goal_min: goal, ...dayFields });
    if (logResult.error) console.error("Day log not saved:", logResult.error.message);
    router.refresh(); // the sleep entry and day log are saved even if the status update below fails

    if (!gap) {
      const err = await updateStatus({ status: "normal", label: null, sinceMs: null, untilMs: null });
      if (err) return err;
    }
    if (endMs - sleepStart >= 60_000) setLastEndMs(endMs);
    const wakeParts = localParts(endMs, timeZone);
    emitCoach(() => ({
      type: "awake",
      wakeHour: wakeParts.hour + wakeParts.minute / 60,
      quality: input.quality,
      planMin: input.planMin,
      sleepMin: endMs - sleepStart >= 60_000 ? (endMs - sleepStart) / 60_000 : null,
      timeLabel: formatClock(endMs, timeZone),
    }));
    setSlotStart(endMs);
    setGapSince(null);
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
    const savedEntries: SavedEntry[] = parts.map((p, i) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const row = rows[i] as { planned?: boolean | null; trigger?: string | null };
      return {
        categoryName: cat?.name ?? "",
        kind: cat?.kind ?? "",
        minutes: (spans[i].endMs - spans[i].startMs) / 60_000,
        value: cat?.value ?? "neutral",
        planned: row.planned ?? null,
        trigger: row.trigger ?? null,
        triggerWeek: 0,
      };
    });
    emitCoach(
      (tw) => ({ type: "checkin", saved: savedEntries.map((e) => ({ ...e, triggerWeek: e.trigger ? (tw[e.trigger] ?? 0) : 0 })) }),
      savedEntries.filter((e) => e.kind === "study").reduce((m, e) => m + e.minutes, 0),
      savedEntries.flatMap((e) => (e.trigger ? [e.trigger] : [])),
    );

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

  function skipMorning() {
    setSlotStart(floorToMinute(Date.now()));
    setGapSince(null);
    setWakeOpen(false);
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
      <CoachToast message={toast} onClose={() => setToast(null)} />
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
      {pomoEnd && pomo && mode.status === "pomodoro" && mode.sinceMs !== null && (
        <PomodoroEndModal
          key={pomo.id}
          subjectName={mode.label ?? "Study"}
          startMs={mode.sinceMs}
          endMs={pomoEnd.endMs}
          timeZone={timeZone}
          completed={pomoEnd.completed}
          onSave={savePomodoro}
        />
      )}
      {review && (
        <ReviewModal
          summary={review.summary}
          currentGoal={review.currentGoal}
          confirmLabel={review.thenSleep ? "Save & go to sleep" : "Save"}
          onSave={saveReview}
          onSkip={closeReview}
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
          askGoal={!props.todayGoal}
          onSubmit={wake}
        />
      )}
      {wakeOpen && mode.status === "normal" && gapSince !== null && (
        <WakeModal
          timeZone={timeZone}
          sleepSinceMs={gapSince}
          askSleepTime={false}
          gapSinceMs={gapSince}
          onSkip={skipMorning}
          dayStartHour={dayStartHour}
          weekdayGoalMin={props.weekdayGoalMin}
          weekendGoalMin={props.weekendGoalMin}
          askGoal={!props.todayGoal}
          onSubmit={wake}
        />
      )}
    </>
  );
}
