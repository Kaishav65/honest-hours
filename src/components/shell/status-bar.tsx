"use client";

import { Bell, Briefcase, Flame, Moon, Pause, Plus, Snowflake, Square, Sun, SunMoon } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  formatClock,
  getCheckinStatus,
  getServerCheckinStatus,
  sendCommand,
  sendPomodoro,
  subscribeCheckin,
} from "@/lib/checkin/store";
import { formatTimer } from "@/lib/checkin/pomodoro";
import { useNow } from "@/lib/checkin/use-now";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("hh-theme", next);
}

function PomodoroClock({ untilMs }: { untilMs: number }) {
  const now = useNow();
  return <span className="time">{now === null ? "--:--" : formatTimer(untilMs - now)}</span>;
}

// Live state and next check-in come from the check-in controller (see lib/checkin/store.ts).
export function StatusBar() {
  const { nextDueMs, timeZone, mode, routineName, streak } = useSyncExternalStore(
    subscribeCheckin,
    getCheckinStatus,
    getServerCheckinStatus,
  );
  const { status } = mode;

  return (
    <header className="statusbar">
      <div className="state" data-kind={status === "busy" ? "busy" : status === "sleeping" ? "sleep" : status === "pomodoro" ? "study" : "unknown"}>
        <span className="pulse" />
        <span>
          {status === "busy" && (
            <>
              Busy{mode.label ? `: ${mode.label}` : ""}
              {mode.untilMs ? <span className="sub"> · until {formatClock(mode.untilMs, timeZone)}</span> : null}
            </>
          )}
          {status === "sleeping" && (
            <>
              Sleeping
              {mode.sinceMs ? <span className="sub"> · since {formatClock(mode.sinceMs, timeZone)}</span> : null}
            </>
          )}
          {status === "pomodoro" && (
            <>
              Now: Study{mode.label ? ` (${mode.label})` : ""}{" "}
              {mode.untilMs ? <PomodoroClock untilMs={mode.untilMs} /> : null}
            </>
          )}
          {status === "normal" && "Now: Tracking"}
        </span>
      </div>
      <div className="vsep" />
      <span className="status-item">
        <Bell className="lucide" aria-hidden />
        Next check-in <b>{nextDueMs ? formatClock(nextDueMs, timeZone) : "—"}</b>
      </span>
      <span className="spacer" />
      {streak && (
        <span className="streak" title={`${streak.days}-day study streak`}>
          <Flame className="lucide" aria-hidden />
          {streak.days}
        </span>
      )}
      {streak && streak.freezes > 0 && (
        <span className="badge badge-info" title="Streak freezes saved: one covers a missed day automatically">
          <Snowflake className="lucide" aria-hidden />
          {streak.freezes} freeze{streak.freezes === 1 ? "" : "s"}
        </span>
      )}
      {streak && <div className="vsep" />}
      {status === "normal" && (
        <>
          <button className="btn btn-primary btn-sm" onClick={() => sendCommand("log-now")} title="Log what you did so far (L)">
            <Plus className="lucide" aria-hidden />
            Log now <span className="kbd">L</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => sendCommand("busy")} title="Pause popups for a while">
            <Pause className="lucide" aria-hidden />
            Busy
          </button>
          {routineName && (
            <button className="btn btn-secondary btn-sm" onClick={() => sendCommand("routine")} title={`Log "${routineName}" in one tap`}>
              <Briefcase className="lucide" aria-hidden />
              {routineName}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => sendCommand("sleep")} title="Stop popups and log sleep">
            <Moon className="lucide" aria-hidden />
            Going to sleep
          </button>
        </>
      )}
      {status === "busy" && (
        <button className="btn btn-secondary btn-sm" onClick={() => sendCommand("end-busy")}>
          <Square className="lucide" aria-hidden />
          End busy
        </button>
      )}
      {status === "pomodoro" && (
        <>
          <Link href="/focus" className="btn btn-secondary btn-sm">
            Focus
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={() => sendPomodoro({ type: "stop" })}>
            <Square className="lucide" aria-hidden />
            Stop early
          </button>
        </>
      )}
      {status === "sleeping" && (
        <button className="btn btn-primary btn-sm" onClick={() => sendCommand("awake")}>
          <Sun className="lucide" aria-hidden />
          I&apos;m awake
        </button>
      )}
      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={toggleTheme}
        title="Toggle light / dark"
        aria-label="Toggle light / dark"
      >
        <SunMoon className="lucide" aria-hidden />
      </button>
    </header>
  );
}
