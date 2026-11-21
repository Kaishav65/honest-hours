// Tiny shared store so the status bar can show the next check-in and ask for "Log now",
// while the check-in controller owns the timer and the popup.

export type CheckinStatus = { nextDueMs: number | null; timeZone: string };

let state: CheckinStatus = { nextDueMs: null, timeZone: "Asia/Kolkata" };
const listeners = new Set<() => void>();

export const subscribeCheckin = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getCheckinStatus = () => state;
export const getServerCheckinStatus = () => state;

export function setCheckinStatus(next: CheckinStatus) {
  if (next.nextDueMs === state.nextDueMs && next.timeZone === state.timeZone) return;
  state = next;
  listeners.forEach((fn) => fn());
}

const LOG_NOW = "hh:log-now";
export const requestLogNow = () => window.dispatchEvent(new Event(LOG_NOW));
export function onLogNow(fn: () => void) {
  window.addEventListener(LOG_NOW, fn);
  return () => window.removeEventListener(LOG_NOW, fn);
}

export function formatClock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone, hour: "numeric", minute: "2-digit" })
    .format(ms)
    .toUpperCase();
}
