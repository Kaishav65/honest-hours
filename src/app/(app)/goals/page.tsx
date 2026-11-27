import type { Metadata } from "next";
import { CalendarCheck, Flame, Snowflake, Trophy } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/shell/page-loading";
import { HeatGrid } from "@/components/goals/heat-grid";
import { heatColumns } from "@/lib/insights/heatmap";
import { FREEZE_EVERY, MAX_FREEZES, streakSummary } from "@/lib/insights/streak";
import { loadStudyHistory } from "@/lib/insights/study-history";
import { createClient } from "@/lib/supabase/server";

export default function GoalsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <GoalsData />
    </Suspense>
  );
}

const plain = (min: number) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }).format(Date.parse(`${date}T00:00:00Z`));
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

async function GoalsData() {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, day_start_hour, weekday_goal_min, weekend_goal_min")
    .eq("id", userId)
    .single();
  if (!profile) return null;

  // Server component rendered per request (after connection()), so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const { history, today } = await loadStudyHistory(supabase, profile, Date.now());
  const sum = streakSummary(history);
  const cols = heatColumns(sum.cells, today.date);
  const hasData = history.length > 0;

  return (
    <section className="page" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 className="display" style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
        Goals
      </h1>
      <div className="tabs" role="tablist">
        <button role="tab" className="tab" aria-selected="true">
          Streak
        </button>
        <button role="tab" className="tab" aria-selected="false" disabled title="Subject goals arrive in v3">
          Subject goals · later
        </button>
      </div>
      <div className="scroll" style={{ flex: 1, display: "grid", gap: "var(--gutter)", alignContent: "start", paddingBottom: "var(--space-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--gutter)" }}>
          <article className="card tile" style={{ gridColumn: "auto" }}>
            <div className="top">
              <Flame className="lucide" aria-hidden />
              <span className="overline">Current streak</span>
            </div>
            <div className="stat" data-testid="streak-current">
              {sum.current}
              <span className="u">d</span>
            </div>
            <div className="xs muted">Today joins once its goal is met</div>
          </article>
          <article className="card tile" style={{ gridColumn: "auto" }}>
            <div className="top">
              <Trophy className="lucide" aria-hidden />
              <span className="overline">Best streak</span>
            </div>
            <div className="stat" data-testid="streak-best">
              {sum.best}
              <span className="u">d</span>
            </div>
            <div className="xs muted">Longest run so far</div>
          </article>
          <article className="card tile" style={{ gridColumn: "auto" }}>
            <div className="top">
              <Snowflake className="lucide" aria-hidden />
              <span className="overline">Freezes saved</span>
            </div>
            <div className="stat" data-testid="streak-freezes">
              {sum.freezes} <span className="u">of {MAX_FREEZES}</span>
            </div>
            <div className="xs muted">Earn 1 every {FREEZE_EVERY} goal days</div>
          </article>
          <article className="card tile" style={{ gridColumn: "auto" }}>
            <div className="top">
              <CalendarCheck className="lucide" aria-hidden />
              <span className="overline">Goal days</span>
            </div>
            <div className="stat" data-testid="streak-met">
              {sum.metDays}
            </div>
            <div className="xs muted">
              of {history.length} tracked day{history.length === 1 ? "" : "s"}
            </div>
          </article>
        </div>

        <article className="card" style={{ gap: ".8rem" }}>
          <div className="card-head">
            <h2 className="card-title">Streak heatmap</h2>
            <span className="xs muted">last {cols.length} weeks · Mon to Sun</span>
            <span className="spacer" />
            <span className="xs muted">
              Goals: weekday {plain(profile.weekday_goal_min)} · weekend {plain(profile.weekend_goal_min)} ·{" "}
              <Link href="/settings" style={{ textDecoration: "underline" }}>
                change in Settings
              </Link>
            </span>
          </div>
          {hasData ? (
            <div style={{ display: "flex", gap: ".5rem", overflow: "auto" }}>
              <div style={{ display: "grid", gridTemplateRows: "repeat(7, .85rem)", gap: "3px" }} aria-hidden>
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="xs muted" style={{ lineHeight: ".85rem" }}>
                    {d}
                  </span>
                ))}
              </div>
              <HeatGrid cols={cols} />
            </div>
          ) : (
            <div className="learning" style={{ padding: "var(--space-6)" }}>
              <p className="sm muted">Your heatmap starts with your first logged day.</p>
            </div>
          )}
          <div className="legend">
            <span>
              <i className="heat-key" data-l="x" /> No data
            </span>
            <span>
              <i className="heat-key" data-l="0" /> Nothing
            </span>
            <span>
              <i className="heat-key" data-l="1" /> Some
            </span>
            <span>
              <i className="heat-key" data-l="3" /> Goal met
            </span>
            <span>
              <i className="heat-key" data-l="4" /> 150%+
            </span>
            <span>
              <i className="heat-key" data-l="f" /> Freeze used
            </span>
          </div>
        </article>

        <article className="card" style={{ gap: ".5rem" }}>
          <h2 className="card-title">Freeze history</h2>
          {sum.events.length === 0 ? (
            <p className="sm muted">No freezes earned yet. Hit your goal {FREEZE_EVERY} days to earn the first one.</p>
          ) : (
            <ul style={{ display: "grid", gap: ".3rem" }} data-testid="freeze-history">
              {[...sum.events].reverse().map((e, i) => (
                <li key={i} className="sm" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  <Snowflake className="lucide" aria-hidden />
                  <span>
                    {dateLabel(e.date)}: {e.type === "earned" ? "freeze earned" : "freeze used, streak saved"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

export const metadata: Metadata = { title: "Goals · Honest Hours" };
