# Kala: project status and roadmap

*Last updated 14 Oct 2026. Read this first, then `design-system/kala/MASTER.md` (the design spec, sections 1 to 14).*

Kala ("Kala: kala ko tapos na", Filipino for "I thought it was done") is an **offline-first life planner** for work, study, fitness and daily routines, with a koala companion named Kala. Expo / React Native, TypeScript, SQLite on the device. **No server, no account.** Backup will be a manual JSON export.

---

## 1. Run it

```bash
npm install
npx expo start            # then open in Expo Go (Android emulator or phone)
npm run typecheck && npx expo lint && npm test      # all three must stay clean
npm run db:generate       # after editing src/db/schema.ts. Commit the new files in drizzle/
```

**Android emulator (Windows).** A Pixel 3a virtual device `Kala_Pixel_3a` exists in `%USERPROFILE%\.android\avd`. `ANDROID_HOME` is not set globally, so set it per shell:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"; $env:ANDROID_HOME = $sdk; $env:PATH = "$sdk\platform-tools;$env:PATH"
& "$sdk\emulator\emulator.exe" -avd Kala_Pixel_3a      # leave running
npx expo start --android                                 # other terminal, project folder
```

- Expo Go 57.0.9 is installed on the emulator. If `expo start --android` stalls on "Fetching Expo Go" (it did, from a slow connection), download the APK from `github.com/expo/expo-go-releases` in parallel byte ranges (`curl -r start-end`), join the parts, and `adb install -r` it.
- There is **no Java** on this PC, so a local native build is not possible yet (see 4.5).
- Screenshots for checking UI: `adb exec-out screencap -p > shot.png`, then view the file. Taps: `adb shell input tap x y` (the emulator is 1080x2220).

---

## 2. What is built and working

Everything below was exercised on the emulator unless marked otherwise. **111 tests**, `tsc` and `expo lint` all pass.

| Feature | Where | Notes |
|---|---|---|
| **Design system + mascot** | `design-system/kala/` (`MASTER.md`, `mockups.html`, `mascot.html`) | Tokens mirrored in `src/theme/tokens.ts`. Light and dark themes switch automatically (dark mode is covered by token tests but not yet looked at on a device). |
| **Kala the koala** | `src/components/kala/` | One `<Kala pose size domain />` in `react-native-svg`, 9 poses. Props take the domain color. |
| **Local database** | `src/db/` | expo-sqlite + Drizzle. 11 tables. Migrations run at launch. UUID ids. Default domains seeded once. `settings` is a key/value JSON table. |
| **Tasks** | `src/features/tasks`, `src/db/repos/tasks.ts`, `app/(tabs)/tasks.tsx`, `app/task/[id].tsx` | Domain, energy, due date (quick chips), time estimate, notes. Soft delete (archive). |
| **Today screen** | `app/(tabs)/today.tsx` | Kala greeting, "Kala ko tapos na?" overdue card (one task at a time), energy filter, to-do, done today, habit strip. |
| **Focus Mode (hide domains)** | `src/features/focus/`, `app/focus-mode.tsx` | Presets (Gym time, Study block, Weekend) or hide domains individually. Applies to tasks and habits. |
| **Habits** | `src/features/habits`, `app/(tabs)/habits.tsx`, `app/habit/[id].tsx` | Yes/no and count habits, week dots, streaks that respect rest days, reminders. |
| **Activity grid** | `src/features/activity`, `src/components/activity-heatmap.tsx`, `app/(tabs)/insights.tsx` | GitHub-style grid on Insights, per-domain filter, streaks. Counts finished tasks, habits that reached their goal, **completed** focus sessions and finished workouts (the workout query exists; there is no workout UI yet). |
| **Focus timer (pomodoro)** | `src/features/focus-timer`, `app/focus/[taskId].tsx`, `src/components/timer-*.tsx` | Timestamp-based, survives backgrounding/restart (state lives in `settings.activeTimer`). Pause, resume, break, rounds, mini pill on every tab, keeps screen awake. |
| **Companion copy** | `src/features/companion/copy.ts` | All of Kala's lines, Taglish or English, Chatty/Quiet/Off. Every line has a test. |
| **Test setup** | `src/test/make-db.ts` | Real in-memory SQLite (better-sqlite3) with the app's migrations, so repos and queries are tested against real SQL. |

---

## 3. What is left, in suggested order

Specs for most of these already exist in `MASTER.md` (section numbers in brackets). The tables that 3.1 and 3.2 need already exist in the schema.

### 3.1 Quick-note inbox + capture sheet  [spec 7.7]
- `notes` table exists (`body`, `domainId`, `processed`, `convertedTaskId`). No UI.
- Today's header should get an **Inbox** icon with a count badge, and a **Settings** gear (the header currently only has the Focus Mode chip).
- Design: the + button on every tab opens one **Capture sheet** with Note / Task / Log segments (Note first, keyboard up). Today each tab's + button opens the task or habit editor directly. Decide whether to switch to the sheet everywhere.
- Inbox screen: list unprocessed notes, "Turn into task" (prefilled editor) or "Archive".

### 3.2 Fitness: workout templates, sessions, rest timer  [spec 7.5]
- The **Fitness tab is a "Coming soon" placeholder.** Tables exist: `workout_templates`, `template_exercises`, `workout_sessions`, `workout_sets`.
- Build templates (exercise, sets, reps, weight, rest seconds). Starting a session copies the template into `workout_sets`. Checking a set starts a **rest timer** (reuse the pure functions in `src/features/focus-timer/timer.ts`; consider generalising the active-timer setting). Show last session's numbers beside each exercise. Finish gives a summary (duration, volume, PRs) and records to the Health domain.
- `workoutsQuery` in `src/db/queries.ts` already feeds the activity grid for sessions with an `endedAt`.
- The Kala `gym` pose exists and is unused so far.

### 3.3 Life balance radar  [spec 7.6]
- Insights shows a "Life balance is coming" placeholder under the grid.
- Plan: `src/features/insights/radar.ts`. For the chosen week (Monday start) compute per domain minutes (completed focus sessions + workout durations + estimates of finished tasks) and completion rate (tasks done / due + habit hit-rate), normalise, draw a radar with `react-native-svg`. This week solid, last week dashed, week picker, **a table underneath as the accessible fallback**, and a one-line plain summary on top.

### 3.4 Backup export / import
- Packages are installed (`expo-file-system`, `expo-sharing`, `expo-document-picker`). Nothing is written yet.
- Export every table to `{ schemaVersion, exportedAt, data }` JSON, write to the cache dir, open the share sheet. Import: pick file, validate the version, confirm "replace all data", then wipe and insert **in one transaction**. Skip transient settings such as `activeTimer`. Test the round trip with `make-db.ts` (seed, export, wipe, import, deep-equal).

### 3.5 Settings screen (reachable from the Today header)
- **Companion:** Chatty / Quiet / Off and Taglish / English. These settings already exist (`companion`, `language`, defaulting to Chatty and Taglish), and every screen reads them, but **there is no UI to change them.**
- **Domains:** add, rename, recolor, reorder, hide custom domains. The schema supports custom hex colors (`theme.custom` has 4 starter colors) and an icon name, but `DomainIcon` only knows 5 icons and needs a picker.
- Pomodoro lengths (currently picked on the timer's ready screen), notification status, Backup entry point, About.

### 3.6 Day Ring on Today  [spec section 2 and 7.1]
- The 24-hour dial (noon at the top) is the design's signature element and **is not built.** Today uses a plain list.
- It needs times: `tasks.scheduledStart` exists in the schema but the task editor has no start-time picker. Decide how blocks get times (task start times, habit reminder times, workout slots) before building. Focus Mode should grey out hidden domains' arcs.

### 3.7 Polish and smaller gaps
- Swipe-to-complete / swipe-to-reschedule on task rows, with the long-press menu as the non-gesture alternative (spec 7.2). Not built.
- Task search. A real calendar date picker (due dates are quick chips only). Editing past days of a habit.
- Overdue card handles tasks only (no "missed habit" card).
- Kala moments not wired: streak milestones (7/30/100), late-night sleepy state, study pose on Study screens, gym pose.
- **App icon and splash are still the Expo placeholders.** The icon design (Kala's face in the four-colour Day Ring) is on `mascot.html`; it needs exporting to PNGs.
- Check on a device: dark mode, Dynamic Type at 200%, TalkBack, a phone with a notch.
- iOS has never been run.

### 3.8 Needs a real build, not Expo Go
- **Habit reminders and the timer's end-of-phase notification cannot run in Expo Go on Android** (see gotchas). The code is written and unit-tested but **never seen firing.** Test in a development build or the installed app.
- Options: EAS cloud build (`npx eas-cli build --profile development`, needs an Expo account), or a local build (needs a JDK 17 and Android SDK command-line tools; this PC has neither).
- Before any release: pick bundle ids (`android.package`, `ios.bundleIdentifier`), real icon/splash, version, and look at the ~70 `npm audit` findings (they appear to be in the template's build tooling).

### 3.9 Later phases (from the original brief, not started)
Auto-reschedule missed items into free blocks · drag-and-drop time-block calendar · spaced-repetition review prompts · XP and skill trees · end-of-day journaling prompt · ambient soundscapes for the timer (`expo-audio`) · optional encrypted cloud backup to the user's own Drive/iCloud · long break after 4 pomodoro rounds.

---

## 4. Decisions already made (don't reopen without a reason)

- **Offline-first, no server.** Reminders are local notifications. Backup is a manual JSON file.
- **Expo SDK 57 + expo-router + TypeScript + Drizzle on expo-sqlite.** Routes live in `src/app/`.
- **Color means domain.** Chrome is neutral ink and fog; saturated color only identifies Work / Study / Health / Life (and custom domains). Domain is never shown by color alone: it always has an icon.
- **Fonts:** Bricolage Grotesque (display, numbers) and Atkinson Hyperlegible Next (text), bundled for offline use.
- **Kala:** neutral grey koala; props take the domain color; never blocks anything; Taglish by default, plain English available; Quiet mode drops the jokes; Off hides Kala. Never guilt-trips. The "kala ko tapos na" joke is about the moment, never the person.
- **Only completed things count as activity:** a count habit needs its goal, a focus session must run to the end, breaks never count.
- **Streaks count scheduled days only;** rest days never break one; today stays pending until it ends.
- **Delete means archive** (soft delete) so history survives.
- **Two different "focus" features, named apart in code:** `src/features/focus` is **Focus Mode** (hide domains); `src/features/focus-timer` is the **pomodoro timer**.

---

## 5. Gotchas we hit (save yourself the time)

1. **`expo-notifications` crashes Expo Go on Android the moment it is imported** (SDK 53+). All use goes through `src/lib/notifications.ts`, which loads it lazily and only where supported (`notificationsSupported`). Never `import ... from 'expo-notifications'` at the top of a file.
2. **The first `Stack.Screen` declared in `src/app/_layout.tsx` is the default route.** `index` and `(tabs)` must stay first or the app opens on a modal.
3. **Typed routes:** `.expo/types` is regenerated by the dev server. A new route file gives `tsc` errors on `pathname: '/new/[id]'` until `npx expo start` has run once.
4. **TypeScript 6 no longer auto-includes `@types`**: `tsconfig.json` sets `"types": ["jest"]`.
5. **React Compiler is on and lint forbids `setState` inside effects.** Derive values instead (see the default-domain logic in `app/task/[id].tsx`).
6. **Status bar:** `expo-status-bar` has no `backgroundColor` in SDK 57. `_layout.tsx` uses React Native's `StatusBar` on Android so Expo Go (not edge-to-edge) doesn't paint it black.
7. **Atkinson Hyperlegible draws a slashed zero** (0 looks like Ø in body text). It's by design for legibility. Swap the body font if the owner dislikes it.
8. **Expo Go shows a floating gear button** (top right) that covers the Focus Mode chip. Dev only.
9. **Tests:** any file inside a `__tests__` folder is run as a test, so put helpers elsewhere (`src/test/`). DB tests need the `/** @jest-environment node */` docblock and `jest.mock('.../ids')` because `expo-crypto` is native and returns nothing under Jest.
10. **Dates are local `'YYYY-MM-DD'` strings. Weekdays are 0 (Mon) to 6 (Sun).** `expo-notifications` weekdays are 1 (Sun) to 7 (Sat); convert with `toExpoWeekday`.
11. **Long shell commands with apostrophes inside heredocs broke bash on this machine.** Use the file tools for multi-line writes.
12. The timer screen shows an extra **1 min** length chip in development only (`__DEV__`) so a full cycle can be tried quickly.

---

## 6. How to add things

- **New table or column:** edit `src/db/schema.ts`, run `npm run db:generate`, commit the new SQL and `drizzle/meta`. Never hand-edit generated SQL. Add a test in `src/db/__tests__/` using `makeDb()`.
- **Business rules go in `src/features/<name>/` as pure functions with tests** (see `habits/logic.ts`, `focus-timer/timer.ts`). Database writes go in `src/db/repos/` or a feature's `actions.ts`. Screens stay thin.
- **Live data on screens:** hooks in `src/db/hooks.ts` (`useTasks`, `useHabits`, `useSettings`, ...) subscribe to SQLite, so screens update when data changes.
- **Style:** read colors and type from `useTheme()` and `src/theme/tokens.ts`, never raw hex. Touch targets 48dp. Visible labels on form fields. Every icon-only control needs an `accessibilityLabel`.
- **Kala's words** always come from `src/features/companion/copy.ts` and take `{ language, mode }`. Add a test for each new line.
- **Before saying a change is done:** `npm run typecheck`, `npx expo lint`, `npm test`, and for UI, look at it on the emulator.

---

## 7. Open questions for the owner

- Should Today get the Day Ring? It means tasks need start times (3.6).
- Should the + button everywhere open the Capture sheet (Note / Task / Log), or keep opening the task or habit editor?
- Keep Atkinson's slashed zero, or change the body font?
- Do the Taglish lines read naturally to a native speaker? They are first drafts.
- Distribution plan: personal APK, Play Store, or TestFlight? That sets bundle ids, the build route and icon work.
