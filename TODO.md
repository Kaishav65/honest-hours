# Honest Hours — TODO / Progress

> **Start here in every new session.** This file tracks what's done and what's next.
> The full design is in [PLAN.md](PLAN.md) (features §4, screens §9, database §10, calculations §11, coach §12).
> Last updated: 2026-11-21

**Current status:** v1 steps 0–2 and 4 done; Steps 3, 5 and 6 are coded and were smoke-tested in a real browser (Chrome via Playwright); a quick manual look from you is still welcome. **Next: Step 7 — Schedules & Office day** (after the manual checks).

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

### Step 7 — Schedules & Office day
- [ ] Weekday/weekend settings; during office hours popups every 2 h asking "Office as usual?"
- [ ] "Office day" one tap from the routine (walk, bus, office 10–6, bus, walk)
- **Check:** one tap creates all 5 entries; overlaps handled

### Step 8 — Timeline page
- [ ] Day picker, list of blocks, click to edit, click grey Unknown to fill (`source = backfill`)
- **Check:** filled gap saved as backfill and shown on the ribbon

### Step 9 — Today dashboard
- [ ] Greeting with display name, free time card, study vs goal, free time left, 24 h ribbon, where time went, tracking %
- **Check:** numbers match a hand calculation for a test day

### Step 10 — Settings
- [ ] Tabs: Categories & questions / Popups & schedule / Busy presets / Account (display name, password) / theme
- **Check:** a new category appears in the check-in popup

### Step 11 — Install & deploy
- [ ] PWA manifest + icons (installs as its own window)
- [ ] Deploy to Vercel with env vars
- **Check:** installs from the live URL and works end to end

---

## Later

### v2 — Focus & coaching
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
