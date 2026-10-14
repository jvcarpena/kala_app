# Kala: UI/UX design system (MASTER)

The single source of truth for how Kala looks, moves and reads. Per-screen deviations go in `design-system/kala/pages/<screen>.md`. Where a page file exists, it overrides this one.

---

## 1. Brief

| | |
|---|---|
| **Product** | Kala: an offline-first "life OS" for one person's whole day: work, study, fitness, habits and personal routines. |
| **Name** | *Kāla* is Sanskrit for **time**. The design treats time as the material the app is made of. |
| **Audience** | Students and young professionals juggling classes or a job, the gym and daily upkeep. Uses it in short bursts between activities: 5–30 seconds per open, often one-handed, sometimes sweaty or tired. |
| **Primary job** | Answer "what should I do *now*, given my energy and where I am?" in one glance, and make logging it a single tap. |
| **Stack** | Expo / React Native, iOS + Android, fully offline. Fonts and icons are bundled. No network assets. |

### Why I didn't use the generator's default
`ui-ux-pro-max --design-system` returned **Claymorphism + amber on cream + Varela Round**, a style aimed at children's apps and onboarding. It doesn't fit an adult daily-driver tool, and warm cream with an amber/clay accent is one of the most templated looks right now. I kept its useful parts: its note on habit-green and streak-amber semantics, its rounded/friendly mood, and its accessibility checklist. I replaced the rest with the direction below.

---

## 2. Concept: "The day is a dial"

There is **one memorable thing**, and it's the **Day Ring**: a 24-hour dial on the Today screen.
- Each scheduled block (a class, the gym, a deep-work session) is an arc, colored by its life domain.
- A hand marks *now*. The arc segment under the hand is the current block, and the center shows what's next.
- Completed blocks are solid. Upcoming ones are outlined. Missed ones are hatched.
- Focus Mode visibly **greys out** the hidden domains' arcs, so you can *see* the toggle working.

The ring motif repeats only where it carries meaning:
- **Focus timer:** one arc draining clockwise.
- **Rest timer** between sets: a small arc.
- Nothing else is circular. Habits use a 7-dot week row and Insights uses a radar. Everything around the ring is quiet: neutral chrome, flat surfaces, no gradients.

**Principles**
1. **Color means domain.** The UI chrome is ink-and-fog neutral. Saturated color appears *only* to identify Work / Study / Health / Life (and user domains). If something is colored, it belongs to a domain.
2. **One thumb, one tap.** Every logging action (tick a habit, check a set, finish a task) is a single tap within the bottom ⅔ of the screen. Editing is a deliberate second step.
3. **Now over everything.** Each tab opens on the present: today's date, current block, this week. History is a scroll or swipe away, never the landing state.
4. **Calm, not gamey.** Streaks and stats inform, they don't shout. There's no confetti, and success feedback is a haptic tick and a fill.

---

## 3. Color tokens

Semantic tokens only. Components never use raw hex.

### Neutrals
| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#EDF0F3` (fog) | `#0E141B` (night) | App background |
| `surface` | `#FFFFFF` | `#17202A` | Cards, sheets, tab bar |
| `surfaceSunk` | `#E2E7EC` | `#0A0F15` | Inputs, segmented track, ring track |
| `ink` | `#16202B` | `#E7ECF2` | Primary text, icons, primary button fill |
| `inkMuted` | `#566271` | `#9AA6B4` | Secondary text (≥4.5:1 on bg + surface in both themes) |
| `line` | `#D3DAE1` | `#2A3644` | Dividers, outlines |
| `onInk` | `#FFFFFF` | `#0E141B` | Text on primary (ink) buttons |

### Domain colors
Each domain has a `main` (arcs, chips, icons), a `soft` (tinted backgrounds) and an `onSoft` (text on `soft`).
| Domain | main (light / dark) | soft (light / dark) | Glyph (Phosphor) |
|---|---|---|---|
| Work | `#2F5BD9` / `#7C9BFF` | `#E3EAFC` / `#1C2847` | `Briefcase` |
| Study | `#7A45CF` / `#B793F5` | `#EEE6FA` / `#2A1F42` | `BookOpen` |
| Health | `#0E8A63` / `#43D19E` | `#DDF3EA` / `#133528` | `Barbell` |
| Life | `#D2512B` / `#FF8A63` | `#FBE6DE` / `#3A2018` | `House` |
| Custom 1–4 | `#0E7C99`, `#B0367A`, `#8A6A00`, `#4F5D6B` | (generated at 12% on bg) | user-picked |

**Colorblind safety:** every domain is paired with a glyph wherever it appears in a list or chip. Ring arcs get a glyph at their midpoint when the arc is ≥20° long. Domain is never shown by color alone.

### Status colors
| Token | Light | Dark | Use |
|---|---|---|---|
| `streak` | `#B7791F` | `#F2B84B` | Streak flame count only |
| `success` | uses the **domain** color | | Completion is the item's own domain color filling in |
| `danger` | `#C2362B` | `#FF7A6E` | Delete, destructive confirm |

---

## 4. Typography

All fonts are bundled through `@expo-google-fonts/*`, so they work offline.

| Role | Family | Why |
|---|---|---|
| Display + numerals | **Bricolage Grotesque** (600/700, opsz) | Characterful grotesk with slight ink-trap warmth. Large time readouts (`25:00`, `17:30`) set in it use `fontVariant: ['tabular-nums']`. |
| Text + UI | **Atkinson Hyperlegible Next** (400/500/700) | Designed for legibility at small sizes and for low-vision readers. It suits glance-reading after a workout or late at night. |

**Scale** (pt, mapped to RN `fontSize` with `allowFontScaling` on; caps at 1.6× for the ring center only):
| Style | Size / line | Family / weight |
|---|---|---|
| `timer` | 64 / 68 | Bricolage 600, tabular |
| `display` | 32 / 38 | Bricolage 700 |
| `title` | 22 / 28 | Bricolage 600 |
| `headline` | 17 / 24 | Atkinson 700 |
| `body` | 16 / 24 | Atkinson 400 |
| `label` | 14 / 20 | Atkinson 500 |
| `caption` | 13 / 18 | Atkinson 400 (never smaller) |

Rules: sentence case everywhere, with no all-caps labels and no eyebrow text above headings. Weight carries hierarchy, not color.

---

## 5. Space, shape, elevation, icons

- **Spacing scale (dp):** 4, 8, 12, 16, 24, 32, 48. Screen gutter 16 (20 on ≥400dp width).
- **Radii by hierarchy, not one radius everywhere:**
  - Sheets: 28 (top corners).
  - Cards and list groups: 16.
  - Buttons and inputs: 12.
  - Chips: full pill.
  - Checkboxes: 8.
- **Elevation:** flat by default. Surfaces separate from `bg` by tone, not shadow. Shadows are used only on the floating capture button and on bottom sheets (one token: `0 8 24 rgba(22,32,43,0.16)` in light, none in dark, where a `line` border is used instead).
- **Icons:** `phosphor-react-native`, **Regular** weight for chrome and **Fill** weight only for the *selected* tab and *completed* states. Sizes are 20 / 24 / 28 tokens. Every icon-only control gets `accessibilityLabel` and `hitSlop` to reach 48dp.

---

## 6. Information architecture

```
Bottom tabs (5, icon + label)
├─ Today      Day Ring · Now/Next card · Up next list · Habit strip      (header: date · Focus chip · Inbox badge · Settings)
├─ Tasks      Grouped by domain · energy filter · search
├─ Habits     Today's habits · week dots · streaks
├─ Fitness    Templates · last session · start workout
└─ Insights   Life balance radar · weekly table · trends

Global
├─ Capture button (floating, bottom-right above tab bar, every tab) → Capture sheet: Note | Task | Log
├─ Focus timer (full screen, from a task or Today's Now card)
├─ Workout session (full screen, keeps the tab bar hidden; minimises to a pill)
├─ Inbox (from Today header badge)
└─ Settings (domains, Focus Mode presets, pomodoro lengths, notifications, Backup)
```

- Settings sits behind the Today header, not in a tab, keeping tabs to ≤5 top-level destinations.
- Full-screen flows (timer, workout) leave behind a **persistent mini-pill** above the tab bar while running, so you can browse and return.
- Every screen is deep-linkable (`kala://focus/<taskId>`, `kala://habit/<id>`), so local notifications open the right place.

---

## 7. Screen specs

### 7.1 Today
```
┌───────────────────────────────┐
│ Tue 14 Oct        [Focus: Off▾] [✉3] [⚙] │
│                               │
│        ╭───── 24h ring ─────╮  │
│       ╱  ▓Work   ░Study      ╲ │
│      │      Now · Deep work   ││
│      │      until 11:30       ││
│       ╲  ▒Gym 17:30          ╱ │
│        ╰────────────────────╯  │
│  ┌ Now ───────────────────┐   │
│  │ ■ Finish API spec       │   │
│  │   Work · High · 50 min  │   │
│  │   [Start focus]  [Done] │   │
│  └─────────────────────────┘   │
│  Energy  [Any][Low][Med][High] │
│  Up next                       │
│  ○ Read ch. 3   Study · Med    │
│  ○ Groceries    Life · Low     │
│  Habits today  ● ● ○ ○         │
│                          (+)   │
├───────────────────────────────┤
│ Today Tasks Habits Fitness Insights │
└───────────────────────────────┘
```
- **Ring:** 24h, **noon at the top** (sundial orientation, so waking hours fill the upper arc). Night hours (from settings) are drawn as a thin `surfaceSunk` band. Tapping an arc opens that item. A list below mirrors the ring for screen readers (the ring itself has `accessibilityLabel` summarising: "5 of 9 blocks done, now Deep work until 11:30").
- **Now card:** the one primary action on the screen, `Start focus` (ink button). `Done` is secondary.
- **Energy filter:** a segmented control with battery glyphs (`BatteryLow/Medium/Full`). It filters *Up next* only, never hides the ring.
- **Focus chip:** tapping opens a sheet of presets ("Gym time", "Study block", "Weekend") and per-domain switches. When it's active, the chip shows the preset name and hidden domains' arcs turn `line`-grey.

### 7.2 Tasks
Sections per domain (collapsible, with a count). Each row has a check circle (48dp target), title, then a meta line `Domain · Energy · due`. Swipe right completes and swipe left reschedules, and both actions are also in the row's long-press menu (gesture alternative). Empty state: "No tasks in Study. Add one with the + button, or capture a note and turn it into a task later."

### 7.3 Habits
Each row has: glyph in domain `soft` · name · 7 dots (Mon–Sun, filled = done, ring = scheduled, faint = unscheduled) · streak counter using the Phosphor `Flame` icon + number in `streak` color (no emoji).
- **Check habits:** tap the row to toggle.
- **Count habits** (water 2/8): tap +1, long-press opens a number pad.
- Success gives a light haptic and the dot fills. There's no modal.

### 7.4 Focus timer
Full screen in the task's domain `soft` background:
- One large draining arc, with `25:00` in `timer` style in the center.
- Below the arc: the task name, then *Pause* (primary) and *End* (secondary).
- The sound picker is deferred.
- The screen stays awake. Leaving the app keeps the timer running (timestamp-based) and a local notification fires at the end.

### 7.5 Fitness / workout session
- **Templates:** list of templates with last-done date.
- **Session:** exercises as cards, with set rows `Set 1 · 8 × 60 kg [✓]`. Weight and reps use a numeric keypad with steppers (±2.5 kg, ±1 rep).
- **Rest timer:** checking a set starts it, shown as a compact arc docked at the bottom with `+30s` / `Skip`.
- **Finish:** *Finish workout* (primary) shows a summary sheet with duration, volume and PRs.

### 7.6 Insights
- **Week picker** at the top (`‹ This week ›`).
- **Radar chart:** one polygon per week (this week solid, last week dashed outline). It shows ≥4 axes, one per domain, and axis labels carry glyph + name + value.
- **Table below the radar:** domain · minutes · completion % (sortable). This doubles as the accessible fallback.
- A one-sentence summary on top, generated locally ("Health up 40 min on last week, Study down 25%").

### 7.7 Capture sheet (from the + button)
- Bottom sheet with three segments: **Note** (default) · Task · Log.
- The note field is autofocused, and *Save* is enabled when it's non-empty.
- **Task** adds domain chips, energy and a due date.
- **Log** shows today's quick logs: habits, water, weight.
- Swipe down or tap *Cancel* to dismiss. A non-empty draft asks before discarding.

---

## 8. Motion & feedback

| Moment | Motion | Haptic |
|---|---|---|
| Complete task/habit/set (**signature**) | Check fills, then the matching ring arc or dot fills clockwise (220 ms, ease-out) | `Light` impact |
| Timer ends | Arc completes, background cross-fades to surface | `Success` notification |
| Open sheet | Slide up from bottom with a spring (damping 20) | none |
| Close sheet | Slide down (150 ms) | none |
| Toggle Focus Mode | Hidden arcs desaturate (180 ms) | `Selection` |
| Delete | Row collapses + "Deleted · Undo" snackbar (5 s) | `Warning` |

- With **reduced motion** on, all fills and slides become instant opacity changes. Haptics remain.
- There are no entrance animations on screen load and no staggered lists.

---

## 9. Copy voice
- Plain verbs, sentence case, second person when needed: "Start focus", "Log water", "Move to tomorrow".
- An action keeps its name through the flow: *Finish workout* → toast "Workout finished".
- Empty states point at the next action, and errors say what happened and how to fix it ("Couldn't read this backup file. Pick a file exported from Kala (.json).").
- Nothing in the copy talks about "productivity". It talks about your day.

---

## 10. Accessibility checklist (apply on every screen)
- Text contrast ≥4.5:1 in both themes. Arcs and controls ≥3:1 against `surfaceSunk`.
- Touch targets ≥48dp (Android) / 44pt (iOS), with ≥8dp between them.
- Dynamic Type supported to 200%. Rows wrap, they never truncate titles to 1 line.
- Every swipe has a menu alternative, and the ring has a list equivalent.
- Screen-reader order matches visual order. States (selected, checked, expanded) are announced.
- Safe areas are respected, and the scroll content has bottom inset for the tab bar, capture button and mini-pill.

---

## 11. Mascot: Kala the koala

The full sheet is in [mascot.html](mascot.html): poses, in-app placements, app icon, voice lines and rules.

- **Who:** Kala, a koala. Drop the "o" from *koala* and you get *Kala*. The app's full name is **"Kala: kala ko tapos na"** (Filipino for "I thought it was done"), the joke for every time you were sure you'd finished something.
- **Role:** a companion that reacts to what you do. It's never a gate, a nag or a modal.
- **Look:** neutral grey fur (`fur #97A3AF`, `furShade #7F8C99`, `fluff #EEF1F4`, `nose #26303B`, `blush #F0A69C`), flat shapes, no outlines. **Props take the current domain's color** (Work headband, Study book, Health barbell), which keeps the "color means domain" rule.
- **Build:** one `<Kala pose="hello|yay|oops|focus|study|gym|streak|sleepy|chill" size={…} />` component drawn with `react-native-svg`, with a shared rig and swappable eyes, mouth, arms and props. It's marked `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`, and the speech is always real text beside it.
- **Placements:**
  - Today greeting (64dp avatar + bubble).
  - The "Kala ko tapos na?" card for overdue tasks (with *Move to today* / *Mark done*).
  - Focus timer peek (bottom corner).
  - Empty states (~190dp).
  - The "Tapos na talaga!" toast when the whole day is cleared.
  - Streak milestones (7/30/100).
  - Late-night sleepy state.
- **Limits:**
  - Max one Kala per screen.
  - Single task completions stay a haptic tick, with no mascot.
  - One small bounce on appear, nothing looping, no bounce with reduced motion.
- **Voice:** light Taglish by default, with English available. One short line, kind about forgetting, every oops line paired with a fix.
- **Settings → Companion:** *Chatty* (poses + lines) · *Quiet* (poses only) · *Off*. Language: *Taglish* · *English*.
- **App icon:** Kala's face inside a four-segment Day Ring in the domain colors.

---

## 12. Activity grid (diligence at a glance)

A GitHub-style contribution grid on **Insights**, showing how much the user got done each day.

- **What counts:** everything finished. Tasks marked done, habit logs, completed focus sessions and finished workouts, each on the local day it happened. Archived or un-checked tasks stop counting.
- **Layout:** one square per day, 13dp with 3dp gaps, weeks as columns (Mon at the top, Sun at the bottom), 30 weeks, with this week at the right edge. The grid scrolls horizontally and starts scrolled to today. Month names sit above the first week of each month. Future days draw nothing.
- **Intensity:** 5 levels (empty, then 30 / 52 / 76 / 100% fill), scaled against the user's busiest day, so a quiet user still sees a filled-in grid. Any activity is at least level 1.
- **Color follows the "color means domain" rule:** the default grid is neutral (ink). Tapping a domain chip re-tints the whole grid in that domain's color and counts only that domain.
- **Today and the past:** a big "done today" number up top, then last 7 / last 30 day totals. Tapping any day (the whole grid is the touch target, so the small squares aren't a precision problem) shows "Today · 3 done" or "Tue 14 Oct · nothing logged". The tapped day gets a bold ring and today a thin one.
- **Streaks:** current streak, longest streak, and active days out of the last 30. The current streak survives until the day ends: if today is still empty, yesterday's streak holds.
- **Kala:** from a 2-day streak (Chatty mode only), Kala's streak pose adds a line ("7 days straight! Lodi."). An empty grid says "Finish a task and your first square fills in."
- **Accessibility:** the grid is one image with a spoken summary (7- and 30-day totals, current and longest streak). The stat tiles and the day readout carry the same numbers as text, and the readout is a polite live region.

---

## 13. Habits

- **Row:** left control to log today, centre to edit, streak on the right. Yes/no habits use the same checkbox as tasks, filling with the habit's domain color. **Count habits** (water, pages) use a counter pill showing `6/8`: tap adds one, long-press types an exact amount, and it fills solid once the goal is reached.
- **Week dots (Mon to Sun):** filled = done, ring = scheduled and still to do, dim ring = missed, faint dot = rest day. Today's dot is slightly larger.
- **Streaks count scheduled days only.** Rest days never break a streak or add to it. A missed scheduled day breaks it. Today stays pending until it ends, so a streak never drops to 0 mid-day.
- **Count habits only count as done at their goal.** 7 of 8 glasses is progress, not a streak day, and doesn't fill the activity grid.
- **Lists:** "Today" holds habits scheduled today; "Not scheduled today" holds the rest. Focus Mode hides habits by domain, like tasks. Today shows a compact strip of dots: filled once done.
- **Editor:** name, domain, Done-or-not vs Count (goal + unit), days of the week (Every day / Weekdays presets), and a reminder (Morning 7:00, Noon 12:00, Evening 18:00, Night 21:00).
- **Reminders** are local notifications, one weekly notification per scheduled day. They ask for permission only when you pick a time, and if permission is off the habit still saves and Kala says how to turn it on. Tapping a reminder opens the Habits tab.
- **Delete** archives: the habit leaves your lists but its past activity stays in Insights.

---

## 14. Focus timer

- **Entry:** a play button on every open task row (tinted in the task's domain color) opens the timer for that task. There's one timer at a time; opening another task while one runs shows the running one with a note.
- **Screen:** full screen on the task's domain tint, one big ring that drains clockwise from 12 o'clock, the time in the `timer` style (tabular numerals, never jitters), the task and domain, Kala with a headband in the domain color, and **Pause / End** pinned at the bottom so they're always on screen. Before starting, the ring is full and you pick a focus length (15 / 25 / 50 / 90 min) and a break length (5 / 10 / 15 min).
- **After a focus phase:** Kala cheers ("Tapos na ang focus! Pahinga muna."), with **Start break** (primary), **Mark task done**, and **Done**. A break uses a neutral background, a chill Kala and "Next: round 2". After a break: **Next round** or **Done**.
- **Counts as activity only when a focus phase runs to the end.** Ending early (with a confirmation: "It won't count toward your activity") keeps a record but fills no square. Breaks are never recorded.
- **Real clock, not a tick counter.** The timer stores when it ends, so it stays right through background, lock screen and app restarts. A phase that ran out while the app was closed is finished the next time it opens, stamped with the moment it really ended.
- **Mini pill:** while a timer exists, a pill sits above the tab bar on every tab (`▶ 18:42 · Write project report`, `⏸` when paused, `✓` when finished). Tap to reopen. It sits left of the + button and spans the full width on tabs without one.
- **Alert:** one local notification at the moment a phase ends, so you hear about it with the app in the background. Tapping it opens the timer. Not available in Expo Go on Android, where the timer still works.
- **Keeps the screen on** while a phase is counting down.
- **Accessibility:** the ring is decorative; the time is a `timer` role element with a spoken label ("18 minutes 42 seconds left") that doesn't re-announce every second.
