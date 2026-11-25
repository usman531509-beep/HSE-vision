# Visual HSE — flat "precision instrument" design

All nine Visual HSE screens share one flat, opaque visual language built for a screen people re-read all shift: warm paper surfaces, hairline rules instead of boxes and shadows, one deep-green accent, status as coloured words, and charts built from cells and dots. There is no glass, blur, gradient or texture anywhere.
The content is the pilot sample data from the original `Visual HSE.html`, unchanged.

## Files

| Path | Role |
|---|---|
| `Visual HSE.html` | **The deliverable.** One self-contained file (~170 KB) with all screens, CSS, JS and the Inter font. Works offline. |
| `src/index.html` | Page shell (sidebar, top bar, content slot) |
| `src/styles.css` | Tokens and every component |
| `src/data.js` | All sample data, copied from the original screens |
| `src/app.js` | Router, shell, the nine screen views, interactions |
| `fonts/inter-latin.woff2` | Inter variable font, taken from the original bundle |
| `build.py` | Inlines `src/` and the font into `Visual HSE.html` (`python build.py`) |
| `_backup/Visual HSE.original.html` | The original 13 MB design-board bundle, untouched |

Edit the files in `src/`, then run `python build.py`. Open `src/index.html` directly while developing.

The original file was a design board: eleven separate frames, each running React plus a runtime. It is now a single working app. The sidebar navigates between screens by URL hash (`#control`, `#live`, `#incidents`, `#permits`, `#inspections`, `#actions`, `#compliance`, `#training`, `#reports`), so each screen can be linked to directly.

---

## 1. Principles

1. **Only real data.** Every number, chart and label comes from the source data. Nothing is drawn just to fill space. If a value has no series, it gets no sparkline.
2. **Calm surface, loud exceptions.** Paper and hairlines carry most of the page. Red appears only on things that need action (Act zones, High events, gaps, "Not locked").
3. **One grammar for charts.** Cells and dots everywhere: zone-risk bars, the gauge, the shift matrix, sensor sparks, permit time-left, audit evidence, weekly incidents. The page reads as one system.
4. **Readable first.** Body text is 13–14 px, the floor is 11.5 px, and targets are at least 32 px (44 px for primary controls). Headings are 500–600; all numbers use tabular figures.
5. **The software suggests, a person decides.** Approve / Decline / Approve and file are explicit buttons, and the sign-off text stays visible.

### What was removed in the cleanup ("AI slop")

| Removed | Why |
|---|---|
| Event-flow bubble chart | Its per-slot data was invented. Zone risk (real) now holds that column. |
| Sparkline matrices beside the KPIs | The series were made up. KPIs now show the value and its real note. |
| Fake card details: camera lens, "REC · CAM", brand mark on each card | Ornament imitating a credit card. Card material now encodes severity instead. |
| Sparkle icon, gradient line-art on the Ask card | Generic AI decoration. |
| Sky backdrop, frosted glass, blur, drop shadows | Decoration that lowered contrast and let content bleed through. Replaced by opaque paper and hairlines. |
| Fanned zone cards with conic metal and gold finishes | Overlapping cards hid the data. Replaced by the flat ranked zone strip. |
| Pill chips, icon discs, dark gradient cards | Status is now a coloured word with a dot, icons are bare, and note cards use an accent rule. |
| "Good evening, Muhammad" greeting | Replaced by the page title and the original one-line purpose. |
| Arrow buttons that went nowhere | Every control now does something, or is a clearly labelled prototype action. |
| 8–9 px text and the zoom-to-fit trick | Replaced by real sizes and a responsive layout. |
| A fake answer in "Ask the data" | Submitting now says plainly that answers run in the pilot app. |

## 2. Tokens (`src/styles.css :root`)

**Ink:** `--ink #1b211f`, then the same ink at 75 / 58 / 42 % opacity (`--ink-2`, `--muted`, `--soft`). No separate grey ramp.

**Brand:** `--accent #1f4d3f`, `--accent-2 #163a2f` (hover), `--accent-bg #e3ebe6` (selected rows, current nav item).

**Severity.** This one rule is used everywhere:

| Level | Score | Solid | Background | Ink | Words used |
|---|---|---|---|---|---|
| Act | ≥ 70 | `--act #c8343d` | `--act-bg` | `--act-ink` | Act, High, Gap, Overdue, Not locked, Expired |
| Watch | 40–69 | `--watch #c98412` | `--watch-bg` | `--watch-ink` | Watch, Medium, Partial, Expiring, In progress |
| Low | < 40 | `--low #2f8656` | `--low-bg` | `--low-ink` | Low, Met, Valid, Approved, Running |
| Off | — | `--off #8a8f8b` | `--off-bg` | `--off-ink` | Offline, Locked out, Planned, Scheduled |

Severity always comes with a word, never colour alone.

**Surfaces (all opaque):** `--shell #ecebe5` app background → `--paper #fbfaf7` sidebar and cards → `--sunk #f3f2ed` table heads and hover. Structure comes from 1px `--line #e1dfd7` hairlines. No shadows, no blur, no gradients.

**Accent:** `--accent #1f4d3f` only for primary buttons, the current nav item, selection and note cards. Status colours are never used decoratively.

**Status:** a coloured word with a 6px dot. No pill backgrounds. Icons are bare glyphs with no circle behind them.

**Radius:** card 10 · control 8 · small 6.

**Type:** Inter variable.

| Role | Size / weight |
|---|---|
| H1 | 26px / 500, −0.025em |
| KPI value | 28px / 500, tabular figures |
| Card title | 15px / 600 |
| Body / row title | 13.5–14px / 400–500 |
| Meta | 12.5px |
| Chip, eyebrow, floor | 11.5px / 600 |

Units are muted and smaller (`62 /100`, `2.4 days`, `74 °C`).

## 3. Layout

```
shell ─┬─ sidebar 248 (sticky, full height, hairline right edge): brand · search · 9 screens with counts · zones to act on · Ask the data
       └─ main
            top bar 52 (sticky): screen · site · shift ······ LIVE · bell · avatar
            page head: H1 + purpose ······ screen actions
            (Control room only) ranked zone strip
            KPI strip → cards → footer note
```

Breakpoints:
- **≤ 1280 px:** Control room grid reflows; the actions board goes to 2 columns.
- **≤ 1100 px:** the sidebar becomes an off-canvas drawer (menu button, Esc or scrim to close), the zone strip goes to 3 columns, and two-column layouts stack.
- **≤ 720 px:** everything is a single column, and the site and shift pills hide.

## 4. Screens

| Screen | Contents |
|---|---|
| **Control room** | Range toggle; ranked zone strip (top 5 by score); KPI strip; Zone risk ranked list with 20-cell bars, plus detail and next step; Site risk dot gauge; Risk through the shift (8 h × 10 cells, dashed 70 threshold); Live events with severity filter; See · Decide · Act; Follow-up actions (live from the actions board); Waste & energy; Audit readiness |
| **Live floor** | Camera view with detection boxes and 8-camera picker; floor plan grid; 6 sensor tiles with 12-reading sparks; machines table |
| **Incidents** | KPI strip; filtered list; detail with 4-stage stepper, what happened, likely causes, standards table, sign-off (Approve and file) |
| **Permits & lockout** | KPI strip; requests waiting for approval (Approve / Decline); active permits with checks and time left; lockout board |
| **Inspections** | KPI strip; schedule; live checklist (Pass / Fail / N/A, progress, photo evidence, submit); recent findings |
| **Follow-up actions** | Owner filter; 4-column board with a move-forward button per card; overdue in red |
| **Compliance** | Standard tabs (ISO 45001 / ISO 14001 / OSHA 1910); evidence cells; clause table; missing evidence; Ask compliance answer with references |
| **Training** | Gaps-only toggle; competency matrix (✓ ! ✕ –, each with a text label); needs attention; automatic reminders |
| **Reports** | Weekly incidents vs near-misses (paired cell columns); morning briefing; report library; routine switches |

### The ranked zone strip

The five highest-scoring zones, ranked 1 to 5 from left to right, in one hairline-divided strip. Each tile shows a 3px severity rule along its top edge, then the rank, name, level word, score /100, cause, and a 20-cell bar. All five tiles are the same size and finish; only the colour of the rule and the word changes. Clicking a tile selects that zone in Zone risk.

(This replaces the earlier fanned "credit-card" stack with metallic and gold finishes. Its overlapping cards hid the scores and the texture meant nothing.)

## 5. Interaction and accessibility

- Real `<button>` and `<a>` elements throughout.
- State uses the matching ARIA attribute: `aria-pressed` on toggles and filters, `aria-selected` on tabs, `aria-current` on nav items, `role="switch"` + `aria-checked` on routines.
- Focus is kept on the same control after each re-render, and shown with a 2px accent ring.
- Charts carry `role="img"` with a full text description of their values.
- `prefers-reduced-motion` turns off transitions.
- State is held in memory for the session; reloading resets it. Buttons with no backend (Request a permit, PDF, Book course…) are prototype actions, as they were in the original.
