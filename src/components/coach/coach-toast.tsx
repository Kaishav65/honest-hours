"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CoachMessage } from "./coach-message";

export type ToastMessage = { id: string; rule: string; severity: string; text: string };

// Rules whose next step is "start a pomodoro".
const START_RULES = new Set([
  "drift_1", "drift_2", "drift_3", "drift_long", "drift_trigger", "free_now", "goal_at_risk", "last_chance",
  "pomo_done_good", "pomo_done_weak", "pomo_abandoned", "missed_yesterday", "two_missed", "early_start", "normal_wake",
]);

/** Shows the newest coach message for a few seconds (bottom right). */
export function CoachToast({ message, onClose }: { message: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, 12_000);
    return () => clearTimeout(id);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="toasts" role="status" aria-live="polite" data-testid="coach-toast">
      <CoachMessage severity={message.severity} text={message.text} className="toast">
        {START_RULES.has(message.rule) && (
          <Link href="/focus" className="btn btn-primary btn-sm" onClick={onClose}>
            Start pomodoro
          </Link>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Dismiss
        </button>
      </CoachMessage>
    </div>
  );
}
