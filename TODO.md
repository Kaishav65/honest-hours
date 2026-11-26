# Honest Hours — TODO / Progress

> **Start here in every new session.** This file tracks what's done and what's next.
> The full design is in [PLAN.md](PLAN.md) (features §4, screens §9, database §10, calculations §11, coach §12).
> Last updated: 2026-11-27 ("decide before v2" issues settled; v2 Today extras: streak + freeze, on-track badge, while-doing line, Entries card — see Step 9 and "Later")

**Current status:** v1 steps 0–2 and 4 done; Steps 3 and 5–10 are coded, smoke-tested in a real browser (Chrome via Playwright) and in daily use since 2026-11-21. Step 11: PWA + Vercel deploy done (deploy reported by the user, not checked in this session); installing the PWA from the live URL still to confirm. v2 started: 4 of the 6 Today extras done. **Next: v2 Step 13 — Pomodoro & Focus page** (v2 is broken into Steps 12–21 under "Later").

---

## ✅ Done

### Planning & design
- [x] Goal, routine, categories, features ([PLAN.md](PLAN.md) §1–§8)
- [x] Screens and layout rules (§9)
- [x] Database tables (§10), calculations (§11), coach messages (§12)
- [x] Design system "Clean" ([design-system/](design-system/DESIGN_SYSTEM.md)) and "Notebook" skin ([design-system-v2/](design-system-v2/DESIGN_SYSTEM.md))
- [x] Node 24 LTS + Vitest; category kind names unified (`entertainment` everywhere)
- [x] Name: **Honest Hours**. Display name ("What should we call you?") shown in the greeting

### Accounts & services
- [x] Supabase project `honest-hours` in **Mumbai (ap-south-1)**
  - Confirm email **off** (no emails sent), Secure email change off, Require current password on, min password 8 (kept at 8 on purpose; login friction is handled by long sessions + password-manager autofill), magic links off
- [x] GitHub repo (public): https://github.com/Kaishav65/honest-hours (branch `main`)
- [x] GitHub CLI installed and logged in (`C:\Program Files\GitHub CLI\gh.exe`)
- [x] Invite codes removed (2026-11-21): open sign-up with a hard cap of 50 users

### Step 0 — Project setup
- [x] Next.js 16.4 (App Router, Cache Components) + TypeScript + Tailwind v4 + lucide-react
- [x] Design tokens → `src/styles/tokens.css`; component + shell CSS ported from `preview.html` → `src/styles/components.css`
- [x] Fonts via `next/font`: Fraunces, DM Sans, Caveat
- [x] Light/dark theme set before first paint (no flash), saved in localStorage `hh-theme`

### Step 1 — App shell
- [x] Brand, status bar (static), sidebar, main panel; page never scrolls; icon-only sidebar below 1440px
- [x] Routes: `/today`, `/timeline`, `/focus`, `/goals`, `/insights`, `/settings` (placeholders); `/` → `/today`
- [x] Keys `1–6` switch pages
- Verified: lint + build pass; screenshots at 1366×768 and 1920×1080, light and dark

### Step 2 — Database
- [x] Migration `supabase/migrations/20261121000000_init.sql` applied
- [x] 12 tables, RLS (own rows only), no-overlap rule for entries, composite FKs (can't link another user's rows)
- [x] Sign-up trigger: checks display name + 50-user cap, creates profile, 11 categories, 16 questions, "Office day" routine
- [x] `signups_open()` RPC for the sign-up form (migration `20261121120000_open_signup_user_cap.sql`; `invite_codes` table dropped)
- Verified: `node scripts/db-test.mjs` → 21/21 checks pass; Supabase advisors: no issues

---

## 🔜 Next: v1 (core)

Each step has a check that proves it works.

### Step 3 — Login & sign-up (code done, manual check pending)
- [x] `npm install @supabase/supabase-js @supabase/ssr`
- [x] Supabase clients: browser + server helpers in `src/lib/supabase/`
- [x] Session refresh in **`src/proxy.ts`** (Next 16 renamed middleware → proxy; read `node_modules/next/dist/docs/` first)
- [x] `/login` page: email + password
- [x] `/signup` page: email, password, "What should we call you?" (1–20 chars), timezone sent automatically ("full" message at 50 users)
- [x] Friendly errors: name missing, email already used, weak password
- [x] Logged-out users → `/login`; logged-in users on `/login` → `/today`
- [x] Sidebar shows display name + avatar initial; Log out button
- Verified so far: lint + build pass; logged-out `/today` and `/` → `/login`; db-test passes after removing invite codes
- **Still to check by hand:** sign-up creates account + defaults; logout → `/login`; logged-in `/login` → `/today`
- **Check:** sign-up creates account + defaults; logout → redirected to `/login`

### Step 4 — Time logic (`src/lib/time/`) ✅
- [x] Node 24 LTS installed (via nvm) and Vitest added
- [x] `"test": "vitest run"` script
- [x] Day boundary at `day_start_hour` (3 AM), user timezone, weekday/weekend day type (`day.ts`, `zone.ts`; Intl only, DST-safe)
- [x] Find Unknown gaps between entries (`findGaps`); split a slot into parts (`splitSlot`) (`slots.ts`)
- Verified: 16 unit tests pass (midnight, 3 AM, day-type changes, gaps, splits, DST). **Run tests from PowerShell** (`npm test`); from Git Bash the `/c/...` path makes Vitest fail with "failed to find the current suite"

### Step 5 — Check-in popup (code done, manual check pending)
- [x] Timer from saved timestamps (`src/lib/checkin/schedule.ts`), interval from profile; checked every 15 s and when the tab becomes visible
- [x] Modal (`src/components/checkin/`): category chips, split slot (slider moves the boundary), "Same as before", while-doing tags, category questions prefilled with last answers
- [x] Browser notification when the tab is in the background (permission button in the popup footer); `L` key and status-bar button = Log now; status bar shows next check-in time
- [x] Save entries + `entry_tags` + `checkins` row (Skip / Esc saves a `skipped` check-in and waits one more interval)
- Verified: lint + build + 23 unit tests (schedule, answers ↔ columns); save path checked against the real database with a throwaway user (split insert, tag, check-ins, overlap rejected, recent read)
- Browser-tested: sign-up → `/today` with name in sidebar; `L` opens the popup; split into two parts and Save writes both entries + an `answered` check-in; logout → `/login`
- [x] Chime sound (`src/lib/checkin/chime.ts`) plays when a popup opens while the tab is in the background; browsers only allow it after your first click/key press on the page (lint + tsc pass; not yet heard in a browser)
- **Still to check by hand:** away 70 min → slot covers the full 70 min; Skip waits another interval; notification appears with the tab in the background
- Known limits: popups only while `status = normal` (Busy/Sleep in step 6); the first-ever slot starts when the app first loads; secondary saves (tags, check-in row) log to the console if they fail

### Step 6 — Busy mode & sleep (code done, manual check pending)
- [x] Busy: 30 min / 1 h / 2 h / until a time / your presets (from `profiles.settings.busy_presets`) + optional label; no popups while busy; when it ends (or "End busy") the check-in opens for the whole block, titled "Busy: <label>"
- [x] "Going to sleep" (one tap) / "I'm awake" → saves a Sleep entry (`source = sleep_button`) and asks sleep quality + today's study plan → `day_logs` (goal snapshot kept if the day already has a row). The "I'm awake" popup also opens by itself when the app loads while sleeping
- [x] Late-night go-quiet: a popup unanswered for a whole interval is recorded as `missed`; 2 missed in a row between 22:00 and day start → status `sleeping` (`status_label = auto-quiet`); next morning asks "When did you sleep?"
- [x] Status bar shows live state (Now: Tracking / Busy · until / Sleeping · since) and swaps its buttons
- Verified: lint + build + 30 unit tests (clock helpers, late-night rule); database side checked with a throwaway user (status updates, sleep entry, day_logs insert/update, missed check-in, invalid status rejected)
- Browser-tested: Busy 30 min with label → status bar shows it, End busy returns to Tracking; Going to sleep → Sleeping; reload while sleeping → "Good morning" popup; I'm awake → `day_logs` row saved (quality 4, weekend goal 240)
- **Still to check by hand:** Busy block popup at the end (needs a real wait); Sleep entry for a longer sleep; ignore 2 popups late at night → goes quiet
- Known limits: an unanswered popup closes after one interval even if you were mid-way through filling it in; time before "Going to sleep" that was never logged stays Unknown (fill it from the Timeline in step 8); busy blocks are saved as normal check-ins (`source = checkin`)

### Step 7 — Schedules & Office day (code done, manual check pending)
- [x] Weekday/weekend office settings read from `profiles.settings.schedule` (`src/lib/checkin/office.ts`); inside office hours popups are due every `office_checkin_min` (2 h) and never run past office end; a slot fully inside office asks "Office as usual?" (Yes = whole slot as Office, Split = normal popup)
- [x] "Office day" button in the status bar (name comes from the routine): one tap writes the routine's entries (`source = office_day`), cut around anything already logged, nothing in the future
- Verified: lint + build + 41 unit tests (office window, due time, clipping/overlap cases); browser test (Chrome via Playwright): sign-up → one tap added 5 entries (09:20–18:40, correct categories, `office_day`), second tap says "Nothing to add", no console errors; DB rows checked, test user deleted
- **Still to check by hand:** "Office as usual?" popup on a real weekday inside 10–18 (needs a wait); tap Office day when part of the day is already logged
- Known limits: tapping in the morning only logs up to now (the rest is covered by the 2-hourly check-ins); time before the routine that was never logged stays Unknown (Timeline, step 8); office hours/routine are edited in Settings (step 10) — for now only in the database

### Step 8 — Timeline page (code done, manual check pending)
- [x] Day picker (previous / next / date input / Today; `?date=YYYY-MM-DD`, never beyond today), 24 h ribbon from the day start, list of blocks (`src/lib/time/blocks.ts`, `src/components/timeline/`)
- [x] Click an entry to change category, times and answers, or delete it (two-step); click a grey Unknown to fill it (`source = backfill`, shown with a "filled later" badge)
- [x] Look: ribbon blocks show a custom hover card (`.tip` in `components.css`: category dot + name, time range, duration, "click to edit/fill") instead of the browser tooltip, and lift with a shadow; list rows are tinted with their category's soft colour (coloured left edge), Unknown rows are hatched like the ribbon
- [x] The slot still being tracked right now ("Now: the next check-in covers this") can't be filled here, so a later check-in never overlaps it; the check-in controller moves its next slot forward if an edit makes an entry end later
- Verified: lint + build + 47 unit tests (gaps, open slot, day-crossing entries, clock → time); browser test (Chrome via Playwright): list + ribbon show entries and Unknown gaps, filling 04:00–06:00 as Sleep saved a `backfill` entry and splits the gap, delete works, previous day loads, no console errors; test users deleted
- **Still to check by hand:** edit an entry's category/answers; edit times so it overlaps a neighbour (should show an error); a sleep that crosses midnight (times are locked when it runs past this day's edges)
- Known limits: "While doing" tags are not editable here yet; a whole empty day reads "3:00 AM – 3:00 AM"

### Step 9 — Today dashboard (code done, manual check pending)
- [x] Greeting with display name + "N pomodoros left" (goal remaining ÷ 25), date / day type line
- [x] Tiles: Study today (ring, goal from `day_logs` snapshot or profile, planned hours badge), Free time at home (study + entertainment + rest, stacked bar), Free time left (until usual sleep = median bedtime of last 14 days, midnight until 3 bedtimes; pips = pomodoros), Wasted today (waste-value time that wasn't planned)
- [x] "Your day" 24 h ribbon with Now and Usual sleep markers, tracking % + unknown badge, link to the Timeline; "Where time went" per category + Unknown
- [x] All formulas in `src/lib/insights/today.ts` (pure, 10 unit tests with a hand-calculated day); styles ported from the design system into `components.css`
- Verified: lint + build + 57 tests; browser test (Chrome via Playwright, 1366×768, no page scroll, no console errors): after one Office day tap the numbers match (Office 8h, Commute 1h 20m, 0 study, tracked % = logged ÷ minutes passed)
- **Still to check by hand:** a day with study + Instagram (wasted / free time tiles), dark mode, 1920×1080
- [x] Live update: check-in, Office day and "I'm awake" saves call `router.refresh()`, so Today/Timeline show the new entry without a reload (lint + build + 57 tests; not yet browser-checked)
- Known limits: "While doing" tags aren't counted in the tiles; "free time left" shows "N needed of 0 possible" once you're past your usual sleep time
- [x] **v2 Today extras (2026-11-27):**
  - Streak + freeze (`src/lib/insights/streak.ts`, loaded by `study-history.ts`): recomputed from the whole history on every render, never stored. A day counts if study ≥ its goal (`day_logs.study_goal_min`, else the current weekday/weekend goal) or a saved freeze covers it (used automatically); every 5 goal-met days earn a freeze (max 2); today joins once its goal is met; history starts on the day of the first entry. Shown on the Study tile and in the status bar (🔥 N, "N freeze" badge). `day_logs.freeze_earned/freeze_used` are not written (not needed while it's computed).
  - Goal on-track badge (§11): study so far + average study after this time on the same day type (last 28 days) → On track / Close / At risk with %, "Learning your pace…" until 7 days of that type; hidden once the goal is met.
  - "While doing" line under Where time went (tag during main category · minutes, not counted twice); tags also shown in the Entries card.
  - Entries card (newest first, Unknown gaps with a Fill link to the Timeline) when the main panel is ≥ 86rem. Note: at 1366×768 the root font is 14px, so it already shows there (design system rule); it fits without page scroll.
  - Verified: 74 unit tests, tsc + eslint + build; browser test with a throwaway user and 5 seeded days (status bar 🔥5 + 1 freeze, tile 🔥5, Learning your pace…, back-to-back Instagram = 1 session, "YouTube during Meal · 30m", Entries card, no page scroll at 1920×1080 and 1366×768, no console errors; users deleted). Dark mode not checked.
- **Left for v2 (in the design but not built on Today):** Coach card with messages (needs the coach); "Today's one goal" note (needs the evening review that sets `tomorrow_goal`); focus/discipline scores

### Step 10 — Settings (code done, manual check pending)
- [x] **Categories & questions:** add a category (name, kind, counts-as, icon from 19), edit name / counts-as / icon, archive or restore (never deleted); per category add questions (type, options for pick-one/several) and remove or restore them; built-in questions are marked
- [x] **Popups & schedule:** check-in interval (15/30/45/60), day start hour, weekday and weekend study goals (hours; past days keep their snapshot), office hours per day type (on/off, from–to, popup every 1 / 1.5 / 2 / 3 h)
- [x] **Busy presets:** add, rename, change minutes, remove (max 10); shown in the Busy popup
- [x] **Account:** display name (1–20), change password (re-checks the current password first), theme Light / Dark / Match my computer
- All saves go straight to Supabase from the browser (RLS keeps them to your own rows) and then refresh the page data, so popups and other pages see the change; `profiles.settings` is saved whole so nothing is dropped
- Verified: lint + build; browser test (Chrome via Playwright): new category + question shows up in the L popup and saves; duplicate name rejected; interval 15 / weekend goal 5 h saved (Today shows 12 pomodoros = 300 ÷ 25); preset saved and listed in Busy; name change shows in the greeting; wrong current password rejected, right one changes it; dark theme applies; DB values checked, test users deleted
- **Still to check by hand:** archive a category (disappears from the popup, still shows on old entries); weekend office hours really switch the popup to 2-hourly; editing an existing question; long category lists scroll inside the panel
- [x] Social apps are separate categories (2026-11-24): migration `20261124000000_social_apps_and_exercise.sql` — Instagram / TikTok / Facebook / Snapchat (entertainment, waste, built-in Planned? / Why? / Mood after), Walking + Swimming (rest, neutral, new `waves` icon); sign-up defaults updated and existing users backfilled; "Social Media" renamed back to Instagram. New Entertainment categories made in Settings now get the three built-in questions automatically (hand-added "Planned?" has no `system_key`, so it wouldn't feed "wasted today"). Reading (rest, productive, "What are you reading?") added by `20261124120000_reading_category.sql`; New category form now explains each kind and warns on odd kind + "Counts as" combos. **Migrations still to be applied:** `npx supabase db push --db-url "$SUPABASE_DB_URL" --yes`
- Known limits: kind can't be changed after creating a category (scores depend on it); question labels can't be renamed (remove and re-add); no "Delete my account" yet; Look (Clean / Notebook) is v2; timezone is shown but not editable; no coach / streak / strictness settings until v2

### Step 11 — Install & deploy
- [x] PWA manifest + icons (installs as its own window): Sprout-on-sage icon (tab, home screen, installed app), `src/app/manifest.ts`, page titles on every page; manifest/icons are public in `src/proxy.ts`. Verified: build + 57 tests; manifest and icons return 200 when logged out
- [x] Deploy to Vercel with env vars (done by the user; running)
- **Check:** installs from the live URL and works end to end — install as PWA from the live URL not yet confirmed

---

## Session log 2026-11-24 — categories, Settings hints, password decision

**Still to do from this session (in order):**
1. ~~Apply the two new migrations~~ — **done** (confirmed 2026-11-26: the real account has Instagram / TikTok / Facebook / Snapchat / Walking / Swimming / Reading and their questions).
2. ~~Then browser-test~~ — partly confirmed by real use (Planned? / Why? / Mood after are saved on social-app entries). Still to check: popup shows Instagram / TikTok / Facebook / Snapchat / Walking / Swimming / Reading; Instagram etc. ask Planned? / Why? / Mood after; Settings → New category shows the kind hint and the mismatch warning; a new Entertainment category auto-gets the three built-in questions; a Planned? answer on a social app is saved to `entries.planned` and affects "Wasted today".

**Decisions made (and why):**
- **Each social app is its own category** (not one "Social Media" category + a "Which app" question). Totals, Timeline colours, "Wasted today" and coach messages (PLAN §12, e.g. "1h of unplanned Instagram") all group by category; an answer on an entry is not visible to them. Users who don't use an app can archive it (hidden from the popup, history kept). A v2 "group" field (e.g. Social media rolling up the apps) is the planned way to get a combined total.
- **Built-in questions need `system_key`** (`planned`, `trigger`, `mood_after`): they are saved to their own entry columns, and "Wasted today" = waste-value time where `planned` is not true (`src/lib/insights/today.ts`). A "Planned?" question added by hand has no system key, so it would never feed wasted time. That's why seeding / auto-adding sets the keys.
- **Kind vs "Counts as":** the kind drives the study goal, streak, free time and sleep logic; "Counts as" (productive / neutral / waste) drives "wasted" and, later, scores. Kind can't be changed after creation. Walking / Swimming = `rest` + neutral. Reading = `rest` + productive (free time, does NOT count toward the study goal; reading for study should be logged under Study).
- **Password minimum stays 8.** A 4-character minimum was tried and reverted (too weak for a public app). Login friction is handled by: sessions that last 400 days (library default, refreshed by `src/proxy.ts`; do NOT enable Supabase's time-box / inactivity session limits) and password-manager friendly forms (email field `autocomplete="username"`).

**Files changed:**
- `supabase/migrations/20261124000000_social_apps_and_exercise.sql` — new `seed_defaults` (Instagram 60, TikTok 62, Facebook 64, Snapchat 66 each with Planned? / Why? / Mood after; Walking 92 + Swimming 94 as rest/neutral); backfills all existing users; renames a user's "Social Media" back to "Instagram" and archives its "Which app you used" question.
- `supabase/migrations/20261124120000_reading_category.sql` — `seed_defaults` again with Reading (96, rest, productive, text question "What are you reading?"); adds it for users who don't already have a "Reading" category (the user's own one is left alone).
- `src/components/checkin/category-icon.tsx` — added the `waves` icon (Swimming).
- `src/components/settings/categories-tab.tsx` — creating an Entertainment category also inserts the three built-in questions; New category form shows a one-line hint per kind (and "can't be changed later") and a red warning for odd kind + value combos (Study ≠ productive; Rest/Entertainment + productive; non-Entertainment + waste). Warning only, saving is still allowed.
- `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/signup/signup-form.tsx` — email `autoComplete="username"`.
- Password length files (`actions.ts`, `signup-form.tsx`, `account-tab.tsx`) were changed to 4 and changed back to 8 — net no change.

**Verified:** `tsc` and eslint pass. Playwright (Chrome, dev server on :3000, nothing written to the DB): login/signup autocomplete attributes, 8-char hint and `minlength`, server rejects 5- and 7-char passwords, wrong-password message, logged-out redirect, no console errors — 12/12. **Not verified:** the two migrations (never run against a database) and all logged-in Settings / popup changes (needs step 2 above). Playwright isn't a project dependency; it was installed in a scratch folder with system Chrome (`channel: "chrome"`).

---

## Audit 2026-11-26 — 5 days of real data (21–26 Nov)

**Verified correct** (independent recalculation from the raw rows vs. the app, via Playwright): Today tiles, "Where time went", tracked %, unknown time and Timeline totals for all 6 days; no overlapping entries or orphan categories; 57 unit tests pass.

**Fixed:** "Office day" saved entries ending at the exact current second (`runRoutine` now floors `now` to the minute), which gave the next check-in entries stray seconds (e.g. `:41`). Existing rows from 24 and 26 Nov keep their odd seconds (under a minute, harmless).

**Also fixed:** `day_logs.wake_at` / sleep quality / plan were overwritten by every "I'm awake", including after a nap. Now the first wake of the day wins and later taps only fill empty fields (`mergeWake` in `src/lib/checkin/day-log.ts`, 4 unit tests; 61 tests pass). Not browser-tested (it would write a sleep entry to the real account). The existing 22 Nov row still holds the 9:15 PM nap wake (morning wake was 7:53 AM; fix by hand if wanted).

**"Decide before v2" issues — settled 2026-11-27:**
- [x] **Late bedtimes:** `usualSleepMs` now counts sleep starting in the first 4 h of a tracked day (3–7 AM) as the night before (+24 h), so 3:25 AM bedtimes count; sleep starting exactly at the day start is ignored (a check-in slot after a gap, not a bedtime); the "Usual sleep" ribbon marker is clamped to the right edge when it's past the day's end. Still the default (midnight) until 3 bedtimes exist. 2 unit tests.
- [x] **Sessions:** "Wasted … N sessions" now counts runs of back-to-back unplanned entries of the same category (three 30-min Instagram slots = 1 session; a different app, a gap or a planned part starts a new one), in `computeToday`. The v2 drift messages should reuse this count. 1 unit test.
- [x] **Unanswered "Planned?" = wasted:** kept, by design (§11).
- [x] **Gap days:** when the app opens and the last entry ended before today's day start and ≥ 3 h ago (`MORNING_GAP_MIN`), the Good-morning popup opens instead of a 3 AM slot: "Fell asleep" (prefilled with the last entry's time, or 23:00 after > 12 h) + "Woke up" (now), sleep quality, study plan. Saves a Sleep entry (`source = backfill`), `day_logs.wake_at` = the wake time, status stays normal; check-ins start at the wake time. Skip = start tracking from now (gap stays Unknown). Browser-tested with a throwaway user (12/12: popup + fields + prefill, entry 22:00–23:50 backfill, day_logs wake_at, no popup after reload, no console errors; user deleted). 63 tests, tsc + eslint pass.
- Existing 3:00 AM "sleep" rows from 25/26 Nov stay as they are (ignored by usual sleep; they drop out of the 14-day window anyway).

---

## Later

### v2 — Focus & coaching

Steps are in build order (later steps use data from earlier ones). PLAN references: Pomodoro §4.6, streak §4.7 / §11, review §4.10, scores + weekly + report card §11, coach §6 / §12, Notebook look §9.

**How to record a step (keeps this file a history):** when a task or step is finished, tick it and add under the step:
- **Done (date):** what was built, with the main files
- **Decisions:** options considered → which one was chosen and why (include choices the user made)
- **Verified:** tests / browser checks actually run, and their result
- **Not verified / known limits:** what is still unchecked or deliberately left out

Don't delete old records. If a later step changes an earlier decision, add a note in both places.

#### Step 12 — Today page extras, part 1 ✅
- [x] Streak + freeze on the Study tile and status bar
- [x] Goal on-track badge ("Learning your pace…" until 7 days of the same day type)
- [x] "While doing" line under Where time went
- [x] Entries card (recent list) when the main panel is ≥ 86rem
- **Done (2026-11-27):** full record under Step 9 → "v2 Today extras". Files: `src/lib/insights/streak.ts`, `study-history.ts`, `src/app/(app)/today/page.tsx`, `src/components/shell/status-bar.tsx`, `components.css`.
- **Decisions:** the user chose to build only the 4 self-contained extras now; the coach card moves to Step 16 and "Today's one goal" to Step 14. The streak is computed from history on every render, not stored (`day_logs.freeze_*` not written).
- **Design-system match (2026-11-27):** checked against `design-system/preview.html`; the on-track badge now uses its icons (On track = circle-check, Close = gauge, At risk = triangle-alert) and the learning badge the sprout icon used for "Learning" states. The small streak chip on the Study tile (`.tile .streak`) is a scaled-down `.streak`; the preview only shows the streak in the status bar, PLAN §9 asks for it with the study goal.
- **Before this step (same day):** the four "decide before v2" issues were settled (see "Audit 2026-11-26"); for the gap-day popup the user picked the "Good-morning popup" option over "start tracking from now" and "keep as is".

#### Step 13 — Pomodoro & Focus page (§4.6)
- [ ] Focus page: timer (15 / 25 / 50 min), "What are you studying?" subject picker (pick or add a subject → `subjects`)
- [ ] Status `pomodoro`: check-in popups pause while it runs; status bar shows "Now: Study (subject) mm:ss"
- [ ] When it ends (or is stopped): auto-log a Study entry (`source = pomodoro`, `subject_id`) + `pomodoros` row (planned_min, completed / stopped early)
- [ ] End popup: focus 1–5, phone checks, completed or stopped early → saved on the entry (`focus`, `phone_checks`)
- [ ] Chime + browser notification at the end, even with the tab in the background (timestamps, not timers)
- [ ] Today's sessions list on the Focus page; "Start a pomodoro" button on Today
- [ ] The next check-in slot starts after the pomodoro entry (no overlap)
- **Check:** a 1-minute test pomodoro saves the entry + pomodoros row, popups stay paused while it runs, a reload mid-session keeps the timer

#### Step 14 — Morning plan & evening review (§4.10)
- [ ] Morning plan: the "I'm awake" study plan already saves `planned_study_min`; add "today's one goal" (text) when none was set last night
- [ ] Evening review modal (1 minute): today's study vs goal, wasted time, plan vs actual, tracking %; set **tomorrow's one goal** → `day_logs.tomorrow_goal` on tomorrow's row; `review_done = true`
- [ ] When it opens: offered ~30 min before usual sleep and from "Going to sleep"; never twice a day
- [ ] Today page: "Today's one goal · set last night" note in the header (design: `.today-head .note`)
- **Check:** review saves tomorrow's goal; next day it shows on Today; skipping the review doesn't block "Going to sleep"

#### Step 15 — Coach engine (§12)
- [ ] Templates in one file (`src/lib/coach/`): `rule_key` × strictness (gentle / balanced / strict) × 2–3 variants; placeholders filled with real numbers
- [ ] Rules as pure functions (event → maybe a message): morning (`early_start`, `normal_wake`, `plan_set`, `bad_sleep`), study (`pomo_*`, `goal_reached`, `goal_beaten`), drift (`drift_1/2/3`, `drift_long`, `drift_trigger`; sessions counted like "Wasted today"), goal at risk (`free_now`, `goal_at_risk`, `last_chance`, `freeze_saved`), night (`sleep_early`, `sleep_late`, `review_reminder`), recovery (`missed_yesterday`, `two_missed`, `comeback`), milestones (`streak_milestone`, `streak_record`, `freeze_earned`), tracking (`low_tracking`, `many_missed`)
- [ ] Events wired in: check-in saved, pomodoro done, "I'm awake", "Going to sleep", goal reached, day ends
- [ ] Anti-annoyance: max 1 message per event (priority Drift > Goal at risk > Praise > Info), same message not within 24 h, max 1 browser notification per 30 min, after 5 scolds the next real win always shows
- [ ] Save shown messages to `coach_messages`; `acted_on` = pomodoro started within 10 min
- [ ] Toast after saving a check-in; browser notification only for `drift_3`, `goal_at_risk`, `last_chance`, `free_now`
- [ ] Unit tests per rule (hand-made days) + anti-annoyance tests
- **Check:** 3 unplanned Instagram check-ins in one evening give `drift_1` → `drift_2` → `drift_3` (one each), with no repeats after a reload

#### Step 16 — Coach on Today + nudges
- [ ] Coach card on Today (newest first, severity colours, "View all"); layout: coach span 7 + where span 5, ≥ 86rem coach 5 / where 4 / entries 3 (design system)
- [ ] Nudges from §4.8: "You're free now" after dinner/walk, "Early start" at 3–5 AM wake, streak at risk
- [ ] Strictness shown on the card badge (Balanced by default)
- **Check:** messages from Step 15 show on Today after a refresh; page still doesn't scroll at 1366×768

#### Step 17 — Streak settings & Goals page (§4.7)
- [ ] Settings → Streak & goals tab: weekday / weekend goal (move from Popups & schedule or link), freeze rules shown (every 5 days, max 2)
- [ ] Goals page → Streak tab: heatmap (goal met / freeze / missed / no data), current + best streak, freezes saved
- [ ] Best streak and freeze history computed from the same `streak.ts` logic
- **Check:** heatmap matches the status bar streak; changing a goal doesn't change past days (snapshot)

#### Step 18 — Focus & discipline scores (§11 Scores)
- [ ] `src/lib/insights/scores.ts`: focus score (minute-weighted focus − phone penalty), discipline score (plan kept 50% / planned fun 30% / goal hit 20%) + unit tests
- [ ] Shown for today (Today or Insights) and per week (Step 19)
- **Check:** hand-calculated day matches both scores

#### Step 19 — Weekly insights + report card (Insights page)
- [ ] Insights → This week: study per day vs goal, weekly projection + daily gap, recoverable time, best focus hours, strong/weak day, drift triggers, commute potential
- [ ] Insights → Report card: graded metrics (A–F), Strong / Needs work, "🎯 Fix one thing"
- [ ] Minimum data rule: "Unlocks after 4 days" until 4 logged days that week
- [ ] Formulas in `src/lib/insights/weekly.ts` + unit tests
- **Check:** a seeded week gives the hand-calculated grades; empty week shows the unlock message

#### Step 20 — Settings extras
- [ ] Coach tab: strictness Gentle / Balanced / Strict (`profiles.coach_strictness`)
- [ ] "Delete my account" (confirm by typing; removes all data)
- [ ] Edit category kind (with a warning that past scores change) / rename questions
- **Check:** strictness changes the wording of the next message; deleted account can't log in and its rows are gone

#### Step 21 — Look: Clean / Notebook (§9 "Two looks")
- [ ] Load the Notebook fonts with `next/font`; port `design-system-v2` tokens scoped under `[data-look="notebook"]`
- [ ] Set `data-look` before first paint (same script as the theme), saved in localStorage
- [ ] Settings → Look toggle
- **Check:** every page in 4 combinations (Clean/Notebook × light/dark), Notebook at 1366×768 first; no page scroll

### v3 — Deeper insights
- [ ] "Usually next" smart suggestions
- [ ] Pattern insights (sleep, wake-up, phone checks)
- [ ] Subject goals with predicted finish dates, long-term forecasts
- [ ] CSV export
- [ ] Optional: email password reset (Resend), Google sign-in, Hinglish coach messages

---

## Notes for whoever continues

- **Secrets:** `.env.local` (git-ignored) has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL` (session pooler, contains the DB password). Never print or commit it.
- **DB changes:** add a new file in `supabase/migrations/` (`YYYYMMDDHHMMSS_name.sql`), then
  `npx supabase db push --remote="$SUPABASE_DB_URL" --yes`. One-off SQL: `npx supabase db query --remote="$SUPABASE_DB_URL" --yes "<sql>"`.
- **Users:** sign-up is open but capped at 50 users (in `private.handle_new_user` and `signups_open()`). Free slots by deleting inactive users in Supabase → Authentication → Users. Users must sign up through the app (dashboard-created users have no display name and fail).
- **Styling:** use the design system classes in `src/styles/components.css` (`.btn`, `.card`, `.chip`, …), not shadcn styling, so the Notebook skin can override them later.
- **Changes from PLAN §3:** no "Wake up" category ("I'm awake" button instead); Movie / Series asks "Planned?"; question type `number` for phone checks.
- **Next.js 16:** APIs differ from older versions; read `node_modules/next/dist/docs/` before using a new API (see [AGENTS.md](AGENTS.md)).
- **Playwright** is a devDependency (installed 2026-11-26, v1.65). No browser download needed: launch with `chromium.launch({ channel: "chrome" })` (system Chrome). Start `npm run dev`, log in with env vars (`HH_EMAIL`, `HH_PW`), never write credentials into files; keep scratch scripts and saved sessions (`storageState`) out of the repo and delete them afterwards. Login form: fill `#email`, `#password`, click the "Log in" button. Don't write test data to a real account; use a throwaway sign-up and delete it.
- **Node:** 24 LTS via nvm-windows (`nvm use 24.22.3`); pinned in `package.json` engines (`24.x`) and `.nvmrc`. The old winget Node 21 was uninstalled.
- **Category kinds:** the same 8 names everywhere (database, CSS `data-kind`, tokens `--cat-*`): sleep, study, work, commute, routine, chore, entertainment, rest. `busy` and `unknown` are UI-only states.
