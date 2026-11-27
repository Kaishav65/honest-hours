import type { Metadata } from "next";
import { ArrowRight, CircleCheck, Flame, Gauge, Hourglass, House, Play, Smartphone, Sprout, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { PageLoading } from "@/components/shell/page-loading";
import { CategoryIcon } from "@/components/checkin/category-icon";
import type { CategoryKind } from "@/lib/checkin/types";
import { formatClock } from "@/lib/checkin/store";
import { computeStreak, ON_TRACK_MIN_DAYS, onTrack, restOfDaySamples } from "@/lib/insights/streak";
import { loadStudyHistory } from "@/lib/insights/study-history";
import { disciplineScore, focusScore, type ScoreEntry } from "@/lib/insights/scores";
import { computeToday, usualSleepMs, type InsightEntry } from "@/lib/insights/today";
import { createClient } from "@/lib/supabase/server";
import { dayOf, localParts } from "@/lib/time";
import { buildBlocks } from "@/lib/time/blocks";
import { DayRibbon, type RibbonBlock } from "@/components/timeline/day-ribbon";
import { CoachHistory } from "@/components/coach/coach-history";
import { CoachMessage } from "@/components/coach/coach-message";
import { streakAtRiskNudge } from "@/lib/coach/nudges";

export default function TodayPage() {
  return (
    <Suspense fallback={<PageLoading />}>
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
    .select("display_name, timezone, day_start_hour, weekday_goal_min, weekend_goal_min, coach_strictness")
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

  const [rows, log, sleeps, hist, coach] = await Promise.all([
    supabase
      .from("entries")
      .select("id, category_id, start_at, end_at, source, planned, focus, phone_checks")
      .lt("start_at", new Date(day.endMs).toISOString())
      .gt("end_at", new Date(day.startMs).toISOString())
      .order("start_at"),
    supabase.from("day_logs").select("study_goal_min, planned_study_min, tomorrow_goal").eq("day", day.date).maybeSingle(),
    sleepIds.length
      ? supabase
          .from("entries")
          .select("start_at")
          .in("category_id", sleepIds)
          .gte("start_at", new Date(nowMs - 14 * 24 * 60 * MIN).toISOString())
      : Promise.resolve({ data: [] as { start_at: string }[] }),
    loadStudyHistory(supabase, profile, nowMs),
    supabase.from("coach_messages").select("id, severity, text, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (!rows.data) return null;
  const entryIds = rows.data.map((r) => r.id);
  const tagRows = entryIds.length
    ? ((await supabase.from("entry_tags").select("entry_id, tag_category_id").in("entry_id", entryIds)).data ?? [])
    : [];

  const byId = new Map(cats.map((c) => [c.id, c]));
  const entries: (InsightEntry & { id: string })[] = rows.data.flatMap((r) => {
    const c = byId.get(r.category_id);
    return c
      ? [
          {
            id: r.id,
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
  const streak = computeStreak(hist.history);
  const scoreEntries: ScoreEntry[] = rows.data.flatMap((r) => {
    const c = byId.get(r.category_id);
    return c
      ? [{ kind: c.kind as CategoryKind, startMs: Date.parse(r.start_at), endMs: Date.parse(r.end_at), planned: r.planned, focus: r.focus, phoneChecks: r.phone_checks }]
      : [];
  });
  const scoreTo = Math.min(day.endMs, nowMs);
  const focus = focusScore(scoreEntries, day.startMs, scoreTo);
  const discipline = disciplineScore({
    entries: scoreEntries,
    fromMs: day.startMs,
    toMs: scoreTo,
    plannedStudyMin: log.data?.planned_study_min ?? null,
    goalMin,
    goalHit: s.studyMin >= goalMin ? 1 : 0,
  });
  const track = onTrack(s.studyMin, goalMin, restOfDaySamples(hist.history, day, nowMs, hist.study));

  // "While doing" (e.g. YouTube during Dinner): the main entry owns the time, so tags are reported, never added.
  const tagsByEntry = new Map<string, string[]>();
  for (const t of tagRows) tagsByEntry.set(t.entry_id, [...(tagsByEntry.get(t.entry_id) ?? []), t.tag_category_id]);
  const catName = (id: string) => byId.get(id)?.name ?? "Deleted category";
  const whileDoing = new Map<string, { tag: string; main: string; min: number }>();
  const until = Math.min(day.endMs, nowMs);
  for (const e of entries) {
    const min = Math.max(0, Math.min(e.endMs, until) - Math.max(e.startMs, day.startMs)) / MIN;
    for (const tag of tagsByEntry.get(e.id) ?? []) {
      const row = whileDoing.get(`${tag}|${e.categoryId}`) ?? { tag, main: e.categoryId, min: 0 };
      row.min += min;
      whileDoing.set(`${tag}|${e.categoryId}`, row);
    }
  }
  const whileDoingText = [...whileDoing.values()]
    .filter((w) => w.min >= 1)
    .sort((a, b) => b.min - a.min)
    .map((w) => `${catName(w.tag)} during ${catName(w.main)} · ${plain(w.min)}`)
    .join(", ");

  const blocks = buildBlocks(
    entries.map((e) => ({ id: e.id, categoryId: e.categoryId, startMs: e.startMs, endMs: e.endMs, source: "" })),
    day,
    nowMs,
  );
  const ribbonBlocks: RibbonBlock[] = blocks.map((b) => {
    const cat = b.type === "entry" ? byId.get(b.entry.categoryId) : undefined;
    return {
      key: `${b.type}-${b.startMs}`,
      name: b.type === "gap" ? (b.open ? "Now (being tracked)" : "Unknown") : (cat?.name ?? "Deleted category"),
      kind: b.type === "gap" ? "unknown" : (cat?.kind ?? "unknown"),
      startMs: b.startMs,
      endMs: b.endMs,
      s: Math.round((b.startMs - day.startMs) / MIN),
      d: Math.round((b.endMs - b.startMs) / MIN),
      hint: "click to open the Timeline",
      // The block running up to "now" (only while the day is still going) shimmers like the design preview.
      live: nowMs < day.endMs && b.endMs >= nowMs - MIN && b.startMs < nowMs,
    };
  });
  const nowOffset = Math.round((Math.min(nowMs, day.endMs) - day.startMs) / MIN);
  const pct = goalMin > 0 ? Math.min(100, Math.round((s.studyMin / goalMin) * 100)) : 100;
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" }).format(
    Date.parse(`${day.date}T00:00:00Z`),
  );
  const axis = Array.from({ length: 9 }, (_, i) => formatClock(day.startMs + i * 180 * MIN, tz));
  // A usual bedtime after the day's end (e.g. 3:25 AM) sits at the ribbon's right edge.
  const usualSleepOffset = Math.round((Math.min(sleepAt, day.endMs) - day.startMs) / MIN);
  const maxCat = s.byCategory[0]?.min ?? 1;
  const nudge = streakAtRiskNudge({
    streakDays: streak.streak,
    studyMin: s.studyMin,
    goalMin,
    freeLeftMin: s.freeLeftMin,
    usualSleepLabel: formatClock(sleepAt, tz),
    localHour: localParts(nowMs, tz).hour,
  });
  const when = (iso: string) => {
    const ms = Date.parse(iso);
    return ms >= day.startMs && ms < day.endMs
      ? formatClock(ms, tz)
      : new Intl.DateTimeFormat("en-IN", { timeZone: tz, day: "numeric", month: "short" }).format(ms) + ", " + formatClock(ms, tz);
  };
  const coachItems = (coach.data ?? []).map((m) => ({ id: m.id, severity: m.severity, text: m.text, when: when(m.created_at) }));
  const strictnessLabel = profile.coach_strictness.charAt(0).toUpperCase() + profile.coach_strictness.slice(1);

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
        <span className="spacer" />
        {log.data?.tomorrow_goal && (
          <div className="note">
            <small>Today&apos;s one goal</small>
            {log.data.tomorrow_goal}
          </div>
        )}
      </div>

      <article className="card tile tile-goal">
        <div className="ring-wrap">
          <div className="ring" style={{ "--p": pct } as CSSProperties} />
          <span className="ring-label">{pct}%</span>
        </div>
        <div style={{ display: "grid", gap: ".35rem", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <span className="overline">Study today</span>
            <span
              className="streak"
              title={`${streak.streak}-day study streak${streak.freezes ? ` · ${streak.freezes} freeze${streak.freezes === 1 ? "" : "s"} saved` : ""}${streak.todayMet ? "" : " · today joins once the goal is met"}`}
            >
              <Flame className="lucide" aria-hidden />
              {streak.streak}
            </span>
          </div>
          <div className="stat">
            <Dur min={s.studyMin} />
          </div>
          <div className="sm ink2">
            {s.goalRemainingMin > 0 ? `${plain(s.goalRemainingMin)} left of ${plain(goalMin)}` : `Goal of ${plain(goalMin)} reached`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }}>
            {track?.state === "learning" && (
              <span
                className="badge"
                title={`The on-track check needs ${ON_TRACK_MIN_DAYS} ${day.dayType} days of data: ${track.daysToGo} to go`}
              >
                <Sprout className="lucide" aria-hidden />
                Learning your pace…
              </span>
            )}
            {track && track.state !== "learning" && (
              <span
                className={`badge ${track.state === "on-track" ? "badge-success" : track.state === "close" ? "badge-warning" : "badge-danger"}`}
                title="Study so far + your average study after this time on recent days of the same type"
              >
                {track.state === "on-track" ? <CircleCheck className="lucide" aria-hidden /> : track.state === "close" ? <Gauge className="lucide" aria-hidden /> : <TriangleAlert className="lucide" aria-hidden />}
                {track.state === "on-track" ? "On track" : track.state === "close" ? "Close" : "At risk"} · {track.pct}% at
                usual pace
              </span>
            )}
            {log.data?.planned_study_min != null && <span className="badge">Planned {plain(log.data.planned_study_min)}</span>}
          </div>
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
        <div className="sm ink2" style={{ display: "flex", alignItems: "center", gap: ".5rem", justifyContent: "space-between" }}>
          <span>
            <b>{s.pomodorosNeeded}</b> needed of <b>{s.pomodorosPossible}</b> possible
          </span>
          <Link href="/focus" className="btn btn-soft btn-sm">
            <Play className="lucide" aria-hidden />
            Start
          </Link>
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
        <DayRibbon blocks={ribbonBlocks} timeZone={tz}>
          <div className="mark sleepline" style={{ "--s": usualSleepOffset } as CSSProperties}>
            {Math.abs(usualSleepOffset - nowOffset) > 120 && <span>Usual sleep</span>}
          </div>
          <div className="mark" style={{ "--s": nowOffset } as CSSProperties}>
            <span>Now {formatClock(nowMs, tz)}</span>
          </div>
        </DayRibbon>
        <div className="axis" aria-hidden>
          {axis.map((label, i) => (
            <span key={i} style={{ left: `${(i / 8) * 100}%`, whiteSpace: "nowrap" }}>
              {label}
            </span>
          ))}
        </div>
      </article>

      <article className="card coach-card">
        <div className="card-head">
          <h2 className="card-title">Coach</h2>
          <span className="badge" title="How direct the coach is (Settings)">{strictnessLabel}</span>
          <span className="spacer" />
          <CoachHistory items={coachItems} />
        </div>
        <div className="scroll coach-list">
          {nudge && <CoachMessage severity="info" text={nudge} time="live" />}
          {coachItems.slice(0, 8).map((m) => (
            <CoachMessage key={m.id} severity={m.severity} text={m.text} time={m.when} />
          ))}
          {!nudge && coachItems.length === 0 && (
            <p className="sm muted">
              Nothing yet. The coach speaks when something happens: a check-in, a pomodoro, waking up.
            </p>
          )}
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
        <div className="scores" data-testid="scores">
          <span
            className={`badge ${focus === null ? "" : "badge-info"}`}
            title={focus === null ? "Rate your focus after a pomodoro to get a focus score" : "Average focus (1–5) weighted by minutes, minus a penalty for phone checks"}
          >
            Focus {focus ?? "—"}
          </span>
          <span
            className={`badge ${discipline === null ? "" : "badge-info"}`}
            title="Plan kept 50% · planned fun 30% · goal hit 20%"
          >
            Discipline {discipline ?? "—"}
          </span>
        </div>
        {whileDoingText && (
          <div className="xs muted while-doing">
            <i className="dot" data-kind="entertainment" />
            While doing: {whileDoingText} (not counted twice)
          </div>
        )}
      </article>

      <article className="card recent-card">
        <div className="card-head">
          <h2 className="card-title">Entries</h2>
          <span className="spacer" />
          <Link href="/timeline" className="btn btn-ghost btn-sm">
            Timeline
            <ArrowRight className="lucide" aria-hidden />
          </Link>
        </div>
        <div className="scroll">
          {[...blocks].reverse().map((b) => {
            const cat = b.type === "entry" ? byId.get(b.entry.categoryId) : undefined;
            const tags = b.type === "entry" ? (tagsByEntry.get(b.entry.id) ?? []) : [];
            const open = b.type === "gap" && b.open;
            return (
              <div key={`${b.type}-${b.startMs}`} className="entry">
                <i className="dot" data-kind={b.type === "gap" ? "unknown" : (cat?.kind ?? "unknown")} />
                <span style={{ fontWeight: 500 }}>
                  {b.type === "gap" ? (open ? "Now" : "Unknown") : (cat?.name ?? "Deleted category")}
                  {tags.length > 0 && <span className="xs muted"> + {tags.map(catName).join(", ")}</span>}
                </span>
                <span className="d">
                  {b.type === "gap" && !open ? (
                    <Link href="/timeline" className="btn btn-soft btn-sm">
                      Fill
                    </Link>
                  ) : (
                    plain((b.endMs - b.startMs) / MIN)
                  )}
                </span>
                <span className="t">
                  {formatClock(b.startMs, tz)} – {open ? "now" : formatClock(b.endMs, tz)}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

export const metadata: Metadata = { title: "Today · Honest Hours" };
