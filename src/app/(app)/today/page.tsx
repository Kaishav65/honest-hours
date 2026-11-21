import { Gauge, Hourglass, House, Smartphone } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { CategoryIcon } from "@/components/checkin/category-icon";
import type { CategoryKind } from "@/lib/checkin/types";
import { formatClock } from "@/lib/checkin/store";
import { computeToday, usualSleepMs, type InsightEntry } from "@/lib/insights/today";
import { createClient } from "@/lib/supabase/server";
import { dayOf, localParts } from "@/lib/time";
import { buildBlocks } from "@/lib/time/blocks";

export default function TodayPage() {
  return (
    <Suspense>
      <TodayData />
    </Suspense>
  );
}

const MIN = 60_000;

/** "2h 38m" with small units, as the design system's stat style. */
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

const plain = (min: number) => {
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

function greeting(hour: number) {
  return hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";
}

async function TodayData() {
  await connection(); // per-user and time-dependent: render at request time, never prerender
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, day_start_hour, weekday_goal_min, weekend_goal_min")
    .eq("id", userId)
    .single();
  if (!profile) return null;
  const tz = profile.timezone;
  const startHour = profile.day_start_hour;

  // Server component rendered per request (after connection()), so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const day = dayOf(nowMs, tz, startHour);

  const { data: cats } = await supabase.from("categories").select("id, name, icon, kind, value");
  if (!cats) return null;
  const sleepIds = cats.filter((c) => c.kind === "sleep").map((c) => c.id);

  const [rows, log, sleeps] = await Promise.all([
    supabase
      .from("entries")
      .select("id, category_id, start_at, end_at, source, planned")
      .lt("start_at", new Date(day.endMs).toISOString())
      .gt("end_at", new Date(day.startMs).toISOString())
      .order("start_at"),
    supabase.from("day_logs").select("study_goal_min, planned_study_min").eq("day", day.date).maybeSingle(),
    sleepIds.length
      ? supabase
          .from("entries")
          .select("start_at")
          .in("category_id", sleepIds)
          .gte("start_at", new Date(nowMs - 14 * 24 * 60 * MIN).toISOString())
      : Promise.resolve({ data: [] as { start_at: string }[] }),
  ]);
  if (!rows.data) return null;

  const byId = new Map(cats.map((c) => [c.id, c]));
  const entries: InsightEntry[] = rows.data.flatMap((r) => {
    const c = byId.get(r.category_id);
    return c
      ? [
          {
            categoryId: r.category_id,
            startMs: Date.parse(r.start_at),
            endMs: Date.parse(r.end_at),
            kind: c.kind as CategoryKind,
            value: c.value as InsightEntry["value"],
            planned: r.planned,
          },
        ]
      : [];
  });

  const goalMin =
    log.data?.study_goal_min ?? (day.dayType === "weekend" ? profile.weekend_goal_min : profile.weekday_goal_min);
  const sleepAt = usualSleepMs((sleeps.data ?? []).map((s) => Date.parse(s.start_at)), day, tz, startHour);
  const s = computeToday({ entries, day, nowMs, goalMin, usualSleepMs: sleepAt });

  const blocks = buildBlocks(
    entries.map((e, i) => ({ id: String(i), categoryId: e.categoryId, startMs: e.startMs, endMs: e.endMs, source: "" })),
    day,
    nowMs,
  );
  const nowOffset = Math.round((Math.min(nowMs, day.endMs) - day.startMs) / MIN);
  const pct = goalMin > 0 ? Math.min(100, Math.round((s.studyMin / goalMin) * 100)) : 100;
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" }).format(
    Date.parse(`${day.date}T00:00:00Z`),
  );
  const axis = Array.from({ length: 9 }, (_, i) => formatClock(day.startMs + i * 180 * MIN, tz));
  const usualSleepOffset = Math.round((sleepAt - day.startMs) / MIN);
  const maxCat = s.byCategory[0]?.min ?? 1;

  const freeParts: { kind: CategoryKind; label: string; min: number }[] = [
    { kind: "study", label: "Study", min: s.studyMin },
    { kind: "entertainment", label: "Entertainment", min: s.entertainmentMin },
    { kind: "rest", label: "Rest", min: s.restMin },
  ];
  const pips = Math.min(12, s.pomodorosPossible);

  const em: ReactNode =
    s.pomodorosNeeded > 0 ? (
      <>
        <em>
          {s.pomodorosNeeded} pomodoro{s.pomodorosNeeded === 1 ? "" : "s"}
        </em>{" "}
        left for today.
      </>
    ) : (
      <em>Study goal reached.</em>
    );

  return (
    <section className="page today">
      <div className="today-head">
        <div>
          <div className="overline">
            {weekday} · {day.dayType === "weekend" ? "Weekend" : "Weekday"} · Day starts {formatClock(day.startMs, tz)}
          </div>
          <h1 className="display greet">
            {greeting(localParts(nowMs, tz).hour)}, {profile.display_name}. {em}
          </h1>
        </div>
      </div>

      <article className="card tile tile-goal">
        <div className="ring-wrap">
          <div className="ring" style={{ "--p": pct } as CSSProperties} />
          <span className="ring-label">{pct}%</span>
        </div>
        <div style={{ display: "grid", gap: ".35rem", minWidth: 0 }}>
          <div className="overline">Study today</div>
          <div className="stat">
            <Dur min={s.studyMin} />
          </div>
          <div className="sm ink2">
            {s.goalRemainingMin > 0 ? `${plain(s.goalRemainingMin)} left of ${plain(goalMin)}` : `Goal of ${plain(goalMin)} reached`}
          </div>
          {log.data?.planned_study_min != null && (
            <span className="badge" style={{ justifySelf: "start" }}>
              <Gauge className="lucide" aria-hidden />
              Planned {plain(log.data.planned_study_min)}
            </span>
          )}
        </div>
      </article>

      <article className="card tile">
        <div className="top">
          <House className="lucide" aria-hidden />
          <span className="overline">Free time at home</span>
        </div>
        <div className="stat">
          <Dur min={s.freeMin} />
        </div>
        <div className="stack" aria-hidden>
          {freeParts.map((p) => (
            <span key={p.kind} data-kind={p.kind} style={{ flex: `${Math.max(p.min, 0)} 1 0` }} />
          ))}
        </div>
        <div className="legend">
          {freeParts.map((p) => (
            <span key={p.kind}>
              <i className="dot" data-kind={p.kind} />
              {p.label} {plain(p.min)}
            </span>
          ))}
        </div>
      </article>

      <article className="card tile">
        <div className="top">
          <Hourglass className="lucide" aria-hidden />
          <span className="overline">Free time left</span>
          <span className="spacer" />
          <span className="xs muted">sleep ~{formatClock(sleepAt, tz)}</span>
        </div>
        <div className="stat">
          <Dur min={s.freeLeftMin} />
        </div>
        <div className="pips" title="Pomodoros possible before usual sleep (filled = needed for the goal)">
          {Array.from({ length: pips }, (_, i) => (
            <span key={i} className={i < s.pomodorosNeeded ? "pip need" : "pip"} />
          ))}
        </div>
        <div className="sm ink2">
          <b>{s.pomodorosNeeded}</b> needed of <b>{s.pomodorosPossible}</b> possible pomodoros
        </div>
      </article>

      <article className="card tile">
        <div className="top">
          <Smartphone className="lucide" aria-hidden />
          <span className="overline">Wasted today</span>
        </div>
        <div className="stat" style={{ color: s.wastedMin > 0 ? "var(--value-waste)" : undefined }}>
          <Dur min={s.wastedMin} />
        </div>
        <div className="sm ink2">
          Unplanned entertainment · {s.wastedSessions} session{s.wastedSessions === 1 ? "" : "s"}
        </div>
        <div className="xs muted">
          Win back half = <b className="ink2">{plain(s.wastedMin / 2)}</b> study
        </div>
      </article>

      <article className="card ribbon-card">
        <div className="card-head">
          <h2 className="card-title">Your day</h2>
          <span className="xs muted">
            {formatClock(day.startMs, tz)} → {formatClock(day.endMs, tz)} ·{" "}
            <Link href="/timeline" style={{ textDecoration: "underline" }}>
              open the Timeline
            </Link>{" "}
            to edit or fill gaps
          </span>
          <span className="spacer" />
          <span className="badge" title="Logged time ÷ time passed today">
            {Math.round(s.trackedPct)}% tracked
            {s.unknownMin >= 1 ? ` · ${plain(s.unknownMin)} unknown` : ""}
          </span>
        </div>
        <div className="ribbon">
          {blocks.map((b) => {
            const cat = b.type === "entry" ? byId.get(entries[Number(b.entry.id)].categoryId) : undefined;
            return (
              <div
                key={`${b.type}-${b.startMs}`}
                className="blk"
                data-kind={b.type === "gap" ? "unknown" : ((cat?.kind as CategoryKind | undefined) ?? "unknown")}
                style={{ "--s": Math.round((b.startMs - day.startMs) / MIN), "--d": Math.round((b.endMs - b.startMs) / MIN), cursor: "default" } as CSSProperties}
              />
            );
          })}
          <div className="mark sleepline" style={{ "--s": usualSleepOffset } as CSSProperties}>
            {Math.abs(usualSleepOffset - nowOffset) > 120 && <span>Usual sleep</span>}
          </div>
          <div className="mark" style={{ "--s": nowOffset } as CSSProperties}>
            <span>Now</span>
          </div>
        </div>
        <div className="axis" aria-hidden>
          {axis.map((label, i) => (
            <span key={i} style={{ left: `${(i / 8) * 100}%`, whiteSpace: "nowrap" }}>
              {label}
            </span>
          ))}
        </div>
      </article>

      <article className="card where-card">
        <div className="card-head">
          <h2 className="card-title">Where time went</h2>
          <span className="spacer" />
          <span className="xs muted">so far today</span>
        </div>
        <div className="scroll where-list">
          {s.byCategory.map((c) => {
            const cat = byId.get(c.categoryId);
            return (
              <div key={c.categoryId} className="where-row" data-kind={c.kind}>
                <CategoryIcon name={cat?.icon ?? null} />
                <span>{cat?.name}</span>
                <div className="bar">
                  <span style={{ width: `${(c.min / maxCat) * 100}%` }} />
                </div>
                <span className="v">{plain(c.min)}</span>
              </div>
            );
          })}
          {s.unknownMin >= 1 && (
            <div className="where-row" data-kind="unknown">
              <i className="dot" data-kind="unknown" />
              <span>Unknown</span>
              <div className="bar">
                <span style={{ width: `${(s.unknownMin / maxCat) * 100}%`, background: "var(--border-strong)" }} />
              </div>
              <span className="v">{plain(s.unknownMin)}</span>
            </div>
          )}
          {s.byCategory.length === 0 && s.unknownMin < 1 && <p className="sm muted">Nothing logged yet today.</p>}
        </div>
      </article>
    </section>
  );
}
