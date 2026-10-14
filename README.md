# Kala: kala ko tapos na

An offline-first life planner for work, study, fitness and daily routines, with a koala friend.
No server and no account. Everything lives in a SQLite database on the phone.

**Picking this project up?** Read [docs/STATUS.md](docs/STATUS.md) for what's built, what's left, and the gotchas.
The design spec is in [design-system/kala/MASTER.md](design-system/kala/MASTER.md).

## Stack

Expo SDK 57 · React Native · TypeScript · Expo Router · expo-sqlite + Drizzle ORM · react-native-svg · Phosphor icons.

## Commands

```bash
npm install
npx expo start          # then press a for Android, or scan the QR code with Expo Go
npm run typecheck
npm test
npm run db:generate     # after editing src/db/schema.ts, generates a new SQL migration in drizzle/
npx expo lint
```

Always add packages with `npx expo install <package>` so versions match the SDK.

## Testing on the Android emulator

A Pixel 3a virtual device called `Kala_Pixel_3a` lives in `%USERPROFILE%\.android\avd`. Start it, then run the app:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME = $sdk
& "$sdk\emulator\emulator.exe" -avd Kala_Pixel_3a       # leave this window running
npx expo start --android                                  # in another terminal, from the project folder
```

Expo Go has to be installed on the emulator once. If `npx expo start --android` stalls on "Fetching Expo Go",
download the APK from the Expo releases page and run
`& "$sdk\platform-tools\adb.exe" install -r Expo-Go-57.0.9.apk`.

## Layout

```
src/app/            Expo Router screens. (tabs)/ holds Today, Tasks, Habits, Fitness, Insights
src/components/     Shared UI. kala/ is the koala mascot (react-native-svg)
src/db/             schema.ts, client.ts, seed.ts, settings.ts
src/theme/          Design tokens and useTheme()
drizzle/            Generated migrations (commit these)
design-system/kala/ Design spec (MASTER.md), screen mockups, mascot sheet
```

Design tokens, type scale, motion and the mascot rules are in `design-system/kala/MASTER.md`.
Preview the mockups by opening `design-system/kala/mockups.html` and `mascot.html` in a browser.

## Data

Migrations run on every launch (`useMigrations` in `src/app/_layout.tsx`). The four default
life domains (Work, Study, Health, Life) are seeded on first launch only.

## License and credits

Kala is released under the [MIT License](LICENSE). It started from the Expo project template (MIT, Expo).

- Fonts: Bricolage Grotesque and Atkinson Hyperlegible Next (SIL Open Font License), installed from npm, not stored in this repo.
- Icons: [Phosphor Icons](https://phosphoricons.com) (MIT).
- The app icon and splash image in `assets/` are still Expo's placeholders and will be replaced with Kala's own.
- The koala mascot is original artwork drawn in code (`src/components/kala/`).
