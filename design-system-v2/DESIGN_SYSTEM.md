# Design System v2: "Sage Notebook"

> Status: **v2 draft, alternative look.** Last updated: 2026-11-21
> Files: [tokens.css](tokens.css) · [notebook.css](notebook.css) (paper skin) · [preview.html](preview.html) (live preview)
> v1 ("Sage & Paper") is unchanged in [../design-system/](../design-system/DESIGN_SYSTEM.md).

The app looks like a **study notebook**: ruled paper, red margin lines, punched holes, pen-drawn boxes, washi tape, a highlighter, and handwritten lettering. It's inspired by the weekly-planner reference.

**What stays the same as v1:** colours and their meanings (sage = study, clay = wasted, hatched = unknown), layout, responsive rules, components, screen patterns, keyboard shortcuts and accessibility rules. Read v1 §2, §5, §6, §7 and §9; they all apply. This file lists **only what changes**.

---

## 1. Typography: handwritten

| Role | Font | Why |
|---|---|---|
| Titles, stat numbers, timer, **bold emphasis** | **Shantell Sans** 700 (marker hand) | Looks hand-lettered, but **digits stay clear** (`1` isn't an `I`). This matters in a numbers app. |
| All UI text: body, buttons, labels, chips | **Patrick Hand** (print hand) | Closest to the reference planner's lettering, and readable at small sizes |
| The user's own words (today's goal, "what I learned") | **Caveat** (cursive) | Your notes stay visually separate from the app's printed text |

- **Rule:** print hand = the app, cursive = you.
- Sizes are about **10% larger** than v1 (base 17px) because hand fonts look smaller at the same size. Small text is never below 12px.
- `font-synthesis: none`: hand fonts have one real weight, so they're never fake-bolded. `<b>` / `<strong>` switch to Shantell Sans 700.
- Hand fonts don't have fixed-width (tabular) digits, so the **pomodoro timer** puts each digit in a fixed-width box (`.dg`) to stop it jumping as it counts down.
- Known trade-off: Patrick Hand's `7` has a crossbar. This is fine for times, but data-heavy tables could use Shantell Sans for the number column.

---

## 2. Paper materials (new tokens)

| Token | Use |
|---|---|
| `--rule`, `--rule-line` | Ruled lines on the main page, coach card and modal (1.75rem spacing) |
| `--margin-line` | Double red margin on the page; single margin line on the check-in page |
| `--kraft` | Brown-paper sidebar, status bar, Entries card, modal footer |
| `--paper-hole` | Punched holes down the sidebar edge and the check-in modal |
| `--sketch`, `--sketch-soft` | Pen outline colour for boxes, chips, inputs |
| `--hl`, `--hl-honey` | Highlighter behind titles, selected nav, selected tab and segment, day labels |
| `--tape-sage`, `--tape-honey` | Washi tape strips |
| `--radius-sketch`, `--radius-sketch-sm`, `--radius-circle` | Uneven corners that look drawn with a pen |
| `--shadow-paper` | Flat 2px offset, like paper lying on paper (no blur) |

Dark mode ("night notebook") lowers the line contrast, uses dark kraft and black holes, and swaps in a darker highlighter.

---

## 3. Component changes

| Component | v2 treatment |
|---|---|
| Page | Ruled lines + double red margin (`.main`) |
| Sidebar | Kraft paper, punched holes on the right edge (hidden in icon-rail mode) |
| Status bar | Kraft strip with a dashed "perforated" bottom edge |
| Card | Pen outline, sketch corners, flat paper shadow. Title on a **highlighter swash with ♡** (like "Daily Routine ♡") |
| Card paper types | Coach = ruled · Where time went = **grid paper** (like "Notes") · Entries = kraft · others plain |
| Washi tape | On at most **3 cards per screen** (goal tile, coach, where-time-went, timer, fix-one-thing) |
| Button | Sticker style: pen border + solid 2px offset shadow, pressed = shadow disappears |
| Chip | Pen outline. Selected = category tint + offset shadow in the category colour |
| Input | **Write on the line**: bottom border only. Focus = highlighter fill |
| Tabs | Selected tab gets a **wavy hand underline** |
| Segmented | Selected option is highlighted |
| Rating 1–5, pips, heatmap | **Hand-drawn circles** (like the habit tracker in the reference) |
| Grade | **Teacher's stamp**: circled letter, rotated −8° |
| Day ribbon | Pen outline. Blocks get **coloured-pencil shading** (diagonal strokes) |
| Coach message | Pen-outlined note, severity stripe kept |
| Check-in modal | **A page torn from the notebook**: holes, red margin, ruled lines, kraft footer |
| Weekly chart labels | Highlighted day names, alternating sage and honey (like "Monday / Tuesday") |
| Greeting | Marker font, key phrase highlighted, small ✦ doodle |

**Decoration limits** (to keep it a data app, not a scrapbook):
- At most 3 tapes and 1 sticky note per screen.
- One ✦ doodle per screen.
- No decoration inside data (charts, lists, numbers).

---

## 4. Using it in the Next.js app

Same steps as v1 §10, plus:
1. Fonts via `next/font/google`: `Shantell_Sans`, `Patrick_Hand`, `Caveat` → `--font-display`, `--font-sans`, `--font-hand`.
2. Import `notebook.css` **after** the component styles (it only overrides materials).
3. Optional: since v1 and v2 share the same colour tokens and components, the app could offer **Settings → Look: Clean (v1) / Notebook (v2)** by switching one stylesheet and the font variables.
