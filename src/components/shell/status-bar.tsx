"use client";

import { Bell, Moon, Pause, Plus, SunMoon } from "lucide-react";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("hh-theme", next);
}

// Static for now: live state arrives with check-ins (step 5) and Busy / Sleep (step 6).
export function StatusBar() {
  return (
    <header className="statusbar">
      <div className="state" data-kind="unknown">
        <span className="pulse" />
        <span>Now: Not tracking yet</span>
      </div>
      <div className="vsep" />
      <span className="status-item">
        <Bell className="lucide" aria-hidden />
        Next check-in <b>—</b>
      </span>
      <span className="spacer" />
      <button className="btn btn-primary btn-sm" disabled title="Coming in step 5">
        <Plus className="lucide" aria-hidden />
        Log now <span className="kbd">L</span>
      </button>
      <button className="btn btn-secondary btn-sm" disabled title="Coming in step 6">
        <Pause className="lucide" aria-hidden />
        Busy
      </button>
      <button className="btn btn-ghost btn-sm" disabled title="Coming in step 6">
        <Moon className="lucide" aria-hidden />
        Going to sleep
      </button>
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
