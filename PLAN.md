# Honest Hours — Project Plan

> Status: **Building v1.** Progress and next steps: [TODO.md](TODO.md).
> Last updated: 2026-11-21

---

## 1. Goal

**Name:** Honest Hours (was "Time Tracker"). An honest coach for where your hours go.

A personal 24×7 time tracker that shows **where my time goes**, especially **wasted time** (Instagram, YouTube, unplanned scrolling), so I can **turn free time into study time**.

**Success means:** more study hours per week, less unplanned scrolling, and a daily study streak.

---

## 2. My routine (the app is designed around this)

| Time | Activity |
|---|---|
| ~12am – 6/7am | Sleep (varies; sometimes 11:30pm – 3/4am, then study) |
| 3/4am – 8am | Early morning study (on good days) |
| 8am – 9:30am | Breakfast, get ready |
| 9:30am – 10am | Commute: ~20 min walk + ~20 min bus |
| 10am – 6pm | Office (weekdays) |
| 6pm – 7pm | Commute back |
| Evening | Shower, dinner (often with YouTube), walk, study if I feel like it, Instagram |
| Weekends | Extra study time |

**Study has no fixed slot.** It happens early morning, after office, late night, or weekends, so the app must stay flexible.

---

## 3. Activity categories

| Group | Activities |
|---|---|
| Sleep & Rest | Sleep, Nap / Resting |
| Routine | Wake up, Getting ready, Breakfast / Meals |
| Work | Office |
| Travel | Commute (walk, bus) |
| Study | Study (linked with Pomodoro) |
| Entertainment | Instagram, YouTube, Movie / Series |
| Chores | Laundry, Room cleaning |

- Categories and their questions are **editable in settings** (add new ones without code changes).
- Each category is marked **Productive / Neutral / Waste** for the summaries.

### Extra questions per category (only where useful)

| Category | Questions |
|---|---|
| Sleep / Wake up | Wake-up time, sleep quality (1–5) |
| Study | Subject / topic, focus (1–5), what I learned (1 line), checked phone during it? |
| Office | Deep work / meetings / mixed, focus (1–5) |
| Travel | Mode, what I did (podcast, scrolling, nothing) |
| Instagram / YouTube | **Planned or just happened?**, **What made me pick up the phone?** (bored / tired / stressed / habit / break), mood after (better / same / worse) |
| Movie / Series | Name (optional) |
| Nap / Rest | Felt refreshed? (yes / no) |
| Meals, Chores, Getting ready | No questions: tap and done |

Questions are **prefilled with my last answers** so logging stays fast.

---

## 4. Core features

### 4.1 Check-in popup
- Pops up every **N minutes** (configurable: 15 / 30 / 45 / 60; default 30).
- Asks one question: **"What did you do since the last check-in?"**
- **Split the slot:** e.g. last 30 min = 20 min Study + 10 min Instagram.
- **"Same as before"** button for one-tap logging.
- **Two things at once:** main activity + "while doing" tags (e.g. Dinner + YouTube).
- **Missed check-ins are fine:** the next check-in covers the whole gap. Anything unfilled shows as **Unknown**.
- **Unknown gaps can be filled later** from the editable timeline (any past day).

### 4.2 Busy mode (pause popups)
- One tap: **"Busy for 30 min / 1 hr / 2 hr / until [time]"**, with an optional label (e.g. "Interview").
- No popups during busy time. When it ends, one check-in auto-fills the block.
- **Presets:** Interview (1 hr), Meeting (1 hr), Movie (2.5 hr), editable.

### 4.3 Sleep handling (no fixed quiet hours)
- **"Going to sleep"** button stops popups and starts logging sleep.
- **"I'm awake"** (first open of the day) ends sleep and asks about sleep quality and **today's study plan (hours)**.
- **Backup:** if 2 popups in a row get no answer late at night, the app goes quiet, and next morning it asks "When did you sleep?"

### 4.4 Schedules
- **Separate weekday and weekend settings.**
- During office hours, popups switch to every **2 hours** and ask only "Office as usual?" (Yes / Split).
- **"Office day" one tap:** fills walk 20 min, bus 20 min, Office 10–6, and the commute back. Adjust only what was different.

### 4.5 Smart suggestions
- The first button shows what I **usually do at this time / next** (learned from my history, no setup).
  - e.g. Breakfast → Getting ready → Walk → Bus → Office.

### 4.6 Pomodoro
- Starting a pomodoro asks **"What are you studying?"** up front.
- Check-in popups **pause** while it runs.
- When it ends: **auto-logged as Study**, then asks focus (1–5) + "checked phone?" + completed or stopped early.

### 4.7 Study streak
- **Streak rule is configurable**, with **separate weekday and weekend goals**. Starts at **2 hours on weekdays, 4 hours on weekends**; I'll raise them over time.
- **Earned streak freeze:** hit the goal 5 days → earn 1 rest day. No free passes.

### 4.8 Study nudges (when I'm free)
- After dinner or a walk in the evening: *"You're free now. Start a 25-min pomodoro?"*
- "I'm awake" at 3–5am: *"Early start! Begin a study session?"*
- Streak at risk: *"40 min studied, 1h 20m to go. You usually sleep around 12, so you still have time."*

### 4.9 Subject goals
- Set target hours per subject (e.g. *DSA: 100 hours*), and the app predicts the finish date.

### 4.10 Daily end review (1 minute)
- Today's timeline, study vs goal, wasted time, plan vs actual.
- Set **one goal for tomorrow**.

---

## 5. Insights and calculations

All are **simple math on my own data** (averages and comparisons, no AI). Compare against **my past self AND my goal**.

**Main number on the dashboard:**

```
Today: Free time at home: 4h 10m
   Study      1h 30m  ████████░░░░░░  36%
   Scrolling  1h 50m  ██████████░░░░  44%
   Other      0h 50m
```

Free time = awake and at home, minus meals, chores, and getting ready.

### Daily
- Free time used for study (%) vs yesterday
- **Free time left today:** time until my usual sleep, shown as "2 pomodoros finish your goal"
- Goal on-track check at my usual evening pace
- Plan vs actual study (%)
- Tracking completeness (% of day logged)

### Weekly
- **Weekly projection:** on pace for X h (goal Y h), plus how much extra per day closes the gap
- **Recoverable time:** unplanned scrolling, and "win back half = +X h study"
- Best focus hours (focus score by hour of day)
- Strongest and weakest day of the week
- Drift triggers (when and why I scroll, e.g. "tired after office, 7–9pm")
- Commute potential (hours per week usable for podcasts / revision)

### Patterns (after 2–4 weeks of data)
- Sleep time vs next-day study
- Early wake-up vs study hours
- Phone checks vs focus
- Office days vs weekends

### Long-term
- Subject goal finish date
- Monthly forecast (on track for X h, best month?)
- Yearly wasted-time cost (e.g. ~300 h/year), and what cutting 20 min/day gives back
- Streak record countdown
- **Tomorrow's expectation:** planned vs my usual for that weekday, plus a suggestion

**First 1–2 weeks:** the Insights page shows *"Learning your patterns… X days to go"* instead of guesses. Daily numbers work from day 1.

### Weekly report card

```
This week's report card
──────────────────────────────────────────
✅ Strong
   Early morning study    4 of 7 days      A
   Pomodoro completion    86%              A-
   Sleep before 12        5 of 7 nights    B+

⚠️ Needs work
   Post-office scrolling  avg 1h 20m/day   D   ← biggest leak
   Study goal hit         3 of 7 days      C
   Phone during study     6 checks/session D

🎯 Fix one thing next week: post-office scrolling.
   Cutting it by half = +4.5h study/week.
──────────────────────────────────────────
```

**Scores:**
- **Focus score:** average study focus, minus phone checks
- **Discipline score:** planned vs actual study, plus planned vs unplanned entertainment

---

## 6. Coach tone: honest, balanced

Not a cheerleader. **Call out the bad, appreciate the good, always show the way back.**

**Message pattern:** `Fact → Honest call-out → Recovery path`

| Type | Example |
|---|---|
| 🔴 Scold | *"1h 40m of unplanned Insta tonight. That's 4 pomodoros gone, and your 2h goal is now at risk. You've done this before though: 25 minutes right now still saves the day. Start?"* |
| 🔴 Pattern | *"Third scroll session after 9pm this week. This is a pattern, not an accident. Tomorrow, try putting the phone in another room after dinner."* |
| 🟢 Praise | *"2h 15m studied before office. Excellent discipline 👏 That's your 3rd early morning this week."* |
| 🟢 Milestone | *"New record: 7-day streak 🔥 You're becoming the person who studies daily."* |
| 🟡 Recovery | *"Missed yesterday's goal. It happens, but don't let it become two days. Fresh start, the first pomodoro is the hardest."* |

**Wording:** use **"Wasted time"** (honest) and **"Recoverable time"** (the fix).

**Escalating nudges (reset daily):**
1. 1st drift: light. *"Scrolling for 20 min. Was this planned?"*
2. 2nd drift: firm. *"Second unplanned session today. 55 min lost so far."*
3. 3rd+ drift: strict, then recovery. *"This is turning into a wasted evening. Stop now, start one pomodoro, and save the day."*

**Coach strictness (per user setting):** Gentle / **Balanced (my default)** / Strict.

---

## 7. Tech stack and hosting (all free)

| Part | Choice | Notes |
|---|---|---|
| Frontend | **Next.js** + Tailwind, installable as a **PWA** | Laptop-only desktop-style app |
| Hosting | **Vercel** (Hobby, free) | Already familiar |
| Database | **Supabase** Postgres (free, 500 MB) | ~10 MB/year per user. Region: Mumbai |
| Auth | **Supabase email + password** | See below |

**Free plan notes:**
- Supabase free projects pause after ~1 week of no activity (daily use keeps them active).
- Export to CSV anytime.

### Login
- **Real email + password**, with **email confirmation turned off**, so no emails are sent and Supabase's email limit doesn't apply.
- **Open sign-up, capped at 50 users** (no invite code). Delete inactive users every ~6 months to free slots.
- Forgot password: admin resets it from the Supabase dashboard for now.
- **Later (optional):** email reset links via Resend (free, 100 emails/day), and a Google sign-in button.
- Do **not** write our own login code: Supabase handles password storage, sessions, and security.

### Multiple users (sister, friends)
- Each user sees **only their own data** (enforced by security rules inside the database).
- Each user has their own categories, streak rule, popup interval, schedule, and coach strictness.
- Privacy note: as admin, I can technically see all data in the Supabase dashboard. Tell users.

### Laptop only (no phone version)
- Built as a **desktop-style app for the laptop only**. No phone layout, no phone push notifications.
- Check-in popups run inside the app (installed PWA window or pinned tab) using browser notifications.
- When the laptop is closed or the app isn't open, no popups appear. The **next check-in covers the whole gap** (split-slot), and phone scrolling is logged there.
- No server-side scheduled jobs are needed, so nothing runs for inactive users.

---

## 8. Build phases

### v1: Core
- Email + password login (open sign-up, 50-user cap)
- Categories + their questions (editable)
- Check-in popup (configurable interval), split-slot, "Same as before", while-doing tags
- Busy mode + presets
- "Going to sleep" / "I'm awake"
- Weekday / weekend schedule, "Office day" one tap
- Editable timeline (fill Unknown gaps on any day)
- Daily dashboard: free time used for study, free time left today

### v2: Focus and coaching
- Pomodoro (auto-logs study)
- Configurable streak + earned freeze
- Morning plan / evening review
- Trigger questions, focus and discipline scores
- Coach messages + escalating nudges + strictness setting
- Weekly insights + report card
- Settings → Look: Clean / Notebook toggle (see §9 "Two looks")

### v3: Deeper insights
- "Usually next" smart suggestions
- Pattern insights (sleep, wake-up, phone checks)
- Subject goals with predicted finish dates, long-term forecasts
- CSV export
- Optional: email password reset (Resend), Google sign-in, Hinglish coach messages

---

## 9. Screens

> Visual style (colours, theme, fonts, components) is defined in the **[design system](design-system/DESIGN_SYSTEM.md)** (live preview: `design-system/preview.html`). This section covers layout and pages only. Change: "+ Log now" sits in the status bar instead of floating bottom-right.

### Two looks: Clean (v1) and Notebook (v2)
Both designs are kept, and the user picks one in **Settings → Look**.
- **Clean** = [design-system/](design-system/DESIGN_SYSTEM.md) (default). **Notebook** = [design-system-v2/](design-system-v2/DESIGN_SYSTEM.md): handwritten fonts, ruled paper, tape and highlighter.
- **How it works:** Notebook is a **skin**, not a second app. The HTML, components, layout and colours are the same, and only materials change (fonts, text size +10%, borders, paper, decorations).
  - `<html data-look="clean|notebook" data-theme="light|dark">`. All Notebook rules and tokens are scoped under `[data-look="notebook"]`.
  - The look is set before first paint by the same inline script that sets the theme, so there's no flash. It's saved in localStorage (it could move to the profile later).
  - All 5 fonts are loaded with `next/font`; the hand fonts add about 100 KB.
- **When:** build everything in **Clean first**. Add the toggle **after the core v1 features work** (see §8, v2). Setup is about half a day.
- **Rules (keep the second look cheap):**
  - One component and one HTML structure for both looks. No `NotebookCard` / `CleanCard` copies.
  - Notebook may only change materials, never layout, features or markup.
  - Check every new screen in 4 combinations (Clean/Notebook × light/dark). Test Notebook at 1366×768 first, because its bigger text wraps sooner.
  - Expect about 10–15% extra UI effort per screen. If it ever becomes a burden, drop Notebook by deleting its stylesheet.

### Layout rule: works like a desktop app
- The app **always fills exactly one window**. **The page itself never scrolls.**
- **Left sidebar** switches pages. **Top status bar** always shows the current state.
- Long content goes into **tabs**. If a list grows, only **that panel** scrolls inside itself.
- Popups are **modal windows** over the current page.
- Minimum size **1366×768**. Installed as a **PWA** (own window, no address bar).
- **Laptop only**: no phone layout.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ● Now: Study (DSA) 0:42  │ Next check-in 18:00 │ 🔥 6 │ [Busy] [Sleep]│ ← status bar
├────────┬─────────────────────────────────────────────────────────────┤
│ ⌂ Today│                                                             │
│ ▤ Time-│                                                             │
│   line │                 MAIN PANEL (fits the window)                │
│ ◷ Focus│                                                             │
│ ◎ Goals│                                                             │
│ ▲ In-  │                                                             │
│  sights│                                                             │
│ ⚙ Set- │                                                             │
│  tings │                                         [ + Log now ]       │
└────────┴─────────────────────────────────────────────────────────────┘
```

### Pages
| Page | Contents | Phase |
|---|---|---|
| Login / Sign up | Email, password; on sign-up also **"What should we call you?"** (display name, max 20 chars) | v1 |
| **Today** (home) | Greeting with display name ("Good evening, {name}."), Free time card, study goal + streak, free time left, 24h timeline bar, coach messages, where time went | v1 (coach v2) |
| Timeline | Day picker; list of blocks; click to edit; click grey Unknown to fill | v1 |
| Focus | Pomodoro timer, subject picker, today's sessions | v2 |
| Goals | Tabs: Streak (heatmap, freezes) / Subject goals (progress + finish date) | v2/v3 |
| Insights | Tabs: This week / Report card / Patterns / Long-term | v2/v3 |
| Settings | Tabs: Categories & questions / Popups & schedule / Busy presets / Streak & goals / Coach / Look (Clean / Notebook, v2) / Account (display name, password) | v1+ |

### Check-in popup (most important screen)
```
┌─ What did you do since 5:30 PM? (30 min) ──────────────── [Skip] ─┐
│  Suggested:  [ 🚌 Commute ]   [ ↺ Same as before: Office ]         │
│  [Study] [Office] [Commute] [Meal] [Insta] [YouTube] [Movie]       │
│  [Ready] [Chores] [Rest]  [Sleep] [+ more]                         │
│  ── Split ──────────────────────────────────────────────────────  │
│  5:30 ████████ Study 20m ████████|▓▓▓ Insta 10m ▓▓▓ 6:00          │
│  ── Insta details ──────────────────────────────────────────────  │
│  Planned?   ( ) Yes  (•) Just happened                             │
│  Why?       [Bored] [Tired•] [Stressed] [Habit] [Break]            │
│  While doing: [+ tag]                                [ Save ✓ ]   │
└────────────────────────────────────────────────────────────────────┘
```

### Small modals
Busy mode · Going to sleep / I'm awake (sleep quality + today's study plan) · Office day (confirm prefilled blocks) · Evening review (v2)

### Frontend stack
Next.js (App Router) + TypeScript · Tailwind CSS + shadcn/ui · Recharts · Supabase JS · browser Notification API for check-ins (pinned tab / installed PWA)

---

## 10. Database

### Principles
1. **Store facts, calculate insights.** Only what happened is stored. Scores, predictions and suggestions are calculated on demand, so formula improvements apply to all past data.
2. **One row per activity block** (start + end). A split slot = 2 rows. **Unknown is not stored**: it's time with no row. Filling it later = adding a row.
3. **Key answers get real columns** (focus, planned, trigger, phone_checks, mood_after). Custom questions go into a flexible `answers` field.
4. **Goals are snapshotted per day**, so raising the streak goal later doesn't rewrite history.
5. **Rows are only created by user actions** (logging, buttons, pomodoro, opening the app). Nothing is generated for inactive users.

### Day boundary
A day starts at **3:00 AM by default** (`day_start_hour`, configurable per user). Study 12–1am counts towards the evening before; study from 3am counts towards the new day.

### Tables

```
                        ┌──────────────┐
                        │   profiles   │ (1 per user: name, settings)
                        └──────┬───────┘
   ┌────────────┬──────────────┼───────────────┬──────────────┬──────────────┐
   ▼            ▼              ▼               ▼              ▼              ▼
categories   subjects      entries ◀─────── pomodoros     day_logs      coach_messages
   │                     (the core)
   ▼                         │
category_questions           ▼
                        entry_tags          checkins       routines
```

| Table | Key columns | Purpose |
|---|---|---|
| `profiles` | id (= auth user), **display_name** (what the user wants to be called; shown in greeting + sidebar, editable in Settings → Account), timezone, day_start_hour, checkin_interval_min, coach_strictness, weekday_goal_min (120), weekend_goal_min (240), status (normal / busy / sleeping / pomodoro), status_until, settings (weekday/weekend schedule, office hours, busy presets) | One row per user |
| `categories` | user_id, name, icon, color, **kind** (sleep / study / work / commute / routine / chore / entertainment / rest), **value** (productive / neutral / waste), sort_order, archived | Each user's activities. Calculations use `kind`, not the name. Never deleted, only archived. |
| `category_questions` | category_id, label, type (rating_1_5 / yes_no / single_choice / multi_choice / text / time), options, **system_key** (planned / trigger / focus / phone_checks / mood_after / empty), sort_order, archived | Extra questions. `system_key` links a question to calculations. |
| `entries` | user_id, category_id, **start_at, end_at**, **source** (checkin / pomodoro / busy / sleep_button / office_day / manual / backfill), subject_id, focus, planned, trigger, phone_checks, mood_after, answers, note | **Core table.** Database rule: entries of the same user can't overlap. |
| `entry_tags` | entry_id, tag_category_id | "While doing" (e.g. Dinner + YouTube). Main entry owns the time; tags reported separately. |
| `subjects` | user_id, name, target_hours, archived | Study subjects and goal hours |
| `pomodoros` | user_id, subject_id, started_at, ended_at, planned_min, **completed**, entry_id | Includes stopped-early sessions (honest completion rate) |
| `checkins` | user_id, prompted_at, answered_at, status (answered / skipped / missed) | Tracking completeness, late-night "go quiet" rule |
| `day_logs` | user_id, day, **study_goal_min (snapshot)**, planned_study_min, wake_at, sleep_quality, tomorrow_goal, review_done, freeze_earned, freeze_used | One row per user per day |
| `coach_messages` | user_id, rule_key, severity (scold / praise / recovery / pattern), text, created_at, seen_at, **acted_on** | Escalation count, no repeats, which nudges actually work |
| `routines` | user_id, name, items (list of category + time + duration) | One-tap templates like "Office day" |

### Data rules agreed
- **Unknown time** counts as **neutral** (not wasted) but stays **visible**, with a small penalty on tracking completeness.
- **Filled-later entries** (`source = backfill`) are **trusted** in all calculations, and the report shows **"% filled later."**

### How features get their data
| Feature | Calculated from |
|---|---|
| Free time at home | Today's `entries`, grouped by category kind |
| Free time left today | Now → usual sleep time (median of last 14 sleep starts) |
| Goal on-track check | Study so far + average study after this hour on same day type (last 4 weeks) |
| Smart suggestion | Most common category at this hour on this day type (last 30 days) |
| "Usually next" | Counts of A→B transitions between consecutive entries |
| Weekly projection | Study so far this week + average per remaining day |
| Recoverable time | Entertainment entries with planned = false |
| Best focus hours | Average focus by hour of day |
| Drift triggers | trigger × hour × weekday |
| Sleep → study | Sleep start vs next day's study total |
| Focus score | Average focus − phone check penalty |
| Discipline score | planned_study_min vs actual + share of planned entertainment |
| Streak + freeze | Daily study vs `day_logs.study_goal_min` |
| Subject finish date | Remaining target hours ÷ weekly rate for that subject |
| Tomorrow's expectation | Average study on that weekday vs tomorrow's plan |
| Escalation level | Count of today's drift messages in `coach_messages` |
| Which nudges work | `acted_on` rate per rule |
| Tracking completeness | Logged minutes ÷ day minutes, missed check-ins, % filled later |

### Where calculations run
All formulas live in **one folder of small TypeScript functions** (`lib/insights/`). Data is small (~15,000 entries per user per year), so **no summary/cache tables** for now. Add one only if something becomes slow.

### Security and users
- Every table has `user_id`. Database rules (Row Level Security): **a user can only read and write their own rows.**
- Times stored in UTC, shown in the user's timezone.
- **Inactive accounts** keep only their profile + default categories (a few KB) and do not grow.
- **Deleting a user** (Supabase dashboard; later a "Delete my account" button) removes **all their data** automatically.
- Size: ~5–10 MB per active user per year. 500 MB free plan is enough for many years.

---

## 11. Calculations

### Basic definitions
| Term | Definition |
|---|---|
| **Day** | From `day_start_hour` (3:00 AM) to 3:00 AM next day |
| **Day type** | Weekday or weekend. Comparisons use the same day type. |
| **Daily goal** | `weekday_goal_min` (2h) or `weekend_goal_min` (4h) by day type, snapshotted in `day_logs.study_goal_min` |
| **Study** | Minutes of entries with kind = study (pomodoros create study entries) |
| **Committed time** | kind = work, commute, routine, chore |
| **Free time** | study + entertainment + rest. **Unknown shown separately**, never free or wasted. |
| **Wasted** | category value = waste **AND** planned ≠ yes (planned Insta/movie = leisure, not wasted) |
| **Usual sleep time** | Median sleep start, last 14 days |

### Daily (from day 1)
```
Study share        = study ÷ free time × 100
Free time left     = usual sleep time − now  (0 if past) → ÷ 30 = "N pomodoros possible"
Goal remaining     = max(0, daily goal − study today) → ÷ 25 rounded up = pomodoros needed
Plan vs actual     = study today ÷ planned study × 100  (capped at 150%)
Tracking complete  = logged minutes ÷ minutes passed today × 100
Filled later %     = backfill minutes ÷ logged minutes × 100
```

**Goal on-track check** (needs 7+ days of the same day type):
```
Expected rest of day = avg study AFTER this time of day, same day type, last 28 days
Projected today      = study so far + expected rest of day
≥ goal → 🟢 On track   |   ≥ 80% → 🟡 Close   |   < 80% → 🔴 At risk
```

### Scores (0–100)
**Focus score**
```
Base    = (minute-weighted avg focus − 1) ÷ 4 × 100     (1 → 0, 3 → 50, 5 → 100)
Penalty = 5 × phone checks per study hour  (max 30)
Focus   = max(0, Base − Penalty)
```

**Discipline score**
```
Plan kept   (50%) = min(study ÷ planned, 1)        (no plan → daily goal)
Planned fun (30%) = planned entertainment ÷ all entertainment   (none → 1)
Goal hit    (20%) = 1 if goal met else 0           (weekly: days met ÷ 7)
Discipline  = (0.5 × Plan kept + 0.3 × Planned fun + 0.2 × Goal hit) × 100
```

### Weekly (needs 4+ logged days)
```
Weekly goal       = weekday goal × 5 + weekend goal × 2      (default 10h + 8h = 18h)
Weekly projection = study so far + Σ avg study for each remaining day's type (last 28 days)
Daily gap         = (weekly goal − projection) ÷ remaining days
Recoverable time  = wasted minutes this week; "win back half" = ÷ 2 (in hours and pomodoros)
Best focus hours  = avg focus per hour of day (last 28 days, 3+ sessions per hour)
Strong/weak day   = avg study per weekday (last 8 weeks, 2+ samples each)
Drift triggers    = share of wasted minutes per trigger + 2-hour window with most waste
Commute potential = commute minutes this week
```

### Patterns (needs 14+ days)
Shown only if **each group has 5+ days** and the difference is **≥ 20%**.

| Pattern | Group A | Group B | Compares |
|---|---|---|---|
| Sleep → study | Slept before 12 | Slept after 12 | Next day's study |
| Early wake-up | Woke before 5 AM | Woke after 5 AM | That day's study |
| Phone → focus | 0 phone checks | 1+ phone checks | Avg focus |
| Office vs weekend | Weekdays | Weekends | Study, wasted |

Study comparisons on mixed day types use **% of that day's goal**, so weekday and weekend days compare fairly.

### Long-term
```
Subject finish date = today + (target − done hours) ÷ (subject hours last 28 days ÷ 4) weeks
                      (no study in 28 days → "No recent progress")
Monthly forecast    = study so far + avg daily study (28d, by day type) × days left
Yearly wasted cost  = avg daily wasted (28d) × 365
Cut 20 min/day      = ~122 hours/year
Tomorrow's expect.  = avg study on tomorrow's weekday (8 weeks) vs tomorrow's plan
```

### Streak and freeze
```
Day counts    = study ≥ that day's goal snapshot  OR  freeze used
Streak        = consecutive counted days ending yesterday (+ today once goal reached)
Earn freeze   = every 5 goal-met days → +1  (max 2 saved)
Use freeze    = automatic when a day ends unmet and a freeze is available
```

### Report card grades
| Grade | A | B | C | D | F |
|---|---|---|---|---|---|
| Score | 85–100 | 70–84 | 55–69 | 40–54 | < 40 |

| Metric | Score |
|---|---|
| Study goal hit | days met ÷ 7 × 100 |
| Focus | Focus score |
| Discipline | Discipline score |
| Pomodoro completion | completed ÷ started × 100 |
| Wasted time | 100 × (1 − avg daily wasted ÷ 120 min), min 0 → 30 min = B, 1h = D, 2h+ = F |
| Phone during study | 100 − 20 × checks per study hour, min 0 |
| Sleep before 12 | nights ÷ 7 × 100 |
| Early morning study | days with 30+ min study before 8 AM ÷ 7 × 100 |
| Tracking completeness | avg tracking % for the week |

- **Strong** = A/B. **Needs work** = C/D/F.
- **🎯 Fix one thing** = lowest-scoring metric + its gain (e.g. "cut by half = +X h study/week").

### Minimum data rule
| Insight | Shown after | Until then |
|---|---|---|
| Daily numbers | Day 1 | — |
| On-track check | 7 days of same day type | "Learning your pace…" |
| Weekly + report card | 4 logged days that week | "Unlocks after 4 days" |
| Patterns | 14 days, 5+ per group | "Learning your patterns… X days to go" |

---

## 12. Coach messages

### How the coach works
1. **Event-driven, not timer-driven.** Speaks only when something happens: check-in saved, pomodoro done, "I'm awake", goal reached, day ends, etc.
2. **Every message:** `Fact → Call-out or praise → Next step`. The fact is always a real number.
3. **Emojis kept** (🔥 🎯 ✅ 📈 🏆 🧊): they carry the emotion of the message.

| Where | Used for |
|---|---|
| Coach card on **Today** | All messages, newest first |
| Toast after saving a check-in | Reaction to what was just logged |
| **Browser notification** | Only `drift_3`, `goal_at_risk`, `last_chance`, `free_now` (+ pomodoro end) |

### Anti-annoyance rules
- **Max 1 message per event.** Priority: Drift > Goal at risk > Praise > Info.
- **Max 1 browser notification per 30 min** (pomodoro end excluded).
- Same message not repeated within 24h. Each rule has **2–3 wording variants**.
- **No fake praise.** Praise only for real wins.
- **Balance check:** after 5 scolds in a row, the next real win is guaranteed to show.
- **Every scold includes a way back.**

### Implementation
- Templates live **in code** (one file), e.g. `"{wasted_today} of unplanned {category} today…"`.
- Lookup key: `rule_key` + `strictness` (gentle / balanced / strict) + variant. **No other selection logic.**
- Shown messages are saved in `coach_messages` (escalation count, no repeats, `acted_on`).
- `acted_on` = a pomodoro started within **10 minutes** of the message, so Insights can show which nudges actually work.

### Language
- **English only** for v1/v2.
- Templates are organised so language is just **one more lookup key**. **Hinglish** (e.g. *"Chal, ek pomodoro laga! 💪"*) can be added later as a setting **without changing any coach logic**, only by adding a second set of texts. *(Optional, v3+)*

### Catalogue (Balanced tone)

**🌅 Morning**
| Rule | When | Message |
|---|---|---|
| `early_start` | "I'm awake" before 5 AM | *"Up at 3:40, before the world wakes up. This is your best focus window (avg 4.3). Start a session?"* |
| `normal_wake` | "I'm awake" after 5 AM | *"Good morning. Today's goal: 2h. You have ~1h 30m before getting ready. Even one pomodoro now makes the evening easier."* |
| `plan_set` | Morning plan saved | *"Plan locked: 2h 30m today. Let's see if evening-you keeps morning-you's promise."* |
| `bad_sleep` | Sleep quality ≤ 2 | *"Rough night (4h 10m). Don't go for a hero day. A shorter plan you keep beats a big plan you break."* |

**📚 Study**
| Rule | When | Message |
|---|---|---|
| `pomo_done_good` | Pomodoro done, focus ≥ 4 | *"25 min of solid focus on DSA ✅ 1h 15m to go. Keep the chain going?"* |
| `pomo_done_weak` | Focus ≤ 2 or 2+ phone checks | *"Session done, but focus was 2/5 with 3 phone checks. Put the phone in another room for the next one."* |
| `pomo_abandoned` | Stopped early | *"Stopped at 11 min. It happens. Try a shorter 15-min session, starting is the hard part."* |
| `goal_reached` | Daily goal met | *"2h done 🎯 Today's goal is in the bag. Anything extra is a bonus for your DSA target."* |
| `goal_beaten` | 150% of goal | *"3h 10m today, 158% of goal. That's a top-10% day for you 🔥"* |

**📱 Drift (escalation, resets daily)**
| Rule | When | Message |
|---|---|---|
| `drift_1` | 1st unplanned waste entry ≥ 15 min | *"20 min of Insta, unplanned. Was this a break or a slip? Either way, you can stop here."* |
| `drift_2` | 2nd | *"Second unplanned session today: 55 min lost so far. That's 2 pomodoros. Close it now and start one?"* |
| `drift_3` | 3rd+ | *"1h 40m wasted tonight. This is becoming a wasted evening. Stop now, start one pomodoro, and save the day. You've done it before."* |
| `drift_long` | Single unplanned session ≥ 45 min | *"50 min straight of YouTube. That wasn't a break, that was autopilot. Reset: water, stand up, 25-min session."* |
| `drift_trigger` | Same trigger 3rd time this week | *"3rd time this week: 'tired' → Insta. Tired-you needs rest, not reels. Try a 15-min nap instead."* |

**⏳ Goal at risk / free time**
| Rule | When | Message |
|---|---|---|
| `free_now` | Dinner/walk logged in evening, goal not met | *"You're free now with ~2h 30m before your usual sleep. 3 pomodoros finish today's goal. Start one?"* |
| `goal_at_risk` | On-track check turns 🔴 | *"1h 20m still needed, ~1h 40m of free time left. Tight but possible. Start in the next 10 min."* |
| `last_chance` | ~1h before usual sleep, goal missed, no freeze | *"Streak (6 days) ends tonight unless you do 40 more minutes. Two pomodoros. Go."* |
| `freeze_saved` | Day ends unmet, freeze used | *"Missed today, but a freeze saved your 6-day streak. You have 1 left. Don't spend it tomorrow."* |

**🌙 Night**
| Rule | When | Message |
|---|---|---|
| `sleep_early` | "Going to sleep" before 12 | *"Before midnight 👌 Your study is 1h 20m higher after nights like this. Good call."* |
| `sleep_late` | After 1 AM | *"1:20 AM. Late nights cost you ~45 min of study the next day. Tomorrow: phone away at 11:30."* |
| `review_reminder` | 30 min before usual sleep | *"1-minute review: how did today go and what's tomorrow's one goal?"* |

**🔁 Recovery**
| Rule | When | Message |
|---|---|---|
| `missed_yesterday` | Morning after an unmet day | *"Yesterday: 35 min of 2h. It's done, don't carry it. Today is a fresh start, and one early session fixes the mood."* |
| `two_missed` | 2 unmet days in a row | *"Two days in a row now. This is how habits slip. Make today small but certain: just 2 pomodoros."* |
| `comeback` | Goal met after 2+ missed days | *"Comeback day ✅ After 2 missed days, you showed up. That's real discipline."* |

**🏆 Milestones**
| Rule | When | Message |
|---|---|---|
| `streak_milestone` | Streak 3, 7, 14, 30, 50, 100 | *"7-day streak 🔥 You're becoming the person who studies daily."* |
| `streak_record` | New best streak | *"New record: 12 days, beating your old best of 11 🏆"* |
| `best_week` | Best week ever | *"Best week ever: 21h of study 🎉 Up 4h from your previous best."* |
| `subject_milestone` | Subject 25/50/75/100% | *"DSA: 50 of 100 hours. Halfway 🎯 At this pace, done by Feb 14."* |
| `freeze_earned` | Freeze earned | *"5 goal days → freeze earned 🧊 Use it only when life really happens."* |

**📊 Weekly**
| Rule | When | Message |
|---|---|---|
| `weekly_summary` | Week ends | *"Week done: 14h study (goal 18h, 78%). Wasted 6h 30m. Biggest leak: post-office scrolling. Fix that one thing next week."* |
| `weekly_up` / `weekly_down` | vs last week | *"+3h vs last week 📈 Keep the same plan."* / *"−2h vs last week. Wednesday and Thursday were the dip."* |

**📝 Tracking honesty**
| Rule | When | Message |
|---|---|---|
| `low_tracking` | Tracking < 60% at evening review | *"Only 55% of today logged. Can't fix what you can't see. Fill the 2 grey blocks now (1 min)."* |
| `many_missed` | 3+ missed check-ins in a row while app open | *"3 check-ins skipped. Busy? Use Busy mode so the gaps make sense."* |

### Strictness example (`drift_2`)
| Strictness | Message |
|---|---|
| Gentle | *"That's 55 min of scrolling today. No stress, want to switch to a 25-min session now?"* |
| **Balanced** (default) | *"Second unplanned session today: 55 min lost so far. That's 2 pomodoros. Close it now and start one?"* |
| Strict | *"55 minutes gone, twice today. You said studying matters. Prove it: phone down, pomodoro now."* |

---

## 13. To discuss next (before coding)

- [x] **Screens:** agreed (section 9).
- [x] **Database tables:** agreed (section 10).
- [x] **Calculations:** agreed (section 11).
- [x] **Coach messages:** agreed (section 12).
- [x] **UI design system:** agreed ([design-system/DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md)). Second look "Notebook" agreed as a toggleable skin ([design-system-v2/](design-system-v2/DESIGN_SYSTEM.md), §9 "Two looks").
- [x] **v1 tasks:** step-by-step build checklist (§14)

---

## 14. Build progress

Tracked in **[TODO.md](TODO.md)**: what's done, the next step, the v1 checklist with checks, and build notes.
