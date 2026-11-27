import type { Metadata } from "next";
import {
  Bell,
  BookOpen,
  CalendarRange,
  ChartColumn,
  House,
  Info,
  Lightbulb,
  Settings,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { InstallCard } from "@/components/about/install-card";

export const metadata: Metadata = { title: "About · Honest Hours" };

const STEPS = [
  { n: 1, title: "Answer the popup", text: "Every 30–60 minutes a small popup asks what you just did. Tap a category (Study, Instagram, Meal, Sleep…). Five seconds. Did two things? You can split the time." },
  { n: 2, title: "Watch your day fill up", text: "Today shows study vs your goal, free time left and time wasted. Nothing to calculate, it's all automatic. Grey gaps are time you haven't logged yet." },
  { n: 3, title: "Improve a little each day", text: "The coach nudges you, your streak grows, and the weekly report tells you the one thing to fix. After 7 days the coach learns your pace." },
];

const PAGES: { icon: LucideIcon; name: string; key: number; text: string }[] = [
  { icon: House, name: "Today", key: 1, text: "Your day at a glance: study, free time, wasted time, streak, coach messages. Start here every morning." },
  { icon: CalendarRange, name: "Timeline", key: 2, text: "Any day as a 24-hour bar. Fix a wrong entry or fill a grey gap you missed. Click any block to edit or delete it." },
  { icon: Timer, name: "Focus", key: 3, text: "Pomodoro timer (15 / 25 / 50 min). It logs the study session for you. At the end it asks how focused you were and how often you checked your phone." },
  { icon: Target, name: "Goals", key: 4, text: "Your streak and a green heatmap of the days you hit your goal. Freezes you've earned show up here too." },
  { icon: ChartColumn, name: "Insights", key: 5, text: "Weekly summary and an A–F report card with one thing to fix. It unlocks after 4 logged days." },
  { icon: Settings, name: "Settings", key: 6, text: "Categories, popup timing, goals, coach style, theme, account. Change anything here to fit your routine." },
  { icon: Info, name: "About", key: 7, text: "This page. Come back anytime you're stuck." },
];

const BUTTONS = [
  { name: "Log now (press L)", text: "Don't wait for the popup. Log what you did right away. Handy after a long study session." },
  { name: "Busy", text: "Pause popups for meetings, interviews, exams, classes or travel. Choose 30 min, 1 h, 2 h or a time, and when it ends you log the whole block in one go." },
  { name: "Going to sleep / I'm awake", text: "One tap each. Tracks your sleep and asks how well you slept. In the morning it also asks your study plan for the day." },
  { name: "Office day", text: "One tap fills in your fixed routine (office, commute…) so you don't log it hour by hour. It never overwrites anything you already logged." },
];

const TIPS = [
  "Keep Honest Hours open in its own window (install it!) so popups can reach you. Popups only appear while the app is open.",
  "Answer honestly. The app is only useful if the numbers are true. Nobody else sees them, and wasted time you admit to is time you can win back.",
  "Answer fast. A rough answer now beats a perfect one never. Skip with Esc if you must, it just asks again at the next check-in.",
  "Use Busy mode for meetings, interviews, exams or travel, instead of ignoring popups. When it ends you log the whole block in one go.",
  "Tap \"Going to sleep\" and \"I'm awake\" every day. Sleep affects how well you study, and your usual bedtime is how the app works out your free time left.",
  "Start with a small, believable study goal in Settings → Streak & goals. Raise it later. A goal you hit every day builds a streak faster than a big one you miss.",
  "Missed a stretch of time? Open Timeline and fill the grey gap. Do it the same day, while you still remember.",
  "Use the Focus timer for real study. It captures focus rating and phone checks too, which is what gives you a Focus score.",
  "Take the 1-minute evening review. It sets tomorrow's one goal and shows your plan vs what you actually did.",
  "Give it 4 days. The weekly report card unlocks after 4 logged days, and the coach learns your pace after 7.",
];

const FAQ = [
  { q: "What is a streak freeze?", a: "A saved \"day off\". Every 5 days you hit your goal you earn one (max 2). It's used automatically when you miss a day, so your streak survives. You can see your freezes on the Goals page." },
  { q: "What counts as wasted time?", a: "Entertainment you didn't plan (e.g. unplanned Instagram). Planned fun and rest are not counted as wasted. You can change a category's type in Settings." },
  { q: "Will I get popups when the app is closed?", a: "No. Popups and notifications work while Honest Hours is open (a tab or the installed app, even in the background). Keep it open during your day, and fill any gap later from the Timeline." },
  { q: "I don't hear the chime or see notifications.", a: "Click anywhere on the page once (browsers need that for sound), and allow notifications when the popup or Focus page asks. Notifications only show when the app is in the background." },
  { q: "Can I add my own categories?", a: "Yes. Settings → Categories & questions. You can also add questions and archive ones you don't use. Each category can have its own questions." },
  { q: "Is my data private?", a: "Yes. Each person can only see their own data. You can delete your account and everything in it from Settings → Account. On a shared computer, log out from the bottom of the sidebar." },
];

export default function AboutPage() {
  return (
    <section className="page" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h1 className="display" style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
        About Honest Hours
      </h1>
      <div className="scroll" style={{ flex: 1, paddingBottom: "var(--space-4)" }}>
        <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: "76rem" }}>
          <p className="muted" style={{ fontSize: "var(--text-base)" }}>
            A time tracker that tells you the truth about your day. It finds the hours that quietly disappear and helps you turn them into study time. Each check-in takes a few seconds, and the picture builds itself.
          </p>

          <InstallCard />

          <div className="card">
            <div className="card-head">
              <span className="card-icon"><BookOpen className="lucide" aria-hidden /></span>
              <h2 className="card-title">How it works</h2>
            </div>
            <ol style={{ display: "grid", gap: ".75rem" }}>
              {STEPS.map((s) => (
                <li key={s.n} className="row" style={{ alignItems: "flex-start", gap: ".75rem" }}>
                  <span className="grade" style={{ flex: "none", background: "var(--primary-soft)", color: "var(--primary-soft-ink)" }}>{s.n}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p className="sm muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-icon"><House className="lucide" aria-hidden /></span>
              <h2 className="card-title">The pages</h2>
              <span className="xs muted">Press 1–7 on your keyboard to jump</span>
            </div>
            <ul style={{ display: "grid", gap: ".6rem" }}>
              {PAGES.map(({ icon: Icon, name, key, text }) => (
                <li key={name} className="row" style={{ alignItems: "flex-start", gap: ".6rem" }}>
                  <Icon className="lucide" aria-hidden style={{ flex: "none", marginTop: ".15rem" }} />
                  <p className="sm">
                    <strong>{name}</strong> <span className="kbd">{key}</span> <span className="muted">{text}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-icon"><Bell className="lucide" aria-hidden /></span>
              <h2 className="card-title">Buttons in the top bar</h2>
            </div>
            <ul style={{ display: "grid", gap: ".5rem" }}>
              {BUTTONS.map((b) => (
                <li key={b.name} className="sm">
                  <strong>{b.name}.</strong> <span className="muted">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-icon"><Lightbulb className="lucide" aria-hidden /></span>
              <h2 className="card-title">Best way to use it</h2>
            </div>
            <ul className="sm" style={{ display: "grid", gap: ".4rem", paddingLeft: "1.1rem", listStyle: "disc" }}>
              {TIPS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-icon"><Info className="lucide" aria-hidden /></span>
              <h2 className="card-title">Common questions</h2>
            </div>
            <dl style={{ display: "grid", gap: ".75rem" }}>
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="sm" style={{ fontWeight: 600 }}>{f.q}</dt>
                  <dd className="sm muted">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
