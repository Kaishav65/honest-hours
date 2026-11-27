import type { StreakCell } from "./streak";

export const HEAT_WEEKS = 26;
/** Shades in the design system's heatmap: "x" = no data, "0" = nothing studied, 1–4 = how far past the goal, "f" = freeze. */
export type HeatLevel = "x" | "0" | "1" | "2" | "3" | "4" | "f";

/** `label` = "Thu, 26 Nov", `detail` = "41m of 2h", `note` = short status for the hover card; `title` joins label and detail. */
export type HeatDay = { date: string; level: HeatLevel; title: string; label: string; detail: string; note: string };

const dayMs = 86_400_000;
const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const plain = (min: number) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

/** Shade of one day: freeze = f; goal met = 3 (4 from 150%); missed = 0 or 1 (some study); today in progress uses the same scale. */
export function heatLevel(c: Pick<StreakCell, "state" | "studyMin" | "goalMin">): HeatLevel {
  if (c.state === "frozen") return "f";
  if (c.goalMin > 0 && c.studyMin >= c.goalMin * 1.5) return "4";
  if (c.studyMin >= c.goalMin) return c.studyMin > 0 || c.goalMin === 0 ? "3" : "0";
  if (c.studyMin >= c.goalMin / 2) return "2";
  return c.studyMin > 0 ? "1" : "0";
}

/**
 * Columns of weeks (Monday first) for the last `HEAT_WEEKS` weeks up to today's week. Days before the first
 * tracked day are "no data"; days after today are left out (null).
 */
export function heatColumns(cells: StreakCell[], todayDate: string, weeks = HEAT_WEEKS): (HeatDay | null)[][] {
  const byDate = new Map(cells.map((c) => [c.day.date, c]));
  const today = parse(todayDate);
  const dow = (new Date(today).getUTCDay() + 6) % 7; // Monday = 0
  const start = today - dow * dayMs - (weeks - 1) * 7 * dayMs;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const ms = start + (w * 7 + d) * dayMs;
      if (ms > today) return null;
      const date = iso(ms);
      const label = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(ms);
      const c = byDate.get(date);
      if (!c) return { date, level: "x", title: `${label}: no data`, label, detail: "No data", note: "Before tracking began" };
      const amount = `${plain(c.studyMin)} of ${plain(c.goalMin)}`;
      const met = c.studyMin >= c.goalMin;
      const level = heatLevel(c);
      const detail = c.state === "frozen" ? `freeze used (${amount})` : c.state === "today" ? `today so far: ${amount}` : `${amount}${met ? " ✓" : ""}`;
      const note =
        c.state === "frozen"
          ? "A freeze protected your streak"
          : level === "4"
            ? "150%+ of goal"
            : met
              ? "Goal met"
              : `${plain(c.goalMin - c.studyMin)} short of goal`;
      return {
        date,
        level,
        title: `${label}: ${detail}`,
        label,
        detail: c.state === "frozen" ? "Freeze used" : amount,
        note: c.state === "today" ? `Today so far · ${note}` : note,
      };
    }),
  );
}
