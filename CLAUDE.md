# Kala

Offline-first life planner (Expo SDK 57, React Native, TypeScript, SQLite via Drizzle) with a koala companion. No server.

**Start here:** [docs/STATUS.md](docs/STATUS.md) has what's built, what's left (in order), decisions already made, and gotchas. The design spec is [design-system/kala/MASTER.md](design-system/kala/MASTER.md).

Rules for this project:

- Before declaring anything done, run `npm run typecheck`, `npx expo lint` and `npm test`. All must pass. For UI changes, also look at it on the Android emulator (commands in docs/STATUS.md).
- Use `npx expo install <pkg>` for packages so versions match the SDK. Check https://docs.expo.dev/versions/v57.0.0/ before writing Expo API code; see AGENTS.md.
- Never import `expo-notifications` directly. Go through `src/lib/notifications.ts` (it crashes Expo Go on Android).
- Business rules are pure functions in `src/features/*` with tests. Colors and type come from `useTheme()`; no raw hex in components. Kala's lines live in `src/features/companion/copy.ts`.
- Schema changes: edit `src/db/schema.ts`, then `npm run db:generate` and commit `drizzle/`.
- Only completed things count as activity. Delete means archive. Color means life domain.
