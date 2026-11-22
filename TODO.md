# Honest Hours — TODO / Progress

> **Start here in every new session.** This file tracks what's done and what's next.
> The full design is in [PLAN.md](PLAN.md) (features §4, screens §9, database §10, calculations §11, coach §12).
> Last updated: 2026-11-22 (Step 11: PWA manifest + icons done; pages refresh after check-in saves; Vercel deploy next)

**Current status:** v1 steps 0–2 and 4 done; Steps 3 and 5–10 are coded and were smoke-tested in a real browser (Chrome via Playwright); a quick manual look from you is still welcome. **Next: Step 11 — Install & deploy (PWA + Vercel).**

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
  - Confirm email **off** (no emails sent), Secure email change off, Require current password on, min password 8, magic links off
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
- **Left for v2 (in the design but not built on Today):** Coach card with messages; streak + freeze on the Study tile and status bar; "Today's one goal" note (from the morning plan); goal on-track badge ("Close · 92% at usual pace", needs 7+ days of data); "Entries" recent-list card on wide screens (≥ 86rem); "While doing" line under Where time went (YouTube during Dinner, not counted twice); focus/discipline scores

### Step 10 — Settings (code done, manual check pending)
- [x] **Categories & questions:** add a category (name, kind, counts-as, icon from 19), edit name / counts-as / icon, archive or restore (never deleted); per category add questions (type, options for pick-one/several) and remove or restore them; built-in questions are marked
- [x] **Popups & schedule:** check-in interval (15/30/45/60), day start hour, weekday and weekend study goals (hours; past days keep their snapshot), office hours per day type (on/off, from–to, popup every 1 / 1.5 / 2 / 3 h)
- [x] **Busy presets:** add, rename, change minutes, remove (max 10); shown in the Busy popup
- [x] **Account:** display name (1–20), change password (re-checks the current password first), theme Light / Dark / Match my computer
- All saves go straight to Supabase from the browser (RLS keeps them to your own rows) and then refresh the page data, so popups and other pages see the change; `profiles.settings` is saved whole so nothing is dropped
- Verified: lint + build; browser test (Chrome via Playwright): new category + question shows up in the L popup and saves; duplicate name rejected; interval 15 / weekend goal 5 h saved (Today shows 12 pomodoros = 300 ÷ 25); preset saved and listed in Busy; name change shows in the greeting; wrong current password rejected, right one changes it; dark theme applies; DB values checked, test users deleted
- **Still to check by hand:** archive a category (disappears from the popup, still shows on old entries); weekend office hours really switch the popup to 2-hourly; editing an existing question; long category lists scroll inside the panel
- Known limits: kind can't be changed after creating a category (scores depend on it); question labels can't be renamed (remove and re-add); no "Delete my account" yet; Look (Clean / Notebook) is v2; timezone is shown but not editable; no coach / streak / strictness settings until v2

### Step 11 — Install & deploy
- [x] PWA manifest + icons (installs as its own window): Sprout-on-sage icon (tab, home screen, installed app), `src/app/manifest.ts`, page titles on every page; manifest/icons are public in `src/proxy.ts`. Verified: build + 57 tests; manifest and icons return 200 when logged out
- [ ] Deploy to Vercel with env vars
- **Check:** installs from the live URL and works end to end

---

## Later

### v2 — Focus & coaching
- [ ] Today page extras: coach card, streak on the Study tile, "today's one goal", goal on-track badge, recent-entries card, "while doing" line (details under Step 9)
- [ ] Settings extras: Coach strictness, Streak & goals, Look (Clean / Notebook), "Delete my account", edit category kind / rename questions
- [ ] Pomodoro (auto-logs study; focus, phone checks, completed/stopped early)
- [ ] Configurable streak + earned freeze
- [ ] Morning plan / evening review
- [ ] Focus and discipline scores
- [ ] Coach messages + escalating nudges + strictness setting
- [ ] Weekly insights + report card
- [ ] Settings → Look: Clean / Notebook toggle

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
- **Node:** 24 LTS via nvm-windows (`nvm use 24.22.3`); pinned in `package.json` engines (`24.x`) and `.nvmrc`. The old winget Node 21 was uninstalled.
- **Category kinds:** the same 8 names everywhere (database, CSS `data-kind`, tokens `--cat-*`): sleep, study, work, commute, routine, chore, entertainment, rest. `busy` and `unknown` are UI-only states.
