# Honest Hours — TODO / Progress

> **Start here in every new session.** This file tracks what's done and what's next.
> The full design is in [PLAN.md](PLAN.md) (features §4, screens §9, database §10, calculations §11, coach §12).
> Last updated: 2026-11-27 (polish: page-load indicator — see "Polish: page-load indicator")

**Current status:** v1 steps 0–2 and 4 done; Steps 3 and 5–10 are coded, smoke-tested in a real browser (Chrome via Playwright) and in daily use since 2026-11-21. Step 11: PWA + Vercel deploy done (deploy reported by the user, not checked in this session); installing the PWA from the live URL still to confirm. v2 started: Steps 12–20 done (Step 20 = Settings extras). **Next: v2 Step 21 — Look: Clean / Notebook** (the last v2 step) (v2 is broken into Steps 12–21 under "Later").

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
- **Left for v2 (in the design but not built on Today):** Coach card with messages (needs the coach); focus/discipline scores. ("Today's one goal" note: built in Step 14.)

### Step 10 — Settings (code done, manual check pending)
- [x] **Categories & questions:** add a category (name, kind, counts-as, icon from 19), edit name / counts-as / icon, archive or restore (never deleted); per category add questions (type, options for pick-one/several) and remove or restore them; built-in questions are marked
- [x] **Popups & schedule:** check-in interval (15/30/45/60), day start hour, weekday and weekend study goals (hours; past days keep their snapshot), office hours per day type (on/off, from–to, popup every 1 / 1.5 / 2 / 3 h)
- [x] **Busy presets:** add, rename, change minutes, remove (max 10); shown in the Busy popup
- [x] **Account:** display name (1–20), change password (re-checks the current password first), theme Light / Dark / Match my computer
- All saves go straight to Supabase from the browser (RLS keeps them to your own rows) and then refresh the page data, so popups and other pages see the change; `profiles.settings` is saved whole so nothing is dropped
- Verified: lint + build; browser test (Chrome via Playwright): new category + question shows up in the L popup and saves; duplicate name rejected; interval 15 / weekend goal 5 h saved (Today shows 12 pomodoros = 300 ÷ 25); preset saved and listed in Busy; name change shows in the greeting; wrong current password rejected, right one changes it; dark theme applies; DB values checked, test users deleted
- **Still to check by hand:** archive a category (disappears from the popup, still shows on old entries); weekend office hours really switch the popup to 2-hourly; editing an existing question; long category lists scroll inside the panel
- [x] Social apps are separate categories (2026-11-24): migration `20261124000000_social_apps_and_exercise.sql` — Instagram / TikTok / Facebook / Snapchat (entertainment, waste, built-in Planned? / Why? / Mood after), Walking + Swimming (rest, neutral, new `waves` icon); sign-up defaults updated and existing users backfilled; "Social Media" renamed back to Instagram. New Entertainment categories made in Settings now get the three built-in questions automatically (hand-added "Planned?" has no `system_key`, so it wouldn't feed "wasted today"). Reading (rest, productive, "What are you reading?") added by `20261124120000_reading_category.sql`; New category form now explains each kind and warns on odd kind + "Counts as" combos. **Migrations still to be applied:** `npx supabase db push --db-url "$SUPABASE_DB_URL" --yes`
- (2026-11-27: the weekday/weekend goal inputs moved from Popups & schedule to the Streak & goals tab, see Step 17.)
- (2026-11-27: kind is now editable, questions can be renamed and "Delete my account" exists — see Step 20.) Old limits: kind can't be changed after creating a category (scores depend on it); question labels can't be renamed (remove and re-add); no "Delete my account" yet; Look (Clean / Notebook) is v2; timezone is shown but not editable; no coach / streak / strictness settings until v2

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

#### Step 13 — Pomodoro & Focus page (§4.6) ✅ (code done, browser-tested)
- [x] Focus page: timer (15 / 25 / 50 min), "What are you studying?" subject picker (pick or add a subject → `subjects`)
- [x] Status `pomodoro`: check-in popups pause while it runs; status bar shows "Now: Study (subject) mm:ss" + Focus / Stop early buttons
- [x] When it ends (or is stopped): auto-log a Study entry (`source = pomodoro`, `subject_id`) + `pomodoros` row (planned_min, completed / stopped early)
- [x] End popup: focus 1–5, phone checks, completed or stopped early → saved on the entry (`focus`, `phone_checks`)
- [x] Chime + browser notification at the end, even with the tab in the background (timestamps, not timers)
- [x] Today's sessions list on the Focus page; "Start a pomodoro" button on Today
- [x] The next check-in slot starts after the pomodoro entry (no overlap)
- **Done (2026-11-27):** the controller (always mounted) owns the session: start inserts an open `pomodoros` row and sets `profiles.status = pomodoro` (`status_since` = start, `status_until` = end, `status_label` = subject name), so a reload or a second tab keeps the timer. The Focus page and the status bar only read the shared store and send start/stop events (`sendPomodoro` in `store.ts`). The end is detected from the saved end time (checked every second and on tab focus, also on load), then chime + notification (if the tab is hidden and permission is granted) + the end popup, which can't be dismissed. Saving writes the entry, updates the `pomodoros` row (`ended_at`, `completed`, `entry_id`), sets status back to normal and moves the next check-in slot to the entry's end. Files: `src/lib/checkin/pomodoro.ts` (+ test), `use-now.ts`, `store.ts`, `src/components/checkin/checkin-controller.tsx`, `checkin-host.tsx`, `pomodoro-end-modal.tsx`, `src/components/focus/focus-view.tsx`, `src/app/(app)/focus/page.tsx`, `status-bar.tsx`, `today/page.tsx`, `components.css` (Focus styles ported from `preview.html`).
- **Decisions:** (1) No Pause/Resume (the preview has it; PLAN §4.6 doesn't): a paused session would need extra state and the timer is timestamp-based. Stop early is the way out. (2) Stopping under 1 minute deletes the session and logs nothing (accidental click), rather than writing a 0-minute entry. (3) The entry is whole minutes and starts at the later of the session start and the newest entry's end (`pomodoroSpan`), so it can't overlap; a completed session logs exactly its planned length even if you come back late (the time until you answer becomes the next check-in slot). (4) Time between the last entry and the session start is not asked about; it stays Unknown (fill it from the Timeline), same as the Busy / Sleep limits. (5) "Start a pomodoro" on Today is a link to Focus (the subject must be picked there). (6) The notification permission is a button on the Focus page, not asked automatically. (7) The "subject goal" card in the design (DSA 46 of 100 h) is v3.
- **Verified:** 78 unit tests (4 new), tsc + eslint. Browser test (Chrome via Playwright, throwaway user, 23/23): Today link; Start disabled with no subject; add subject, duplicate rejected; status bar "Now: Study (DSA) 25:00" and the timer counts down; "Next check-in" shows —; reload mid-session keeps the timer; stop under 1 min leaves no row; end popup opens by itself when the time is up (no check-in popup meanwhile); saving gives a `pomodoros` row (completed, `entry_id`) and a 25-minute Study entry with focus 4, phone checks 2, `subject_id`; status back to normal; session listed with "Focus 4/5 · completed"; stop early after ~3 min preselects "Stopped early" and saves a 3–4 minute entry that doesn't overlap; next check-in time = entry end + interval; no page scroll at 1366×768; Timeline shows the entries; no console errors. Run times were faked by moving `status_since/until` and `pomodoros.started_at` with the user's own session, so no real 25-minute wait. A hydration mismatch found on the way (notification permission read while rendering) is fixed. Test user deleted.
- **Not verified / known limits:** the real chime and browser notification with the tab in the background (needs a real wait and a granted permission); a real 25-minute run; `npm run build` not run (dev server was in use); dark mode and 1920×1080 on the Focus page; the coach reacting to pomodoros (Step 15); a session crossing the day start isn't split; "Session N today" counts finished sessions + 1.

#### Step 14 — Morning plan & evening review (§4.10) ✅ (code done, browser-tested)
- [x] Morning plan: the "I'm awake" study plan already saves `planned_study_min`; "Today's one goal" (text, optional) is asked in the same popup when today has none yet
- [x] Evening review modal (1 minute): today's study vs goal, wasted time (+ sessions), plan vs actual, tracking %; set **tomorrow's one goal** → `day_logs.tomorrow_goal` on tomorrow's row; `review_done = true` on today's row
- [x] When it opens: by itself 30 min before usual sleep, and from "Going to sleep"; at most once a day
- [x] Today page: "Today's one goal" sticky note in the header (design: `.today-head .note`)
- **Done (2026-11-27):** `src/lib/checkin/review.ts` (+ test): `reviewDue` (30 min before usual sleep, not after day end, not if done/offered), `planGapMin`, `cleanGoal` (trim, collapse spaces, 140 chars, empty → null). `src/components/checkin/review-modal.tsx` (summary grid + goal input + Skip / Save, or "Save & go to sleep"). `checkin-controller.tsx`: `openReview` loads today's entries + categories + `day_logs` in the browser and runs `computeToday` (so the numbers are fresh and match Today); `saveReview` writes today's `review_done` and tomorrow's `tomorrow_goal` (creates the row with that day type's goal snapshot if missing); an effect checks every 30 s; the Sleep command opens the review first unless it was already saved/offered; the status bar's "next check-in" and popups pause while it is open. `checkin-host.tsx` passes `sleepStarts` (last 14 days), `reviewDone`, `todayGoal`. `wake-modal.tsx` gets the optional goal field (`askGoal`); `day-log.ts` `mergeWake` now also keeps an existing `tomorrow_goal`. `today/page.tsx` shows the note; `components.css` has `.today-head .note` (+ hidden below 70rem, as in the design) and the review grid.
- **Decisions:** (1) "Offered once a day" is remembered in `localStorage` (`hh-review-offered:<day>`), not the database: there is no column for "offered", and a skipped review should not come back on reload; a saved review is `day_logs.review_done`. Side effect: a different device/browser can offer it again if you skipped on the first. (2) Skip never blocks sleep: from "Going to sleep", Skip (or Esc) goes straight to sleeping. (3) If the auto review was already offered (even skipped) that day, "Going to sleep" doesn't offer it again — the "never twice a day" rule wins over "offered from Going to sleep". (4) The one-goal is stored in the existing `tomorrow_goal` column of the day it is *for* (tomorrow's row tonight; today's row from the morning popup), so no migration. The note label is just "Today's one goal" (the design's "set last night" can't be told apart from a morning goal without another column). (5) The tomorrow row is created with tomorrow's day-type goal at the current settings, so a goal changed in Settings before tomorrow isn't picked up by that snapshot (the wake popup keeps an existing row's snapshot too). (6) The review numbers are computed in the browser at open time rather than passed down from the server, so they're never stale.
- **Verified:** 83 unit tests (5 new + `mergeWake` extended), tsc + eslint. Browser test (Chrome via Playwright, throwaway users, deleted after; real clock after midnight, and a faked 15:00 clock for the daytime path): auto review opens by itself, shows study / wasted / plan / tracked and a plain **Save**, text is cleaned ("  Finish   graphs  set " → "Finish graphs set"), `day_logs` has today `review_done = true` + tomorrow row with the goal, not offered again after reload, "Going to sleep" afterwards goes straight to Sleeping; wake popup asks today's one goal, saves it on today's row while keeping `review_done`, Today shows the sticky note, no page scroll at 1366×768; daytime: no auto review, "Going to sleep" opens it with **Save & go to sleep**, Skip starts sleeping and saves nothing, not offered again that day; no console errors. (One test check failed only because it matched upper-case labels case-sensitively; confirmed in a screenshot.)
- **Not verified / known limits:** "next day the note shows" was checked as "same day, morning goal", not across a real day change; the goal-field-hidden case when tonight's review already set it for tomorrow (code path `askGoal={!todayGoal}`, not browser-tested); dark mode and 1920×1080; the 30-minute-before-usual-sleep time with real bedtime history (only the default midnight was hit); no way to open the review by hand yet (add a button later if wanted); the review doesn't yet feed the coach (`review_reminder`, `low_tracking` come in Step 15).

#### Step 15 — Coach engine (§12) ✅ (code done, browser-tested)
- [x] Templates in one file (`src/lib/coach/templates.ts`): 29 rule keys × strictness (gentle / balanced / strict, fallback balanced) × 1–2 variants (variants rotate by how often the rule was shown); `{placeholders}` filled with real numbers
- [x] Rules as pure functions (`src/lib/coach/rules.ts`, `candidatesFor(event, facts)`): morning (`early_start`, `normal_wake`, `plan_set`, `bad_sleep`), study (`pomo_done_good/weak`, `pomo_abandoned`, `goal_reached`, `goal_beaten`), drift (`drift_1/2/3`, `drift_long`, `drift_trigger`; sessions counted like "Wasted today"), goal at risk (`free_now`, `goal_at_risk`, `last_chance`, `freeze_saved`), night (`sleep_early`, `sleep_late`, `review_reminder`), recovery (`missed_yesterday`, `two_missed`, `comeback`), milestones (`streak_milestone`, `streak_record`, `freeze_earned`), tracking (`low_tracking`, `many_missed`)
- [x] Events wired in (`checkin-controller.tsx`, `emitCoach`): check-in saved, pomodoro saved, "I'm awake", "Going to sleep", evening review opened, 3 missed check-ins. The facts come from the database right after the save (`src/lib/coach/facts.ts`)
- [x] Anti-annoyance (`pick`): max 1 message per event (priority Drift > Goal at risk > Praise > Info), same rule not within 24 h, after 5 scolds in a row a real win (praise) replaces the next scold; browser notification only for `drift_3`, `goal_at_risk`, `last_chance`, `free_now`, at most 1 per 30 min (`canNotify`, last time in localStorage `hh-coach-notified`)
- [x] Shown messages saved to `coach_messages` (rule_key, severity, text); `acted_on` = a pomodoro started within 10 minutes (`markActedOn`)
- [x] Toast after the save (`src/components/coach/coach-toast.tsx`, shared look `coach-message.tsx` for Step 16): bottom right, 12 s, "Start pomodoro" link where the next step is a session
- [x] Unit tests per rule + anti-annoyance (26 new in `coach.test.ts`)
- **Done (2026-11-27):** also `streak.ts` got `pastOutcomes` (per-day met / frozen / running streak / freeze earned; `computeStreak` now uses it, same results) so the coach can ask for best streak, yesterday's outcome and missed days in a row; `study-history.ts` now takes any Supabase client (browser too); the host passes `coach_strictness` and the last 60 shown messages; `Category` got an optional `value` (needed to know what counts as waste).
- **Decisions:** (1) One engine call per event; `emitCoach` calls are chained so two quick saves can't show the same message twice. (2) Back-to-back entries of the same app are one drift *session* (the settled "Wasted today" rule), so three Instagram check-ins in a row give `drift_1` then `drift_long` (≥ 45 min), not `drift_1/2/3`; the 1→2→3 escalation needs different sessions (Instagram, YouTube, Instagram). The Step 15 check in this file was worded for separate sessions. (3) PLAN §12 examples that quote statistics we don't compute yet (avg focus 4.3, "study 1h 20m higher after nights like this", "costs ~45 min next day", top-10% day) were reworded without the number rather than inventing it; they can return with Steps 18/19. (4) `last_chance` needs a streak ≥ 1, no freeze and ≤ 60 min before usual sleep, and is only evaluated when something is saved (events, not a timer, as PLAN §12 says). (5) `goal_at_risk` uses the existing on-track check (7+ days of the same day type), so it stays silent for new users; `free_now` fires after a Meal / Walking / Dinner entry after 5 PM when the goal isn't met. (6) Not built (need later steps): `best_week`, `subject_milestone`, `weekly_*` (Step 19 / v3), `Strictness` setting UI (Step 20; value comes from `profiles.coach_strictness`, default Balanced).
- **Verified:** 110 unit tests (27 new incl. `pastOutcomes`), tsc + eslint. Browser test (Chrome via Playwright, faked 7 PM clock on a throwaway user, deleted after): a 2 h 30 m Study check-in → `goal_reached` toast; then Instagram → `drift_1`, YouTube → `drift_2`, Instagram → `drift_3` (one each, in order, saved in `coach_messages`, no unfilled placeholders); reload adds nothing; a 4th unplanned session within 24 h stays silent; starting a pomodoro sets `acted_on` on the latest message; toast looks right (screenshot checked); no console errors.
- **Not verified / known limits:** the browser notification and its 30-min limit (unit-tested only; needs a hidden tab + granted permission); the morning, night, recovery, streak, `free_now`, `goal_at_risk`, `last_chance` and `many_missed` rules are unit-tested with hand-made days but not driven through the browser; Gentle/Strict wording is only unit-tested (the setting UI is Step 20); messages are English only.

#### Step 16 — Coach on Today + nudges ✅ (code done, browser-tested)
- [x] Coach card on Today (newest first, severity colours, "View all"); layout: coach span 7 + where span 5, ≥ 86rem coach 5 / where 4 / entries 3 (design system)
- [x] Nudges from §4.8: "You're free now" after dinner/walk (`free_now`) and "Early start" at a 3–5 AM wake (`early_start`) were built in Step 15 and arrive as toast + card message; **streak at risk** is new: a live line at the top of the card (`src/lib/coach/nudges.ts`)
- [x] Strictness shown on the card badge (Balanced by default; reads `profiles.coach_strictness`)
- **Done (2026-11-27):** `today/page.tsx` loads the last 100 `coach_messages`; the card shows the newest 8 (+ the live nudge) in the design's `.coach` style via the shared `coach-message.tsx`; "View all" (`coach-history.tsx`) opens a scrolling dialog with all 100; empty state text; `components.css`: `.coach-card` / `.where-card` spans per the design, and "Where time went" is now one column (it sat full width in two columns before, which no longer fits beside the card). Messages from the toast (Step 15) appear on the card after the `router.refresh()` the engine does.
- **Decisions:** (1) The streak-at-risk nudge is *live*, not saved to `coach_messages`: it is a status ("40m studied, 1h 20m to go to keep your 6-day streak, you usually sleep around 12 AM") that is always true or gone, so saving it would only fill history and the 24-hour no-repeat rule would hide it when it still matters. It shows only from 5 PM, with a streak ≥ 1 and the goal unmet; "tight" wording when the free time left is less than what's needed. (2) "View all" is a dialog, not a new page (no page was specified; Insights gets its own sections in Step 19). (3) The card shows 8 messages, the rest are in "View all"; the card scrolls inside itself so the page never scrolls.
- **Verified:** 112 unit tests (2 new for the nudge), tsc + eslint. Browser test (Chrome via Playwright, throwaway user, deleted after): empty state + Balanced badge; 10 seeded messages show newest first, only the latest 8, severity colours (`data-sev`); View all lists all 10; no page scroll at 1366×768 and 1920×1080; widths follow the design (1366: coach wider than where; 1920: coach > where > entries, three columns); dark mode screenshot checked; no console errors. The Good-morning gap popup that opened after seeding a day-old entry was skipped, as designed.
- **Not verified / known limits:** the live streak-at-risk line was not seen in the browser (the server renders with the real clock, and the test could only fake the browser clock; it is unit-tested). "View all" has no filter or paging beyond the last 100. Notebook look (Step 21) will restyle the card.

#### Step 17 — Streak settings & Goals page (§4.7) ✅ (code done, browser-tested)
- [x] Settings → **Streak & goals** tab: weekday / weekend goal (moved here from Popups & schedule), freeze rules shown (every 5 days, max 2)
- [x] Goals page → **Streak** tab: heatmap (goal met / freeze / missed / no data), current + best streak, freezes saved, goal days, freeze history
- [x] Best streak and freeze history computed from the same `streak.ts` logic (`streakSummary`, built on `pastOutcomes`)
- **Done (2026-11-27):** `streak.ts` `streakSummary(days)` (cells, current, best, freezes, goal days, earned/used events); `src/lib/insights/heatmap.ts` (`heatLevel`, `heatColumns`: 26 weeks, Monday first, "no data" before the first logged day); `src/lib/insights/goal-snapshots.ts` (`missingSnapshots`); `src/components/settings/streak-tab.tsx` (+ `settings-view.tsx` tab, goals removed from `schedule-tab.tsx`); `src/app/(app)/goals/page.tsx` (tabs "Streak" and a disabled "Subject goals · later", four stat tiles, heatmap with weekday labels + legend + hover titles, freeze history); heatmap extras in `components.css` (no-data shade, legend keys, dark mode).
- **Decisions:** (1) **Goals moved** out of Popups & schedule into the new tab instead of showing them twice (one place to change them). (2) **Changing a goal must not rewrite history, and it would have:** a day without a `day_logs` row is judged by the *current* goal, so before saving a new goal the tab writes a `day_logs` snapshot (old goal by day type) for every past day since the first entry that has no row, and aborts without changing anything if that fails. Today is left alone, so it follows the new goal immediately. (3) Heatmap shades: freeze = freeze shade; goal met = dark green, 150%+ darker; missed = empty, or light when some study was done (≥ half the goal = a bit darker); days before the first entry = outlined "no data"; today shows its progress so far. (4) The Subject goals tab is shown disabled ("later", v3) rather than hidden, so the PLAN §9 page structure is visible. (5) Goal days = days with the goal met (freeze days are not goal days), out of all tracked days.
- **Verified:** 119 unit tests (new: `streakSummary` ×2, `heatLevel`/`heatColumns`, `missingSnapshots`), tsc + eslint. Browser test (Chrome via Playwright, throwaway user with 9 seeded days, deleted after): current 2, best 6, freezes 0 of 2, goal days 7 of 10, heatmap = 1 freeze day + 1 big day + 7 goal days, freeze history "earned" and "used" with hover titles, no-data cells before the first entry; goals gone from Popups & schedule; Streak & goals tab shows 2 h / 4 h and the rules; changing the weekday goal 2 h → 3 h saves the profile **and** snapshots all 9 past days with their old goals (120 / 240 by day type), and the streak numbers and heatmap are identical afterwards; no page scroll at 1366×768; dark-mode screenshot taken; no console errors.
- **Not verified / known limits:** the snapshots are bulk-inserted in chunks of 500 rows (fine for years of data, but not tried with hundreds of past days); a day that has a row from "I'm awake" or the review keeps that row's goal (as before); the heatmap is 26 weeks, no longer range; no click on a cell yet (hover title only).

#### Step 18 — Focus & discipline scores (§11 Scores) ✅ (code done, browser-tested)
- [x] `src/lib/insights/scores.ts`: `focusScore` (minute-weighted focus − phone penalty) and `disciplineScore` (plan kept 50% / planned fun 30% / goal hit 20%) + unit tests
- [x] Shown for today: two badges under "Where time went" on Today, and two cells in the evening review. Per week: Step 19 reuses `disciplineScore` with `goalHit` = goal days ÷ 7
- **Done (2026-11-27):** pure functions with `fromMs`/`toMs` so a day, a week or any range works; Today (`today/page.tsx`, `.scores` badges with explanatory tooltips) and the review modal (`review-modal.tsx`, computed in the controller's `openReview`) show the same numbers; a dash when there is nothing to score.
- **Decisions:** (1) Focus counts only study entries that were *rated* (a focus value or a phone-check count): check-in study entries that never asked for a rating must not drag the average down or dilute the phone rate; the base uses the entries with a focus value, the phone penalty uses all rated minutes. A day with no rated study has **no** focus score (shown as —), not 0. (2) Discipline is null (—) for a day with nothing logged, because an empty day would otherwise score 30 (no-plan fun = 1, plan kept = 0 still gives 0.3). (3) Plan = `day_logs.planned_study_min`, or the daily goal when none/0 (PLAN §11). (4) Placement: scores sit under "Where time went" (Today has no spare tile at 1366×768 without scrolling) and in the review modal; the Insights page gets the weekly versions in Step 19.
- **Verified:** 129 unit tests (10 new, with a hand-calculated day: focus (60×4 + 30×2) ÷ 90 = 3.33 → base 58.3, 3 phone checks in 1.5 h → penalty 10 → **48**; discipline (0.5×0.8 + 0.3×0.667 + 0.2×1) = **80**; also 1/3/5 → 0/50/100, penalty cap 30, floor 0, clipping to the period, no plan → goal, weekly goal ratio, null cases), tsc + eslint. Browser test (Chrome via Playwright, throwaway user with that exact day seeded, deleted after): Today shows **Focus 48** and **Discipline 80**, the review modal shows 48 and 80, clearing the ratings gives **Focus —** with Discipline unchanged, no page scroll at 1366×768, no console errors.
- **Bug found and fixed on the way (Step 14 / 15 code):** when a long slot was already due and the evening review was due too, the check-in popup and the review could open in the same tick and stack two dialogs. `checkin-controller.tsx` now sets `promptOpen` / `reviewOpen` refs synchronously when either opens, each side refuses to open while the other is up, and the refs are cleared only on a real open → closed change (clearing them in a plain effect was wiped by React StrictMode's second effect run in dev). Verified by the same browser test (no more two dialogs).
- **Not verified / known limits:** scores are per day only for now (weekly in Step 19); the score tooltips are not translated into a "why did it drop" explanation (v3 patterns); dark mode not checked for the badges.

#### Step 19 — Weekly insights + report card (Insights page) ✅ (code done, browser-tested)
- [x] Insights → This week: study per day vs goal, weekly projection + daily gap, recoverable time, best focus hours, strong/weak day, drift triggers, commute potential
- [x] Insights → Report card: graded metrics (A–F), Strong / Needs work, "Fix one thing"
- [x] Minimum data rule: "Unlocks after 4 days" until 4 logged days that week
- [x] Formulas in `src/lib/insights/weekly.ts` + unit tests
- **Done (2026-11-27):** `weekly.ts` (`weekOf` Monday–Sunday, `computeWeek`, `gradeOf`), `week-data.ts` (`loadWeek`: week + 8 weeks of history, paged 1000 rows at a time), `src/app/(app)/insights/page.tsx` (tabs as links: `?tab=week|report&week=last`; "Last week / This week" toggle; three tiles + "Study per day" chart with goal lines and dashed expected bars for days still to come; Strong / Needs work lists with grade badges + "Fix one thing" card; Patterns and Long-term tabs shown disabled "· later"); styles ported from the design into `components.css` (`.week`, `.days`, `.day`, `.report`, `.metric`, `.fix`, `.seg a`).
- **Decisions:** (1) **Report card ratios use the days that have data, not a fixed 7** (PLAN §11 says "÷ 7"). The card is meant to open after 4 logged days, so dividing by 7 would grade a week in progress F for days that haven't happened (study goal hit 3 of 4 days = 75, not 43). The same days-with-data rule applies to goal hit, early morning study and the wasted-time average. (2) **Projection** = study so far + the average study of each *remaining* day's type over the last 28 days, counting only days with something logged; if a needed day type has no history the projection shows "—" instead of a made-up number. For last week there are no remaining days: it shows the total. (3) Weekly goal = the sum of each day's own goal (snapshot or current), which is 5×weekday + 2×weekend with default goals. (4) **Best focus hours:** average focus by start hour over 28 days, ≥ 3 rated sessions in that hour; **strongest / weakest weekday:** average study per weekday over 8 weeks, ≥ 2 logged days each, and only shown when they differ by ≥ 1 minute (identical days don't get a "strongest"). (5) **Sleep before 12** counts nights with a sleep entry starting between 5 PM and midnight over nights with a sleep entry; no sleep logged → metric not graded (dash) rather than F. A metric with no data is never graded and is never "the one thing to fix". (6) **Fix one thing** = the lowest score among graded metrics; for wasted time it adds the gain (half of the wasted minutes as study). A badly tracked week therefore gets "tracking completeness" as its fix, which is honest. (7) Grades are plain A–F (the design shows B+ / A-; the PLAN table has no plus/minus bands). (8) Drift triggers: share of wasted minutes per trigger answer ("No reason given" when blank) and the busiest 2-hour clock window, sampled in 5-minute steps.
- **Verified:** 143 unit tests (14 new in `weekly.test.ts`, one hand-calculated week: projection 440 + 97.5 + 150 + 150 = 837.5 of 1080, daily gap 80.8 min, wasted 90 → half 45 = 2 pomodoros, trigger "tired" 100% in the 8–10 PM window, commute 60, best focus hour 6 AM with 3 sessions avg 4.67, strongest Wednesday / weakest Tuesday, weekly focus 79 and discipline 58, goal hit 75 = B, wasted 81 = B, early morning 50 = D, pomodoro 67 = C, phone 92 = A, sleep not graded; plus locked < 4 days, finished week, no history → no projection, tie → no strongest day, waste gain text), tsc + eslint. Browser test (Chrome via Playwright, throwaway user, deleted after): new user sees "Unlocks after 4 days · 0 of 4"; with 10 seeded days the week tab shows 7 day columns (today bold), recoverable time = 30 min × logged days this week, "tired 100%" with its time window, projection tile; report card lists 5 graded metrics with grade badges and a Fix one thing card; the Last week toggle and `?week=last` work; no page scroll at 1366×768 on either tab; dark-mode screenshot taken; no console errors.
- **Not verified / known limits:** the sleep-before-12 and pomodoro-completion metrics are only unit-tested (the browser seed had neither); "Study per day" shows the day's study up to now (no stacked categories); Last week uses today's goals for days without a snapshot (same as the streak); Patterns (14+ days) and Long-term are v3; the Insights numbers aren't linked into the coach yet (`weekly_summary`, `best_week`, `weekly_up/down` stay unbuilt).

#### Step 20 — Settings extras ✅ (code done, browser-tested)
- [x] Coach tab: strictness Gentle / Balanced / Strict (`profiles.coach_strictness`)
- [x] "Delete my account" (confirm by typing; removes all data)
- [x] Edit category kind (with a warning that past scores change) / rename questions
- **Done (2026-11-27):** `src/components/settings/coach-tab.tsx` (three-way switch + the same moment worded at all three levels, from the real templates); `account-tab.tsx` "Delete my account" section (a red card: "Delete my account…" → type `DELETE` → "Delete everything"); `categories-tab.tsx` (Kind dropdown on an existing category with a red recount warning + the existing kind/"counts as" mismatch warning; "Rename" on every question incl. built-in ones); `settings-view.tsx` (new tab), `settings/page.tsx` + `types.ts` (`coachStrictness`). **New migration `supabase/migrations/20261127000000_delete_my_account.sql`, applied to the Supabase project (2026-11-27):** `public.delete_my_account()`, `security definer`, deletes only `auth.uid()`'s row in `auth.users`; execute is granted to `authenticated` only (revoked from `public` and `anon`). Everything the user owns goes with it through the existing `on delete cascade` links, and the freed slot counts against the 50-user cap again.
- **Decisions:** (1) **Why a database function:** a signed-in browser can't delete its own auth user (that needs the service key, which must never reach the browser), so the app calls a narrow RPC instead of shipping an admin key. (2) After deleting, the client clears its local session and goes to `/login`; the sign-out call for the already-deleted user answers 403 (a harmless console line). (3) The confirmation word is exactly `DELETE` (case-sensitive, so a stray "delete" in a password manager can't trigger it). (4) **Kind is now editable** (this reverses the Step 10 limit "kind can't be changed after creating a category"); the warning says past entries are recounted (study goal, streak, free time, usual bedtime, scores), because nothing is stored per entry: all of it is computed from the category's current kind. Changing it is not blocked, only warned about. The New category hint no longer says "can't be changed later". (5) Question renaming is allowed for built-in questions too: they are matched by `system_key`, not by label. (6) The strictness change applies to the **next** coach message (the controller gets it from the server after the settings refresh); old messages keep their wording.
- **Verified:** tsc + eslint, 143 unit tests (nothing new to unit-test here; the wording logic is covered in Step 15). Browser test (Chrome via Playwright, throwaway user, faked 7 PM clock): the three tones show different text with the numbers; Strict saves to `profiles.coach_strictness`; the next real check-in (Instagram, unplanned) produced the **Strict** drift_1 wording; changing Reading's kind to Study shows the warning and writes `kind = 'study'`; renaming "Planned?" to "Was it planned?" keeps `system_key = 'planned'`; the delete button is disabled until `DELETE` is typed exactly (lower-case isn't enough); deleting redirects to `/login`, the old credentials are refused (400), `/today` redirects to `/login`, and a SQL check shows **0 rows** for that user id in `auth.users`, `profiles`, `entries`, `categories`, `category_questions`, `coach_messages`, `checkins`, `day_logs`, `routines`.
- **Not verified / known limits:** the only console line was the 403 from the sign-out call after deleting (expected, see Decision 2); deleting while a pomodoro or busy status is running isn't special-cased (all rows go anyway); there is no "export my data first" (CSV export is v3); the kind change was not followed by a look at Today/Insights to see the recount (the numbers are computed live, so they follow); Gentle was checked as wording only (Strict end-to-end).

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
- **Migrations applied so far:** init, open sign-up, social apps, reading, `20261127000000_delete_my_account` (2026-11-27).
- **DB changes:** add a new file in `supabase/migrations/` (`YYYYMMDDHHMMSS_name.sql`), then
  `npx supabase db push --remote="$SUPABASE_DB_URL" --yes`. One-off SQL: `npx supabase db query --remote="$SUPABASE_DB_URL" --yes "<sql>"`.
- **Users:** sign-up is open but capped at 50 users (in `private.handle_new_user` and `signups_open()`). Free slots by deleting inactive users in Supabase → Authentication → Users. Users must sign up through the app (dashboard-created users have no display name and fail).
- **Styling:** use the design system classes in `src/styles/components.css` (`.btn`, `.card`, `.chip`, …), not shadcn styling, so the Notebook skin can override them later.
- **Changes from PLAN §3:** no "Wake up" category ("I'm awake" button instead); Movie / Series asks "Planned?"; question type `number` for phone checks.
- **Next.js 16:** APIs differ from older versions; read `node_modules/next/dist/docs/` before using a new API (see [AGENTS.md](AGENTS.md)).
- **Playwright** is a devDependency (installed 2026-11-26, v1.65). No browser download needed: launch with `chromium.launch({ channel: "chrome" })` (system Chrome). Start `npm run dev`, log in with env vars (`HH_EMAIL`, `HH_PW`), never write credentials into files; keep scratch scripts and saved sessions (`storageState`) out of the repo and delete them afterwards. Login form: fill `#email`, `#password`, click the "Log in" button. Don't write test data to a real account; use a throwaway sign-up and delete it.
- **Node:** 24 LTS via nvm-windows (`nvm use 24.22.3`); pinned in `package.json` engines (`24.x`) and `.nvmrc`. The old winget Node 21 was uninstalled.
- **Category kinds:** the same 8 names everywhere (database, CSS `data-kind`, tokens `--cat-*`): sleep, study, work, commute, routine, chore, entertainment, rest. `busy` and `unknown` are UI-only states.

### Polish: streak heatmap hover card (2026-11-27)
- **Done:** heatmap cells now show the same `.tip` hover card as the Today ribbon (date, "41m of 2h", status line, left edge coloured by shade); cells also scale up slightly on hover/focus. Files: `src/components/goals/heat-grid.tsx` (new client component), `src/app/(app)/goals/page.tsx`, `src/lib/insights/heatmap.ts` (HeatDay gained `label`, `detail`, `note`; `title` unchanged), `src/styles/components.css`.
- **Decisions:** reused `.tip` instead of a new tooltip so both match; the grid became a client component because the card needs pointer position (the page stays a server component).
- **Verified:** `tsc --noEmit` clean, `heatmap.test.ts` passes.
- **Not verified:** not checked visually in a browser (including dark theme).

### Polish: match design preview — status chip, live ribbon, sleep button (2026-11-27)
- **Done:** (1) status chip uses the green "study" kind in normal tracking, so its pulse dot shows; next check-in shows "· in N min" (`status-bar.tsx`). (2) ribbon: the block running up to now gets `.live` (shimmer sweep, hatch kept for gaps) and the Now marker reads "Now 9:12 PM" (`day-ribbon.tsx`, `today/page.tsx`, `components.css`). (4) "Going to sleep" is `btn-secondary` so it reads as a button.
- **Decisions:** the preview's CSS already matched the app; the gaps were in the markup, so no new styles except a hatch-preserving live variant. Sleep button: bordered secondary instead of ghost (ghost looked like plain text). Item 3 (Start pomodoro placement) is a suggestion only, not implemented.
- **Verified:** `tsc --noEmit` clean; Playwright (real account, read-only, nothing written): chip is green with the `pulse` animation, "in 8 min" shows, one `.blk.live` with the `live-hatch` animation, marker reads "Now 10:06 AM", sleep button is bordered secondary. Screenshot looked right.
- **Not verified:** dark theme. The Now label time is server-rendered, so it updates on refresh/navigation, not every second.
- **Fix (same day): ribbon sweep was invisible.** Cause: the sweep was a white 35% background layer, and the live block is only ~21px wide and hatched beige, so it barely showed (animation was running, checked via `getAnimations()`). Now `.blk.live::after` slides a brighter highlight band across the block (`components.css`). Verified with Playwright screenshots at 3x: highlight visible in one frame, elsewhere in the next. Dark variant not checked.

### Polish: theme button border + circular theme reveal (2026-11-27)
- **Done:** theme button is `btn-secondary` (bordered, like the others); clicking it spreads the new theme as a circle from the button's centre over the whole page, 650 ms (`toggleTheme` in `status-bar.tsx`, 3 CSS lines at the end of `components.css`). Skipped when the OS asks for reduced motion or the browser lacks View Transitions.
- **Decisions:** options were (a) cross-fade (b) circular reveal from the button (c) sweep from one edge. Chose (b): it ties the effect to the button as asked. Used the View Transitions API (no library, takes a snapshot of the page, so no per-element transitions).
- **Verified:** Playwright, real account (read-only; theme restored to light): border 1px, light → dark → light, mid-animation frame shows the circle growing from the button, end frame fully dark.
- **Not verified:** Settings → Account theme buttons still switch instantly (no animation); the mid-animation frame I captured was taken while the page was still loading, so it showed an empty page under the circle.

### Polish: Start pomodoro moved into the pips card (2026-11-27)
- **Done:** removed the "Start a pomodoro" button from the Today header; added a small "Start" button (links to /focus) on the "N needed of M possible" line of the "Free time left" card (`today/page.tsx`). Text shortened to "needed of possible" to fit.
- **Decisions:** chose the pips card over a status-bar button (suggested to and approved by the user): it's where the pomodoro count is decided. Status bar still shows Focus / Stop early only during a pomodoro.
- **Verified:** tsc clean; Playwright (real account, read-only): header has no link, card has one "Start" link, it opens /focus; screenshot looks right.
- **Not verified:** narrow widths (the app's min width is 1280px, only 1440 checked).

### Polish: collapsible sidebar (2026-11-27)
- **Done:** "Collapse" button at the bottom of the sidebar shrinks it to the icons-only rail (and back); choice is remembered in localStorage (`hh-sidebar`) and applied before first paint (extra line in the theme script in `layout.tsx`), width change animates. Files: `sidebar.tsx`, `layout.tsx`, `components.css`.
- **Decisions:** reused the existing rail look (already used under 1440px) instead of a new design; state lives on `<html data-sidebar>` like the theme, so no React state/flash. The button is hidden under 1440px, where the sidebar is always a rail.
- **Verified:** Playwright at 1600px (real account, read-only): 225px → 66px → stays after reload → back to 225px; screenshots look right.
- **Not verified:** under 1440px you can't expand the rail (no button there); dark theme.
- **Fix (same day): log-out button misaligned in the collapsed sidebar.** Cause: avatar and log-out sat side by side in a 66px rail, so the pair overflowed off-centre. Now they stack (avatar above log-out), for the collapsed state and for the under-1440px rail (`components.css`). Verified with Playwright: toggle, avatar and log-out all centred (x=32 of 66px at 1600px, collapsed); the under-1440px rail uses the same rule but I only measured avatar/log-out there (both centred, x=30 of 62px).

### Polish: smooth sidebar collapse/expand (2026-11-27)
- **Problem:** on collapse the log-out button/avatar jumped (row→column flip), labels vanished via `display:none`, and the sidebar width snapped.
- **Done:** one switch `--r` (0 expanded, 1 collapsed; set by the toggle or by windows under 1440px) drives everything in `components.css`: labels/brand name shrink and fade (max-width + opacity), gaps and padding glide, avatar slides to centre, log-out slides from beside the avatar to below it (absolute position, left/top), toggle icon flips; the grid column animates, so the page content resizes continuously. All 200 ms (`--dur`).
- **Decisions:** options were (a) View Transitions cross-fade of the whole window (b) per-property CSS transitions. Chose (b): continuous motion with no ghosting or stretched text; (a) is kept for the theme reveal only. Two dead ends: registering `--sidebar-w` with `@property` did not take effect here (computed value stayed unregistered, even outside the layers), so instead the grid column is `var(--sidebar-w) 1fr`, since `minmax()` columns can't be animated.
- **Verified:** Playwright (real account, read-only), sampled every 30–40 ms: width 225→128→74→67→66, avatar and log-out move together to x=33; expanding back reverses it. tsc clean.
- **Not verified:** "all UI components" = the sidebar and page-width change only; cards inside pages just reflow with the width (no per-card animation). Dark theme; reduced-motion users get the (near-instant) global setting.
- **Tuned (same day):** sidebar animation slowed from 200 ms ease-out to 450 ms ease-in-out (`--rail-dur`, `--rail-ease` on `.app` in components.css) at the user's request; measured width 225 → 66 over ~450 ms.
- **Tuned again:** `--rail-dur` 450 ms → 400 ms (user's choice).

### Polish: page-load indicator (2026-11-27)
- **Done:** while a page's data loads, the content area shows the Sprout icon inside a spinning green ring (sidebar and status bar stay). New `components/shell/page-loading.tsx` (`PageLoading`), `app/(app)/loading.tsx` renders it, CSS `.page-loading` in `components.css`; it fades in after 150 ms so quick navigations don't flash it. The six pages (today, timeline, focus, goals, insights, settings) now use `<Suspense fallback={<PageLoading />}>` (one import + one line each).
- **Decisions:** options were (a) one loader (b) per-page skeletons. Chose (a) as asked; skeletons would add a file per page. Just adding `loading.tsx` was not enough: each page already wrapped its data in an empty `<Suspense>`, which caught the loading state first, so the fallback had to be set there. Named the CSS class `.spin` because `.ring` is already the progress-ring class.
- **Verified:** tsc clean; Playwright (real account, read-only) with throttled network: clicking Insights shows the loader (screenshot: sprout centred, ring arc visible) and it disappears once the page arrives.
- **Not verified:** how long the loader is visible on real (unthrottled) navigations; dark theme; reduced-motion; the other five pages (same one-line change, only Insights was exercised).
