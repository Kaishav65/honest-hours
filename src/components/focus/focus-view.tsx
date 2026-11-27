"use client";

import { Bell, BellOff, BookOpen, Play, Plus, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatTimer, POMODORO_LENGTHS } from "@/lib/checkin/pomodoro";
import {
  formatClock,
  getCheckinStatus,
  getServerCheckinStatus,
  sendPomodoro,
  subscribeCheckin,
} from "@/lib/checkin/store";
import { useNow } from "@/lib/checkin/use-now";
import { createClient } from "@/lib/supabase/client";

export type Subject = { id: string; name: string };
export type Session = {
  id: string;
  subject: string;
  startMs: number;
  /** Null while the session is still running. */
  endMs: number | null;
  plannedMin: number;
  completed: boolean;
  focus: number | null;
  phoneChecks: number | null;
};

const C = 2 * Math.PI * 45; // ring circumference (r = 45 in a 100×100 viewBox)
const MIN = 60_000;

export function FocusView({
  subjects,
  sessions,
  lastSubjectId,
  timeZone,
}: {
  subjects: Subject[];
  sessions: Session[];
  lastSubjectId: string | null;
  timeZone: string;
}) {
  const router = useRouter();
  const { mode } = useSyncExternalStore(subscribeCheckin, getCheckinStatus, getServerCheckinStatus);
  const running = mode.status === "pomodoro" && mode.sinceMs !== null && mode.untilMs !== null;
  const now = useNow(running);

  const [minutes, setMinutes] = useState<number>(25);
  const [picked, setPicked] = useState<string | null>(lastSubjectId);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Read after mount: the server can't know the browser's permission, so reading it while rendering breaks hydration.
  const [notifPermission, setNotifPermission] = useState("unsupported");
  useEffect(() => {
    const id = setTimeout(() => typeof Notification !== "undefined" && setNotifPermission(Notification.permission), 0);
    return () => clearTimeout(id);
  }, []);

  const subject = subjects.find((s) => s.id === picked) ?? subjects[0] ?? null;
  const lenMs = running ? mode.untilMs! - mode.sinceMs! : minutes * MIN;
  const leftMs = running ? Math.max(0, mode.untilMs! - (now ?? mode.sinceMs!)) : lenMs;
  const done = sessions.filter((s) => s.endMs !== null);
  const completedCount = done.filter((s) => s.completed).length;
  const canStart = !running && subject !== null && mode.status === "normal";

  async function addSubject() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    const { data, error: err } = await createClient().from("subjects").insert({ name }).select("id").single();
    if (err || !data) {
      setError(err?.code === "23505" ? "You already have a subject with that name." : "Couldn't add the subject. Try again.");
      return;
    }
    setPicked(data.id);
    setNewName("");
    setAdding(false);
    router.refresh();
  }

  return (
    <section className="page focus">
      <article className="card timer-card">
        <div className="seg" data-single role="group" aria-label="Session length">
          {POMODORO_LENGTHS.map((m) => (
            <button key={m} aria-pressed={lenMs === m * MIN} disabled={running} onClick={() => setMinutes(m)}>
              {m} min
            </button>
          ))}
        </div>
        <div>
          <div className="overline" style={{ marginBottom: ".5rem" }}>
            What are you studying?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", justifyContent: "center" }}>
            {(running ? subjects.filter((s) => s.name === mode.label) : subjects).map((s) => (
              <button
                key={s.id}
                className="chip"
                data-kind="study"
                aria-pressed={running || subject?.id === s.id}
                disabled={running}
                onClick={() => setPicked(s.id)}
              >
                <BookOpen className="lucide" aria-hidden />
                {s.name}
              </button>
            ))}
            {!running && !adding && (
              <button className="chip chip-dashed" onClick={() => setAdding(true)}>
                <Plus className="lucide" aria-hidden />
                Subject
              </button>
            )}
          </div>
          {adding && !running && (
            <form
              style={{ display: "flex", gap: ".5rem", justifyContent: "center", marginTop: ".6rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                void addSubject();
              }}
            >
              <input
                className="input"
                style={{ width: "12rem" }}
                aria-label="New subject name"
                placeholder="e.g. DSA"
                maxLength={40}
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button className="btn btn-secondary" type="submit" disabled={!newName.trim()}>
                Add
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </form>
          )}
          {error && (
            <p className="sm" role="alert" style={{ color: "var(--danger)", marginTop: ".4rem" }}>
              {error}
            </p>
          )}
        </div>
        <div className="timer">
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle className="track" cx="50" cy="50" r="45" />
            <circle
              className="prog"
              cx="50"
              cy="50"
              r="45"
              style={{ strokeDasharray: C, strokeDashoffset: C * (1 - leftMs / lenMs) }}
            />
          </svg>
          <div className="read">
            <span className="overline">{running ? "Focusing" : "Ready"}</span>
            <span className="clock" data-testid="timer-clock">
              {formatTimer(leftMs)}
            </span>
            <span className="sm muted">Session {done.length + 1} today</span>
          </div>
        </div>
        <div className="row">
          {running ? (
            <button className="btn btn-secondary btn-lg" onClick={() => sendPomodoro({ type: "stop" })}>
              <Square className="lucide" aria-hidden />
              Stop early
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg"
              disabled={!canStart}
              onClick={() =>
                subject && sendPomodoro({ type: "start", request: { subjectId: subject.id, subjectName: subject.name, minutes } })
              }
            >
              <Play className="lucide" aria-hidden />
              Start focus
            </button>
          )}
        </div>
        {!running && mode.status !== "normal" && (
          <p className="xs muted">End your {mode.status === "busy" ? "busy time" : "sleep"} first to start a session.</p>
        )}
        {!running && subjects.length === 0 && <p className="xs muted">Add a subject to start.</p>}
        <div className="xs muted row">
          <BellOff className="lucide" aria-hidden />
          Check-in popups pause while a session runs. It&apos;s logged as Study automatically.
        </div>
        {notifPermission === "default" && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => Notification.requestPermission().then((p) => setNotifPermission(p))}
          >
            <Bell className="lucide" aria-hidden />
            Get a notification when a session ends
          </button>
        )}
      </article>

      <article className="card">
        <div className="card-head">
          <h2 className="card-title">Today&apos;s sessions</h2>
          <span className="spacer" />
          {done.length > 0 && (
            <span className="badge badge-success">
              {completedCount} of {done.length} completed
            </span>
          )}
        </div>
        <div className="scroll">
          {running && mode.sinceMs !== null && (
            <div className="entry">
              <span className="dot" data-kind="study" />
              <span style={{ fontWeight: 500 }}>{mode.label}</span>
              <span className="d">
                <span className="badge badge-success">running</span>
              </span>
              <span className="t">{formatClock(mode.sinceMs, timeZone)} – now</span>
            </div>
          )}
          {[...done].reverse().map((s) => (
            <div key={s.id} className="entry">
              <span className="dot" data-kind="study" />
              <span style={{ fontWeight: 500 }}>{s.subject}</span>
              <span className="d">
                {s.focus !== null ? <span className="badge badge-success">Focus {s.focus}/5</span> : <span className="badge">No rating</span>}
              </span>
              <span className="t">
                {formatClock(s.startMs, timeZone)} – {formatClock(s.endMs!, timeZone)}
                {s.phoneChecks !== null ? ` · ${s.phoneChecks} phone check${s.phoneChecks === 1 ? "" : "s"}` : ""} ·{" "}
                {s.completed ? "completed" : "stopped early"}
              </span>
            </div>
          ))}
          {!running && done.length === 0 && <p className="sm muted">No sessions yet today. Start one.</p>}
        </div>
      </article>
    </section>
  );
}
