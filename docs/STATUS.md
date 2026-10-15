# Kala: project status and roadmap

*Last updated 14 Oct 2026 (after the quick-note inbox). Read this first, then `design-system/kala/MASTER.md` (the design spec, sections 1 to 14).*

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

- **Easier, in Git Bash:** `bash scripts/run-android.sh` starts the emulator if needed, tunnels port 8081 with `adb reverse` and starts Expo. Without the tunnel Expo hands the emulator your Wi-Fi address, which it often can't reach, and the app hangs on a blank screen (see gotcha 20). Dark mode follows Android's setting: `adb shell cmd uimode night yes` (or `no`).
- Expo Go 57.0.9 is installed on the emulator. If `expo start --android` stalls on "Fetching Expo Go" (it did, from a slow connection), download the APK from `github.com/expo/expo-go-releases` in parallel byte ranges (`curl -r start-end`), join the parts, and `adb install -r` it.
- There is **no Java** on this PC, so a local native build is not possible yet (see 4.5).
- Screenshots for checking UI: `adb exec-out screencap -p > shot.png`, then view the file. Taps: `adb shell input tap x y` (the emulator is 1080x2220).

---

## 2. What is built and working

Everything below was exercised on the emulator unless marked otherwise. **242 tests**, `tsc` and `expo lint` all pass.

| Feature | Where | Notes |
|---|---|---|
| **Design system + mascot** | `design-system/kala/` (`MASTER.md`, `mockups.html`, `mascot.html`) | Tokens mirrored in `src/theme/tokens.ts`. Light and dark themes switch automatically (dark mode is covered by token tests, and Today, Settings and the Domain editor were looked at in dark mode on the emulator and looked right; the other screens were not). |
| **Kala the koala** | `src/components/kala/` | One `<Kala pose size domain />` in `react-native-svg`, 9 poses. Props take the domain color. |
| **Local database** | `src/db/` | expo-sqlite + Drizzle. 11 tables. Migrations run at launch. UUID ids. Default domains seeded once. `settings` is a key/value JSON table. |
| **Tasks** | `src/features/tasks`, `src/db/repos/tasks.ts`, `app/(tabs)/tasks.tsx`, `app/task/[id].tsx` | Domain, energy, due date (quick chips), time estimate, notes. Soft delete (archive). |
| **Today screen** | `app/(tabs)/today.tsx` | Kala greeting, "Kala ko tapos na?" overdue card (one task at a time), energy filter, to-do, done today, habit strip. |
| **Focus Mode (hide domains)** | `src/features/focus/`, `app/focus-mode.tsx` | Presets (Gym time, Study block, Weekend) or hide domains individually. Applies to tasks and habits. |
| **Habits** | `src/features/habits`, `app/(tabs)/habits.tsx`, `app/habit/[id].tsx` | Yes/no and count habits, week dots, streaks that respect rest days, reminders. |
| **Activity grid** | `src/features/activity`, `src/components/activity-heatmap.tsx`, `app/(tabs)/insights.tsx` | GitHub-style grid on Insights, per-domain filter, streaks. Counts finished tasks, habits that reached their goal, **completed** focus sessions and finished workouts. |
| **Focus timer (pomodoro)** | `src/features/focus-timer`, `app/focus/[taskId].tsx`, `src/components/timer-*.tsx` | Timestamp-based, survives backgrounding/restart (state lives in `settings.activeTimer`). Pause, resume, break, rounds, mini pill on every tab, keeps screen awake. |
| **Fitness** | `src/features/fitness`, `src/db/repos/workouts.ts`, `app/(tabs)/fitness.tsx`, `app/workout/template/[id].tsx`, `app/workout/session/[id].tsx`, `src/components/{set-row,rest-dock,workout-pill,workout-engine}.tsx` | Workout templates (starter push/pull/legs, or your own), start a workout from one, log sets (tap weight/reps to edit with a -/+ 2.5 kg stepper, checkbox completes a set and starts that exercise's **rest timer** with +30s / Skip), add or remove sets and exercises, "Last time: 4 × 8 @ 57.5 kg" under each exercise, and each set starts from what you did last time. Finish shows a summary (duration, volume, sets) and **personal records**. One workout at a time; a floating pill and a resume card bring you back. Weights in kg. Counts toward the activity grid under Health. |
| **Capture sheet + Inbox** | `src/app/capture.tsx`, `src/app/inbox.tsx`, `src/components/{inbox-button,domain-chips,segmented}.tsx`, `src/db/repos/notes.ts`, `src/features/notes/logic.ts` | The + on **Today, Tasks and Insights** opens a bottom sheet with **Note** (default, keyboard up) · **Task** (title, domain, energy, due, "More options" opens the full editor) · **Log** (today's habits, same controls as the Habits tab). Habits and Fitness keep their own + editors. Cancel, backdrop tap or Android back with a non-empty draft asks "Discard this?". Today's header has an **Inbox** icon with a count badge. The Inbox lists unprocessed notes: **Turn into task** opens the task editor prefilled (first line is the title, the rest goes to notes) and saving creates the task and marks the note processed **in one transaction**; **Archive** marks it processed with no task. |
| **Settings** | `src/app/settings.tsx`, `src/app/domain/[id].tsx`, `src/db/repos/domains.ts`, `src/features/domains/logic.ts`, `src/components/{swatches,icon-grid,settings-button}.tsx` | A gear in Today's header opens Settings. **Companion:** Chatty / Quiet / Off and Taglish / English with a live preview line. **Life domains:** add, rename, change icon (16) and color (8: the four built-ins plus four custom), move up/down, and **archive**. An archived domain leaves every picker, list and Focus Mode; its open tasks and habits are hidden (the confirm dialog says how many) and come back on **Restore**; its history and activity-grid squares stay. The last active domain can't be archived. The Focus chip on Today shrinks to an icon while Focus Mode is off, to make room in the header. |
| **Backup** | `src/features/backup/{format,io}.ts`, `src/db/repos/backup.ts`, `src/db/schema-version.ts`, Backup section of `src/app/settings.tsx` | **Settings → Export backup** writes every table to `kala-backup-YYYY-MM-DD.json` (cache folder) and opens the share sheet (Drive, email, Files). **Restore from backup** picks a file, checks it, shows what's in it ("From Thu 15 Oct 2026 · 5 domains, 3 tasks, …"), asks "Replace all your data?", then replaces everything **in one transaction**: if any row is rejected nothing changes. A running timer or rest countdown isn't backed up, and is cleared on restore. Older backups import (new columns take their defaults); newer ones are refused; a file with no active domain is refused. Before replacing, the current data is saved to `kala-before-restore.json` in the app's storage (developer recovery only: no screen reads it). Exercised on the emulator: export through the share sheet, a valid restore, a damaged file, a newer-version file, and a file with a broken reference. |
| **Companion copy** | `src/features/companion/copy.ts` | All of Kala's lines, Taglish or English, Chatty/Quiet/Off. Every line has a test. |
| **Test setup** | `src/test/make-db.ts` | Real in-memory SQLite (better-sqlite3) with the app's migrations, so repos and queries are tested against real SQL. |

---

## 3. What is left, in suggested order

Specs for most of these already exist in `MASTER.md` (section numbers in brackets). (The Fitness core and the quick-note inbox are done: see section 2.)

### 3.1 Capture follow-ups (the core is built, see section 2)
- Swipe-down to close the Capture sheet (today: Cancel, backdrop tap or back). A snackbar or toast after saving, and an Undo for Archive: there is no snackbar component yet.
- Log segment has no **weight** entry: there is no body-weight table yet (comes with the Fitness follow-ups in 3.2).
- Notes have no domain and no search. Archived notes are kept in the table but there is no screen to see or restore them.

### 3.2 Fitness follow-ups (the core is built, see section 2)  [spec section 15]
- **Rest-over notification.** The rest timer only buzzes in the app. A local notification when it ends (so it works with the screen off) needs a real build, like 3.8. `WorkoutEngine` is where it would go; copy the pattern in `src/features/focus-timer/alerts.ts`.
- Edit a finished workout (fix a typo in a weight). Delete a past workout.
- Exercise suggestions while typing a name; an exercise library.
- Per-exercise progress chart (top weight over time) and a body-weight log.
- Pounds as a unit option (everything is kilograms today), plate calculator, supersets, notes on a workout.
- The sessions list on the Fitness tab shows the 5 most recent; add a full history screen.

### 3.3 Life balance radar  [spec 7.6]
- Insights shows a "Life balance is coming" placeholder under the grid.
- Plan: `src/features/insights/radar.ts`. For the chosen week (Monday start) compute per domain minutes (completed focus sessions + workout durations + estimates of finished tasks) and completion rate (tasks done / due + habit hit-rate), normalise, draw a radar with `react-native-svg`. This week solid, last week dashed, week picker, **a table underneath as the accessible fallback**, and a one-line plain summary on top.

### 3.4 Backup follow-ups (the core is built, see section 2)
- **Habit reminders after a restore** are cancelled and re-scheduled from the backup, but that can't run in Expo Go on Android, so it is **untested** (needs a real build, 3.8).
- Backup is manual: no reminder to back up, no automatic or cloud backup (3.9), no merging a backup into existing data, no encryption.
- Nothing in the app can open `kala-before-restore.json`; it can only be recovered by pulling the file or importing it with a developer tool. A "Undo last restore" button would use it.
- Backups are compact JSON with every row; a very large history may need a size warning.

### 3.5 Settings follow-ups (Companion and Domains are built, see section 2)
- **Pomodoro lengths** (default focus and break): today they are only picked on the timer's ready screen, so a Settings row would be a second place for the same control.
- **Notifications status** (reminders can't run in Expo Go on Android), **About** (name, version), (the Backup section already exists).
- Drag-to-reorder domains (today: up/down buttons). More than four custom colors, or a free color picker.
- Deleting a domain for good isn't possible by design (archive only).

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
- **Habit reminders and the focus timer's end-of-phase notification cannot run in Expo Go on Android** (see gotchas). The code is written and unit-tested but **never seen firing.** Test in a development build or the installed app. (The workout rest timer has no notification yet at all, see 3.2.)
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
- **Domains are archived, never deleted.** An archived domain is hidden like a Focus Mode domain; its history stays. Custom colors are stored as `custom1` to `custom4` and resolved per theme, so dark mode gets its lighter variant (a raw `#hex` still works but looks the same in both themes).
- **Delete means archive** (soft delete) so history survives. (Workout templates are the exception: deleting one keeps past sessions, which keep their own copy of the sets.)
- **Weights are in kilograms.** A workout only saves the sets you checked off; unchecked ones are dropped on finish. A first time doing an exercise sets a baseline, not a record.
- **The + button is hybrid.** Today, Tasks and Insights open the Capture sheet; Habits and Fitness keep opening their own editors, because a new habit or workout template isn't a quick capture.
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
13. **Lint rejects `Date.now()` during render** (React Compiler purity). In event handlers use `currentTime()` from `src/lib/use-now.ts`; for render logic use the `now` value from `useNow()`.
14. **`createdAt` columns have one-second resolution** (`unixepoch() * 1000`), so rows created in the same second tie. Never rely on `createdAt` alone for ordering. Templates are ordered oldest-first so the starter set stays Push, Pull, Leg.
15. **The emulator keeps its data between runs** (the app's SQLite file survives). That is how a new migration was tested against an existing database. To start clean, clear Expo Go's storage on the emulator.
16. **Scripted `adb input tap` breaks when the layout moves**: dialogs sit in a different place depending on whether the keyboard is up. Take a screenshot between steps and tap from what you see.
17. **The native `formSheet` presentation did not render in Expo Go on Android** (the screen mounted and the keyboard came up, but no sheet was drawn). The Capture sheet is a `transparentModal` route that draws its own backdrop and rounded top, in `src/app/capture.tsx`. Not tested on iOS.
18. **Call `Keyboard.dismiss()` before closing a screen that has the keyboard up.** Saving the Capture sheet with the keyboard open left the Android window short of its full height (white strip under the tab bar) until the app restarted.
19. **DB transactions are synchronous.** Drizzle's expo-sqlite driver runs `db.transaction((tx) => { ...; tx.insert(...).run() })` without `await`, and better-sqlite3 does the same, so one function works in the app and in tests. See `convertNoteToTask`. Throwing inside rolls everything back.
20. **Expo Go on the emulator can hang on a blank screen** when Expo advertises your Wi-Fi address (firewall, VPN). Use `adb reverse tcp:8081 tcp:8081` and open `exp://localhost:8081`; `scripts/run-android.sh` does this by setting `REACT_NATIVE_PACKAGER_HOSTNAME=localhost`. **Don't use `expo start --localhost`**: it binds Metro to localhost only (possibly IPv6), and the tunnel then fails with "unexpected end of stream".
21. **`useDomains()` returns active (non-archived) domains only.** Use `useAllDomains()` when a row must resolve its domain's name or color even if archived (the workout screen, the focus timer), and `useHiddenDomainIds()` (Focus Mode plus archived) wherever a screen filters by hidden domains. Only `focus-mode.tsx` reads the raw `settings.hiddenDomainIds`, so archived ids never get written into it.
22. **Workouts count under `settings.workoutDomainId`**, written by `seedIfEmpty` at launch (the Health domain). It is stored by id so renaming, recoloring or archiving Health can't move workouts to another domain. If it is archived, new workouts fall back to the first active domain.
23. **The emulator keeps Android's dark/light setting between runs**, so a cold boot can come up dark. Android shows a white strip under the tab bar in Expo Go (its navigation bar), in both themes.
24. **Read a picked file with `fetch(uri)`, not `new File(uri).text()`.** In Expo Go on Android the document picker's cache copy lives outside the folders the new `File` API may read, so it fails with "Missing 'READ' permission". Writing the export with `File` and `Paths.cache` works.
25. **`adb root` restarts the device's adb service and drops `adb reverse` tunnels**, so the app suddenly shows "Cannot connect to Expo CLI". Run `adb reverse tcp:8081 tcp:8081` again. (`adb root` works on this emulator and lets you pull the app's files: set `MSYS_NO_PATHCONV=1` in Git Bash so device paths aren't rewritten. Exported files are under `/data/user/0/host.exp.exponent/cache/ExperienceData/…`.)
26. **Android's file picker shows `adb push`ed files under Downloads, not Recent.** Push test backups to `/sdcard/Download/` and open Downloads in the picker's side menu. The picker's file order changes between opens: look before you tap.
27. **A backup's `schemaVersion` is the number of migrations** (`src/db/schema-version.ts`, from the generated journal). When a future migration isn't purely additive (renames or removes a column), add a step to `upgradeBackup()` in `src/features/backup/format.ts`.

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
- Keep Atkinson's slashed zero, or change the body font?
- Do the Taglish lines read naturally to a native speaker? They are first drafts.
- Distribution plan: personal APK, Play Store, or TestFlight? That sets bundle ids, the build route and icon work.
