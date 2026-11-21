// Time-zone helpers using Intl only (no dependencies). All instants are epoch milliseconds (UTC).

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock parts of an instant in a time zone. */
export function localParts(ms: number, timeZone: string): LocalParts {
  const p: Record<string, number> = {};
  for (const { type, value } of formatter(timeZone).formatToParts(ms)) p[type] = Number(value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** The instant at which the wall clock in `timeZone` reads the given time. Month is 1–12; overflow (e.g. day 32) rolls over. */
export function zonedTimeToMs(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Guess, then correct by the zone's offset at the guess (twice, to settle around DST changes).
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess, timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += asUtc - shown;
  }
  return guess;
}
