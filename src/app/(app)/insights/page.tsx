import type { Metadata } from "next";
import { Check, Recycle, Sunrise, Target, TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type CSSProperties } from "react";
import { loadWeek } from "@/lib/insights/week-data";
import { WEEK_UNLOCK_DAYS, type Metric } from "@/lib/insights/weekly";
import { createClient } from "@/lib/supabase/server";

export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <Suspense>
      <InsightsData searchParams={searchParams} />
    </Suspense>
  );
}

const plain = (min: number) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Dur({ min }: { min: number }) {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  return (
    <>
      {h > 0 && (
        <>
          {h}
          <span className="u">h</span>{" "}
        </>
      )}
      {m % 60}
      <span className="u">m</span>
    </>
  );
}

function MetricRow({ m }: { m: Metric }) {
  return (
    <div className="metric" data-testid={`metric-${m.key}`}>
      <span>{m.name}</span>
      <span className="muted tabular">{m.value}</span>
      <span className="grade" data-g={m.grade ?? "-"}>
        {m.grade ?? "–"}
      </span>
    </div>
  );
}

async function InsightsData({ searchParams }: { searchParams: PageProps<"/insights">["searchParams"] }) {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const q = await searchParams;
  const tab = q.tab === "report" ? "report" : "week";
  const last = q.week === "last";
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
  const { week: w, days, today } = await loadWeek(supabase, profile, Date.now(), last ? -1 : 0);
  const href = (t: string, wk: boolean) => `/insights?tab=${t}${wk ? "&week=last" : ""}`;
  const maxDay = Math.max(60, ...w.stats.map((s) => Math.max(s.studyMin, s.goalMin, s.expectedMin ?? 0)));
  const range = `${new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }).format(Date.parse(`${days[0].date}T00:00:00Z`))} – ${new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }).format(Date.parse(`${days[6].date}T00:00:00Z`))}`;

  return (
    <section className="page" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="row">
        <h1 className="display" style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
          Insights
        </h1>
        <span className="xs muted">{range}</span>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Week">
          <Link href={href(tab, true)} role="button" aria-pressed={last} className="seg-link">
            Last week
          </Link>
          <Link href={href(tab, false)} role="button" aria-pressed={!last} className="seg-link">
            This week
          </Link>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <Link href={href("week", last)} role="tab" className="tab" aria-selected={tab === "week"}>
          {last ? "Last week" : "This week"}
        </Link>
        <Link href={href("report", last)} role="tab" className="tab" aria-selected={tab === "report"}>
          Report card
        </Link>
        <button role="tab" className="tab" aria-selected="false" disabled title="Patterns arrive in v3">
          Patterns · later
        </button>
        <button role="tab" className="tab" aria-selected="false" disabled title="Long-term arrives in v3">
          Long-term · later
        </button>
      </div>

      {!w.unlocked ? (
        <div className="learning" data-testid="locked">
          <div className="big-ic">
            <TrendingUp className="lucide" aria-hidden />
          </div>
          <h2 className="card-title">Unlocks after {WEEK_UNLOCK_DAYS} days</h2>
          <p className="sm muted">
            {w.loggedDays} of {WEEK_UNLOCK_DAYS} logged days {last ? "that week" : "this week"}. Weekly numbers need a few days of data to mean something.
          </p>
        </div>
      ) : tab === "week" ? (
        <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
          <div className="week" data-testid="week">
            <article className="card tile" style={{ gridColumn: "auto" }}>
              <div className="top">
                <TrendingUp className="lucide" aria-hidden />
                <span className="overline">{last ? "Week total" : "Weekly projection"}</span>
              </div>
              <div className="stat" data-testid="week-projection">
                {w.projection === null ? <span className="muted">—</span> : <Dur min={w.projection} />}{" "}
                <span className="sm muted" style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}>
                  of {plain(w.weeklyGoal)} goal
                </span>
              </div>
              <div className="stack" aria-hidden>
                <span data-kind="study" style={{ flex: `${Math.max(w.studySoFar, 0)} 1 0` }} />
                <span
                  style={{
                    flex: `${Math.max((w.projection ?? w.studySoFar) - w.studySoFar, 0)} 1 0`,
                    background: "repeating-linear-gradient(135deg, var(--sage-200) 0 5px, transparent 5px 9px)",
                  }}
                />
              </div>
              <div className="sm ink2">
                {w.projection === null ? (
                  <>Studied <b>{plain(w.studySoFar)}</b> so far. A projection needs some logged days of the days still to come (weekday and weekend).</>
                ) : w.remainingDays === 0 ? (
                  <>Studied <b>{plain(w.studySoFar)}</b> of {plain(w.weeklyGoal)}.</>
                ) : w.dailyGap !== null && w.dailyGap > 0 ? (
                  <><b>+{plain(w.dailyGap)} a day</b> for the {w.remainingDays} day{w.remainingDays === 1 ? "" : "s"} left closes the gap.</>
                ) : (
                  <>On pace to reach the weekly goal.</>
                )}
              </div>
              <div className="xs muted">Commute this week: {plain(w.commuteMin)} (listening / reading time)</div>
            </article>

            <article className="card tile" style={{ gridColumn: "auto" }}>
              <div className="top">
                <Recycle className="lucide" aria-hidden />
                <span className="overline">Recoverable time</span>
              </div>
              <div className="stat" style={{ color: w.wastedMin > 0 ? "var(--value-waste)" : undefined }} data-testid="week-wasted">
                <Dur min={w.wastedMin} />
              </div>
              <div className="sm ink2">
                Win back half = <b>+{plain(w.recoverableHalfMin)} study</b> ({w.recoverablePomodoros} pomodoro{w.recoverablePomodoros === 1 ? "" : "s"})
              </div>
              <div className="xs muted" data-testid="week-triggers">
                {w.triggers.length === 0
                  ? "No unplanned entertainment this week."
                  : `Biggest leak${w.topWindow ? `: ${hourLabel(w.topWindow.startHour)}–${hourLabel((w.topWindow.startHour + 2) % 24)}` : ""} · ${w.triggers
                      .slice(0, 2)
                      .map((t) => `"${t.trigger}" ${t.share}%`)
                      .join(", ")}`}
              </div>
            </article>

            <article className="card tile" style={{ gridColumn: "auto" }}>
              <div className="top">
                <Sunrise className="lucide" aria-hidden />
                <span className="overline">Best focus hours</span>
              </div>
              <div className="stat" data-testid="week-focus-hour">
                {w.bestFocusHour ? (
                  <>
                    {hourLabel(w.bestFocusHour.hour)}
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div className="sm ink2">
                {w.bestFocusHour ? (
                  <>
                    Avg focus <b>{w.bestFocusHour.avg.toFixed(1)}</b> over {w.bestFocusHour.sessions} sessions
                  </>
                ) : (
                  "Needs 3 rated sessions in the same hour (last 28 days)."
                )}
              </div>
              <div className="xs muted">
                {w.strongDay && w.weakDay
                  ? `Strongest day: ${DOW[w.strongDay.dow]} · weakest: ${DOW[w.weakDay.dow]}`
                  : "Strongest / weakest weekday needs 2 logged weeks."}
                {w.focus !== null || w.discipline !== null ? ` · Focus ${w.focus ?? "—"} · Discipline ${w.discipline ?? "—"}` : ""}
              </div>
            </article>

            <article className="card" style={{ gridColumn: "1 / -1", minHeight: "14rem" }}>
              <div className="card-head">
                <h2 className="card-title">Study per day</h2>
                <span className="spacer" />
                <div className="legend">
                  <span>
                    <span className="dot" data-kind="study" />
                    Studied
                  </span>
                  <span>
                    <span style={{ width: "1rem", borderTop: "1.5px dashed var(--ink-3)" }} />
                    Goal
                  </span>
                  <span>
                    <span className="dot" style={{ background: "repeating-linear-gradient(135deg, var(--sage-300) 0 2px, transparent 2px 4px)", outline: "1px dashed var(--sage-400)" }} />
                    Expected (your average)
                  </span>
                </div>
              </div>
              <div className="days" data-testid="days">
                {w.stats.map((s, i) => {
                  const isToday = s.day.date === today.date;
                  const value = s.future ? s.expectedMin : s.studyMin;
                  return (
                    <div key={s.day.date} className={`day ${isToday ? "today-d" : ""}`} data-date={s.day.date}>
                      <div className="area">
                        <div className="goal" style={{ bottom: `${(s.goalMin / maxDay) * 88}%` } as CSSProperties} title={`Goal ${plain(s.goalMin)}`} />
                        {value !== null && value > 0 && (
                          <div className={`col ${s.future ? "proj" : ""}`} style={{ height: `${(value / maxDay) * 88}%` }}>
                            <b>
                              {s.future ? "~" : ""}
                              {plain(value)}
                            </b>
                          </div>
                        )}
                      </div>
                      <span>{isToday ? "Today" : DOW_SHORT[i]}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
          <div className="report" data-testid="report">
            <article className="card">
              <div className="card-head">
                <span className="card-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  <Check className="lucide" aria-hidden />
                </span>
                <h2 className="card-title">Strong</h2>
              </div>
              <div className="scroll">
                {w.strong.length === 0 && <p className="sm muted">Nothing graded B or better yet.</p>}
                {w.strong.map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </div>
            </article>
            <article className="card">
              <div className="card-head">
                <span className="card-icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  <TriangleAlert className="lucide" aria-hidden />
                </span>
                <h2 className="card-title">Needs work</h2>
              </div>
              <div className="scroll">
                {w.needsWork.length === 0 && <p className="sm muted">Nothing below a B. Keep going.</p>}
                {w.needsWork.map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </div>
            </article>
            {w.fix && (
              <article className="card fix" data-testid="fix">
                <span className="card-icon" style={{ background: "var(--primary-soft)", color: "var(--primary-soft-ink)" }}>
                  <Target className="lucide" aria-hidden />
                </span>
                <div>
                  <div className="card-title">Fix one thing {last ? "" : "next week"}: {w.fix.metric.name.toLowerCase()}</div>
                  <div className="sm ink2">
                    Right now {w.fix.metric.value} (grade {w.fix.metric.grade}).{w.fix.gain ? ` ${w.fix.gain}.` : ""}
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export const metadata: Metadata = { title: "Insights · Honest Hours" };
