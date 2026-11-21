// Tiny shared store so the status bar can show the live state (tracking / busy / sleeping) and the
// next check-in, and can send commands, while the check-in controller owns the timer and popups.

export type Mode = {
  status: "normal" | "busy" | "sleeping";
  label: string | null;
  sinceMs: number | null;
  untilMs: number | null;
};

export type CheckinStatus = {
  nextDueMs: number | null;
  timeZone: string;
  mode: Mode;
  /** Name of the one-tap routine ("Office day"), or null when the user has none. */
  routineName: string | null;
};

const NORMAL: Mode = { status: "normal", label: null, sinceMs: null, untilMs: null };
let state: CheckinStatus = { nextDueMs: null, timeZone: "Asia/Kolkata", mode: NORMAL, routineName: null };
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
  const same =
    next.nextDueMs === state.nextDueMs &&
    next.timeZone === state.timeZone &&
    next.routineName === state.routineName &&
    next.mode.status === state.mode.status &&
    next.mode.label === state.mode.label &&
    next.mode.sinceMs === state.mode.sinceMs &&
    next.mode.untilMs === state.mode.untilMs;
  if (same) return;
  state = next;
  listeners.forEach((fn) => fn());
}

export type Command = "log-now" | "busy" | "sleep" | "awake" | "end-busy" | "routine";
const EVENT = "hh:command";
export const sendCommand = (command: Command) =>
  window.dispatchEvent(new CustomEvent<Command>(EVENT, { detail: command }));
export function onCommand(fn: (command: Command) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<Command>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function formatClock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone, hour: "numeric", minute: "2-digit" })
    .format(ms)
    .toUpperCase();
}
