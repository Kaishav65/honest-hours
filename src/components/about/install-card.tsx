"use client";

import { Check, Download, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

// The browser's own install prompt (Chrome / Edge / Android). Not in the TS DOM types.
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const canPrompt = () => deferred !== null;

const standaloneQuery = "(display-mode: standalone)";
const subscribeStandalone = (cb: () => void) => {
  const mq = window.matchMedia(standaloneQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const isStandalone = () => window.matchMedia(standaloneQuery).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const BENEFITS = [
  "Opens in its own window with an icon, like any app. No hunting through browser tabs.",
  "Check-in popups, the chime and the pomodoro alarm are easier to notice.",
  "One tap from your home screen or taskbar, so logging stays a 5-second habit.",
];

const WAYS = [
  { where: "Chrome / Edge on laptop", how: "Click the install icon at the right end of the address bar, then Install." },
  { where: "Android (Chrome)", how: "Menu ⋮ → Install app (or Add to Home screen)." },
  { where: "iPhone / iPad (Safari)", how: "Tap Share → Add to Home Screen → Add." },
];

export function InstallCard() {
  const installed = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const ready = useSyncExternalStore(subscribe, canPrompt, () => false);
  const [declined, setDeclined] = useState(false);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    if (outcome === "dismissed") setDeclined(true);
  }

  if (installed) {
    return (
      <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: ".75rem", borderColor: "var(--success)" }}>
        <Check className="lucide" aria-hidden style={{ color: "var(--success)" }} />
        <p className="sm">
          <strong>You&apos;re using the installed app.</strong> That&apos;s the best way to use Honest Hours.
        </p>
      </div>
    );
  }

  return (
    <div className="card" data-testid="install-card" style={{ gap: ".75rem", background: "var(--primary-soft)", borderColor: "var(--primary)", borderWidth: 2 }}>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <span className="card-icon" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>
          <Smartphone className="lucide" aria-hidden />
        </span>
        <h2 className="card-title">Install Honest Hours as an app</h2>
        <span className="badge badge-warning">Strongly recommended</span>
      </div>
      <ul className="sm" style={{ display: "grid", gap: ".35rem", paddingLeft: "1.1rem", listStyle: "disc" }}>
        {BENEFITS.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      {ready && (
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={install}>
            <Download className="lucide" aria-hidden /> Install now
          </button>
          {declined && <span className="xs muted">No problem. You can install later from your browser menu.</span>}
        </div>
      )}
      <div style={{ display: "grid", gap: ".3rem" }}>
        <span className="overline">{ready ? "Or install by hand" : "How to install"}</span>
        {WAYS.map((w) => (
          <p key={w.where} className="sm">
            <strong>{w.where}:</strong> {w.how}
          </p>
        ))}
      </div>
    </div>
  );
}
