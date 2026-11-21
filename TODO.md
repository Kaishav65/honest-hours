# Honest Hours — TODO / Progress

> **Start here in every new session.** This file tracks what's done and what's next.
> The full design is in [PLAN.md](PLAN.md) (features §4, screens §9, database §10, calculations §11, coach §12).
> Last updated: 2026-11-21

**Current status:** v1 steps 0–2 done. **Next: Step 3 — Login & sign-up.**

---

## ✅ Done

### Planning & design
- [x] Goal, routine, categories, features ([PLAN.md](PLAN.md) §1–§8)
- [x] Screens and layout rules (§9)
- [x] Database tables (§10), calculations (§11), coach messages (§12)
- [x] Design system "Clean" ([design-system/](design-system/DESIGN_SYSTEM.md)) and "Notebook" skin ([design-system-v2/](design-system-v2/DESIGN_SYSTEM.md))
- [x] Name: **Honest Hours**. Display name ("What should we call you?") shown in the greeting

### Accounts & services
- [x] Supabase project `honest-hours` in **Mumbai (ap-south-1)**
  - Confirm email **off** (no emails sent), Secure email change off, Require current password on, min password 8, magic links off
- [x] GitHub repo (public): https://github.com/Kaishav65/honest-hours (branch `main`)
- [x] GitHub CLI installed and logged in (`C:\Program Files\GitHub CLI\gh.exe`)
- [x] First invite code created (10 uses) — value is in the database only, not in this repo

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
- [x] Sign-up trigger: checks invite code + display name, creates profile, 11 categories, 16 questions, "Office day" routine
- [x] `check_invite_code()` RPC for the sign-up form
- Verified: `node scripts/db-test.mjs <INVITE_CODE>` → 23/23 checks pass; Supabase advisors: no issues

---

## 🔜 Next: v1 (core)

Each step has a check that proves it works.

### Step 3 — Login & sign-up ⬅ NEXT
- [ ] `npm install @supabase/supabase-js @supabase/ssr`
- [ ] Supabase clients: browser + server helpers in `src/lib/supabase/`
- [ ] Session refresh in **`src/proxy.ts`** (Next 16 renamed middleware → proxy; read `node_modules/next/dist/docs/` first)
- [ ] `/login` page: email + password
- [ ] `/signup` page: email, password, "What should we call you?" (1–20 chars), invite code (live check with `check_invite_code`), timezone sent automatically
- [ ] Friendly errors: wrong invite code, name missing, email already used, weak password
- [ ] Logged-out users → `/login`; logged-in users on `/login` → `/today`
- [ ] Sidebar shows display name + avatar initial; Log out button
- **Check:** wrong code fails; right code creates account + defaults; logout → redirected to `/login`

### Step 4 — Time logic (`src/lib/time/`)
- [ ] Install Node 22 LTS, then add Vitest (failed on Node 21 due to `@types/node` peer conflict)
- [ ] Day boundary at `day_start_hour` (3 AM), user timezone, weekday/weekend day type
- [ ] Find Unknown gaps between entries; split a slot into parts
- **Check:** unit tests around midnight, 3 AM and day-type changes

### Step 5 — Check-in popup
- [ ] Timer from saved timestamps (background tabs throttle timers), interval from profile
- [ ] Modal: category chips, split slot, "Same as before", while-doing tags, category questions (prefilled with last answers)
- [ ] Browser notification when the tab is in the background; `L` key = Log now
- [ ] Save entries + `checkins` row
- **Check:** away 70 min → next check-in covers the full 70 min

### Step 6 — Busy mode & sleep
- [ ] Busy: 30 min / 1 h / 2 h / until time / presets; no popups; block filled on end
- [ ] "Going to sleep" / "I'm awake" (sleep quality + today's study plan → `day_logs`)
- [ ] Late-night go-quiet: 2 unanswered popups → quiet, ask "When did you sleep?" next morning
- [ ] Status bar shows live state
- **Check:** no popups while busy/asleep; block filled afterwards

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
- **Invite codes:** `insert into public.invite_codes (code, max_uses, note) values ('HH-XXXXXXXX', 5, 'who');` Users must sign up through the app (dashboard-created users fail the invite check).
- **Styling:** use the design system classes in `src/styles/components.css` (`.btn`, `.card`, `.chip`, …), not shadcn styling, so the Notebook skin can override them later.
- **Category kind mismatch:** CSS uses `data-kind="fun"`; the database uses `entertainment`. Map in code.
- **Changes from PLAN §3:** no "Wake up" category ("I'm awake" button instead); Movie / Series asks "Planned?"; question type `number` for phone checks.
- **Next.js 16:** APIs differ from older versions; read `node_modules/next/dist/docs/` before using a new API (see [AGENTS.md](AGENTS.md)).
- **Node:** currently v21.1.0; upgrade to 22 LTS before step 4.
