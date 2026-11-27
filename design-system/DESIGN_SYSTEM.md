# Design System: "Sage & Paper"

> Status: **v1 agreed for build.** Last updated: 2026-11-21
> Files: [tokens.css](tokens.css) (production tokens) · [preview.html](preview.html) (live preview: open it in Chrome/Edge)

Inspired by the bullet-journal references (sage, cream paper, handwritten notes, soft cards), rebuilt for a dense, honest, desktop data app:
- **Paper and sage** as the base: calm for long study sessions.
- **Clay** is used only for wasted time, so it always carries meaning.
- **Hatched grey** marks Unknown time.
- **Handwriting** is used only for the user's own words.
- Decoration is kept to a single sticky note. Everything else is data.

---

## 1. Principles

| # | Principle | In practice |
|---|---|---|
| 1 | **Calm by default** | Warm paper surfaces. Colour is saved for meaning, so a red number always matters. |
| 2 | **Honest colour** | Clay = wasted. Pale clay = planned fun (not wasted). Hatched grey = unknown. Sage = study / good. |
| 3 | **One window** | The page never scrolls. Panels scroll inside themselves (`.scroll`). Fits 1366×768 → 2560×1440. |
| 4 | **One tap first** | The most likely action is the biggest and closest. Every daily action has a keyboard shortcut. |
| 5 | **Your handwriting** | Caveat font only for text the user wrote (today's one goal, "what I learned"). Never for system or coach text. |
| 6 | **Numbers are heroes** | Big serif numbers with small units (`1h 37m`). Every coach message starts with a real number. |

---

## 2. Colour

All values are CSS variables in `tokens.css`. **Never hard-code hex in components.**

### Surfaces and text
| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#f5f0e6` | `#161913` | App background (with subtle grain) |
| `--surface` | `#fbf8f1` | `#1e221b` | Cards, panels |
| `--surface-raised` | `#fffdf8` | `#262b22` | Modals, popovers, inputs |
| `--surface-sunken` | `#efe8da` | `#131610` | Tracks, ribbon base, segmented bg |
| `--surface-tint` | `#e9eedf` | `#27311f` | Selected nav item, hover |
| `--border` / `--border-strong` | `#e3dacb` / `#cfc4af` | `#323829` / `#454c3b` | Dividers / inputs |
| `--ink` / `--ink-2` / `--ink-3` | 13.4 : 1 / 6.5 : 1 / 4.6 : 1 | | Text: primary / secondary / muted |

### Brand
Sage scale `--sage-50 … --sage-900`. **Primary = `--sage-600` (light) / `--sage-400` (dark).** Text on primary passes AA.

### Semantic
`--success` (sage) · `--warning` (honey) · `--danger` (terracotta `#ad5038`) · `--info` (mist blue). Each has a `-soft` background.

### Activity categories (keyed by `categories.kind`, not by name)
| Kind | Hue | Value (default) |
|---|---|---|
| study | Sage | Productive |
| work | Mist blue | Productive |
| commute | Honey | Neutral |
| routine | Oat | Neutral |
| sleep | Lilac | Neutral |
| rest | Sea green | Neutral |
| chore | Taupe | Neutral |
| entertainment | Clay | **Waste** (if unplanned) |
| unknown | Hatched grey | Neutral, always visible |

Each kind has 3 tokens: `--cat-{kind}` (chart fill), `--cat-{kind}-soft` (chip background), `--cat-{kind}-ink` (text/icon on soft). In components set `data-kind="study"` and use `--k`, `--k-soft`, `--k-ink`.
User-created categories pick one of these 8 kinds, so they automatically get a colour that means something.

### Value of time
`--value-productive` (sage) · `--value-neutral` (ink-3) · `--value-waste` (terracotta) · `--value-leisure` (pale clay, for planned entertainment).

### Coach severity
| Severity | Token | Icon |
|---|---|---|
| Scold / call-out | `--coach-scold` (terracotta) | triangle-alert |
| Pattern | `--coach-pattern` (plum) | repeat |
| Recovery | `--coach-recovery` (honey) | rotate-ccw |
| Praise / milestone | `--coach-praise` (sage) | sparkles |
| Info / morning | `--coach-info` (mist) | sunrise |

### Grades
A/B → success soft · C → warning soft · D/F → danger soft. The letter is in serif bold.

---

## 3. Typography

| Role | Font | Size token | Notes |
|---|---|---|---|
| Greeting / hero | **Fraunces** 500 | `--text-2xl` (30) | Italic sage accent for the key phrase |
| Page title | Fraunces 600 | `--text-xl` (22) | |
| Card title | Fraunces 600 | `--text-lg` (17) | |
| Stat numbers | Fraunces 600, tabular | `--text-stat` (36) | Units in `<span class="u">` at 55% size, muted |
| Pomodoro timer | **DM Sans** 600, tabular | `--text-timer` (72) | Tabular digits so it never jitters |
| Body, buttons, inputs | DM Sans 400–600 | `--text-base` (15) / `--text-sm` (13) | |
| Overline labels | DM Sans 600 caps +8% | `--text-2xs` (11) | "FREE TIME AT HOME" |
| User's own words | **Caveat** 500 | ~20 | Sticky note only |

Sizes are `rem`, and the root size is fluid (see §7), so all text scales with the window.
**Next.js:** load the fonts with `next/font/google` (`Fraunces`, `DM_Sans`, `Caveat`) and assign them to `--font-display`, `--font-sans` and `--font-hand`.

---

## 4. Space, shape, elevation, motion

- **Spacing:** 4px grid, tokens `--space-1 … --space-12`. Card padding 16–20, grid gap = `--gutter` (12–24, fluid).
- **Radius:** badges 6 · inputs 8 · buttons/chips 12 · **cards 16** · modals 22 · pills 999.
- **Shadows** (warm brown, never grey): `xs` inputs · `sm` cards · `md` popovers · `lg` modals and toasts.
- **Motion:** 120ms (hover) / 200ms (toggles) / 320ms (modal, toast) with `--ease-out`. Only the live block and the status dot animate continuously. `prefers-reduced-motion` turns everything off.
- **Z-index:** sidebar 10 · status bar 20 · popover 30 · modal 50 · toast 60.

---

## 5. Components

Each one maps to a shadcn/ui component (or a small custom one) styled with the tokens.

| Component | shadcn base | Spec |
|---|---|---|
| **Button** | Button | Variants: `primary` (one per view), `secondary`, `soft` (coach actions), `ghost`, `danger`. Sizes: sm 32, md 40, lg 48. Shortcut hint uses `.kbd`. |
| **Card** | Card | Surface, 1px border, radius 16, shadow-sm. Header = serif title + optional badge + ghost action on the right. Body uses `.scroll` when the list can grow. |
| **Stat tile** | custom | Icon + overline, big stat, one supporting visual (ring / stacked bar / pips), one line of context. |
| **Badge** | Badge | Pill 22px high, soft background. success / warning / danger / info / neutral. |
| **Chip (toggle)** | Toggle | 36px (sm 30). Pressed = category soft bg + 1px inner ring in the category colour. Used for activity picking, triggers, subjects, tags. |
| **Segmented** | ToggleGroup | Sunken track, raised selected item. For 2–4 exclusive options (Planned? / interval / pomodoro length). |
| **Tabs** | Tabs | Underline style, 2px primary indicator. Used on Goals, Insights, Settings. |
| **Rating 1–5** | ToggleGroup | Five 34px squares. Selected = primary fill. Helper text explains 1 and 5. |
| **Stepper** | custom | − value +. For phone checks. |
| **Input / Field** | Input + Label | 40px, radius 8. Focus = primary border + 3px ring. Error = danger border and help text. |
| **Switch** | Switch | Settings on/off. |
| **Progress bar / stacked bar** | Progress | 8px / 12px pill. Stacked bar segments separated by 2px gaps. Waste segment always `--value-waste`. |
| **Ring** | custom (conic) | Daily goal %. Waste variant uses clay. |
| **Pomodoro pips** | custom | Filled = needed for goal, outlined = possible before usual sleep. |
| **Day ribbon** ⭐ | custom | 3 AM → 3 AM bar. Blocks are coloured by kind; labels only where they fit; tooltip on every block. Unknown = hatched with a dashed outline (click to fill). Dot on a block = "while doing" tag. Markers for **Now** (ink) and **usual sleep** (dashed lilac). Live block has a soft shimmer. |
| **Coach message** | custom | Left 3px severity stripe + round icon, meta line (label · time), text (key number in bold), optional actions (`soft`/`primary` sm buttons) or "✓ acted on" line. |
| **Toast** | Sonner | A coach message with shadow-lg, bottom-right, 6s, max one at a time per event. |
| **Modal** | Dialog | Radius 22, blurred scrim. Header (overline + serif question + duration badge + Skip), scrolling body, footer with hint + Cancel/Esc + primary Save/↵. |
| **Popover menu** | DropdownMenu | Busy presets, overflow menus. |
| **Heatmap** | custom | Streak calendar. Levels 0–4 on the sage scale. Freeze day = mist with outline. |
| **Grade** | custom | 34px rounded square, serif letter. |
| **Report card row** | custom | Metric · value · grade. |
| **Learning state** | custom | Dashed border, sprout icon, "Learning your patterns… X days to go", progress bar. **Never show a guess.** |
| **Sticky note** | custom | Honey paper, -1.2° tilt, washi tape. **Only one per screen**, only for the user's own words. |
| **Status pill** | custom | States: Now (category colour), Focus (sage), Busy (honey), Sleeping (lilac), Not logged (hatched). Pulsing dot. |

**Icons:** [Lucide](https://lucide.dev) (ships with shadcn), 1.75 stroke, sized 1.15em. Brand logos aren't used: Instagram → `smartphone`, YouTube → `monitor-play`.
**Emojis** appear only inside coach text (🔥 🎯 ✅ 📈 🏆 🧊), as agreed in the plan.

---

## 6. Screen patterns (how the plan maps to components)

| Plan requirement | Pattern |
|---|---|
| App shell (no page scroll) | CSS grid: brand + status bar row, sidebar + main. `height: 100dvh; overflow: hidden`. |
| Status bar shows current state | Status pill · next check-in · 🔥 streak · 🧊 freezes · **Log now (L)** · Busy menu · Going to sleep · theme toggle |
| Check-in popup | Modal: Suggested chips → activity chips (pick 1, or 2 to split) → split bar + slider → per-category detail panels (only categories with questions) → while-doing tags → Save. Prefilled answers. Enter saves, Esc skips. |
| Split slot | Split bar with segments in category colours plus a range slider (5-minute minimum per part). |
| Busy mode | Popover from the status bar: 30m / 1h / 2h / until…, plus presets. Status pill turns honey. |
| Sleep / I'm awake | Status pill turns lilac. "I'm awake" = modal with sleep-quality rating + today's study plan stepper. |
| Unknown gaps | Hatched blocks in the ribbon and timeline. Clicking opens the same check-in modal in "Fill a gap · filled later" mode. |
| Today | Header (greeting + one-goal note) → 4 stat tiles (Study goal ring · Free time at home · Free time left · Wasted today) → Day ribbon → Coach · Where time went · Entries (wide screens) |
| Focus | Length segmented · subject chips · SVG ring timer · Start / Stop early · "popups paused" note · today's sessions · subject goal + finish date |
| Goals | Tabs: Streak (heatmap, freezes, record) / Subject goals (progress bars + predicted date) |
| Insights | Tabs: This week (projection, recoverable, best hours, per-day chart with goal ticks and hatched expected bars) / Report card (Strong · Needs work · 🎯 Fix one thing) / Patterns / Long-term (learning state until enough data) |
| Coach tone | Severity colour does the emotional work, so the copy stays plain and factual. Every scold has a recovery action button. |
| Charts (Recharts) | Use `--cat-*` for series, `--value-waste` for waste, hatching for projections/unknown, dashed ink-3 for goals. No gridlines heavier than `--border`. |

**Deliberate change from the plan's layout sketch:** "+ Log now" lives in the **status bar** instead of floating bottom-right. A floating button covered panel content at 1366×768, and the status bar is visible on every page.

---

## 7. Responsive desktop & tablet

Desktop and tablet (720px and up). The root font size is fluid: `clamp(14px, 0.3125vw + 10.5px, 17px)`. Every rem-based size (text, spacing, radius) scales with the window, so one layout works everywhere.

| Window width | Root | Sidebar | Today layout |
|---|---|---|---|
| 720–1279 (tablets) | 14px | Icon rail | Tiles 2×2, page scrolls inside `main`; status-bar secondary buttons icon-only (words also hidden under 860) |
| 1280–1439 (min target 1366×768) | 14–15px | **Icon rail** 68px (tooltips, labels hidden) | 4 tiles · ribbon · Coach + Where |
| 1440–1599 | 15px | Full 232px | Same, more air |
| 1600–2559 | 15.5–16.5px | Full | **+ Entries panel** (container query ≥ 86rem) |
| 2560+ | 17px (capped) | Full | Content max 112rem, centred |
| Height ≤ 800px | −1px | | Denser status bar |

- Use **container queries** on `main` for page layouts, not viewport media queries, so the sidebar width is taken into account.
- Rows use `minmax(0, 1fr)` so the last row takes the leftover height and scrolls inside.
- When `main` is narrow (Today < 72rem; Goals/Insights tiles < 64rem; Focus < 56rem) pages reflow and scroll inside `main` instead of squeezing cards; wider windows keep the one-window layout.
- Below 720px wide the shell stops shrinking (phones are not a target).

---

## 8. Themes

- **Light ("Paper")** is the default. **Dark ("Night study")** is for 3–5 AM sessions: warm olive-black, never pure black, same hues lifted for contrast.
- Setting: **System / Light / Dark**, stored per user in `profiles.settings`, applied as `data-theme` on `<html>` before first paint (no flash).
- Category chart fills are mid-tones that work on both themes. Block labels always use dark ink.

---

## 9. Accessibility

- Text contrast: ink 13:1, ink-2 6.5:1, ink-3 4.6:1, white on primary 6.4:1, on danger 5:1.
- Colour never works alone: waste also says "Wasted"; unknown is hatched; grades show the letter; severity has an icon.
- Visible focus ring (`--focus-ring`) on everything. Full keyboard use: `L` log, `1–6` pages, `Enter` save, `Esc` skip.
- Minimum click target 30px (chips sm), normally 36–40px.
- `prefers-reduced-motion` respected.

---

## 10. Using it in the Next.js app

1. Copy `tokens.css` into `app/globals.css` (above `@import "tailwindcss"`).
2. Map tokens to Tailwind v4 utilities:
   ```css
   @theme inline {
     --color-paper: var(--paper);
     --color-surface: var(--surface);
     --color-raised: var(--surface-raised);
     --color-sunken: var(--surface-sunken);
     --color-border: var(--border);
     --color-ink: var(--ink);
     --color-ink-2: var(--ink-2);
     --color-ink-3: var(--ink-3);
     --color-primary: var(--primary);
     --color-waste: var(--value-waste);
     --font-display: var(--font-display);
     --font-sans: var(--font-sans);
     --font-hand: var(--font-hand);
     --radius-lg: var(--radius-lg);
   }
   ```
   (Add the `--cat-*` colours the same way when needed.)
3. shadcn/ui variable bridge: `--background: var(--paper)`, `--card: var(--surface)`, `--popover: var(--surface-raised)`, `--primary: var(--primary)`, `--primary-foreground: var(--on-primary)`, `--muted: var(--surface-sunken)`, `--muted-foreground: var(--ink-3)`, `--destructive: var(--danger)`, `--border: var(--border)`, `--input: var(--border-strong)`, `--ring: var(--focus-ring)`, `--radius: 0.75rem`.
4. Category colours come from `kind`: `<div data-kind={category.kind}>`, plus the small `[data-kind]` → `--k / --k-soft / --k-ink` block from `preview.html`.
5. `preview.html` is the visual reference. Its CSS shows each component's exact values. Deep links: `#focus`, `#insights`, `#guide`, `#checkin`.
