# Contributing to Ludok Kick

Thanks for your interest in Ludok Kick! It's a personal project, but contributions are welcome.

## Ways to Contribute

- **Code changes**: send a pull request directly. Fixes, balance tweaks, new DJs, abilities or stages are all welcome as PRs.
- **Bugs and ideas**: if you found something that doesn't work, or have an idea but don't want to code it, open a public [issue](https://github.com/iamLudok/Ludok-kick/issues).
- **Security vulnerabilities**: never in a public issue. Report them privately as explained in [SECURITY.md](SECURITY.md).

Before attaching a backup file, logs or screenshots, **remove any personal data** you don't want to
share (notifications in the status bar, other apps, file paths with your name).

## Development Setup

You need Node.js, JDK 17, the Android SDK (API 36) and `adb`, plus an Android phone or emulator.
Expo Go won't work: the app needs a development build.

```bash
git clone https://github.com/iamLudok/Ludok-kick.git
cd Ludok-kick
npm install
npm run android
```

Before opening a PR, make sure both of these pass:

```bash
npm run typecheck
npm run verify
```

To test a release build you'll need your own keystore; see [Build a release APK](README.md#build-a-release-apk).
**Never commit** `release.jks`, `keystore.properties` or the generated `android/` folder.

## Project Conventions

- **Code, comments and the game's interface are in Spanish**; the README and docs are in English.
- Comments explain **why**, not what. If something is done in an unusual way, say what went wrong the usual way.
- No semicolons, single quotes, TypeScript `strict`.
- Follow the Expo SDK 57 docs: <https://docs.expo.dev/versions/v57.0.0/>. APIs have changed between SDK versions.
- **Every gameplay number goes in [`src/game/constants.ts`](src/game/constants.ts)**, with a comment saying what it's for. No magic numbers in the simulation.
- [`src/game/`](src/game) knows nothing about React, Skia or audio. Its functions are `'worklet'` and run on the UI thread, so they mutate state in place and never allocate per frame.
- **The audio clock is the only source of truth for the beat.** Never time music with `setTimeout` or the frame clock.
- The AI uses its seeded random generator ([`src/game/rng.ts`](src/game/rng.ts)), never `Math.random`, so matches can be replayed in tests.
- [`src/lib/db.ts`](src/lib/db.ts) is the **only** file allowed to import `expo-sqlite`. The rest of the logic gets the database from `dbRef.ts`, so it can be tested in Node.
- Colours, spacing and typography for the UI come from [`src/ui/theme.ts`](src/ui/theme.ts).
- Keep dependencies minimal: art is drawn with Skia and music is synthesized, on purpose.

## Adding a DJ

1. Add the DJ to [`src/content/djs.ts`](src/content/djs.ts): name, genre, ability, country and look. Names are parodies: don't use a real artist's name.
2. If it needs a new genre, add it to [`src/content/genres.ts`](src/content/genres.ts). The kick must stay on steps 0, 4, 8 and 12, and the tempo between 120 and 145 BPM.
3. If it needs a new hair style or mask, draw it in [`src/render/characters.ts`](src/render/characters.ts). It must be recognizable at match size.
4. If it needs a new country, add its flag to [`src/ui/Flag.tsx`](src/ui/Flag.tsx).
5. Place it on the ladder in [`src/content/ladder.ts`](src/content/ladder.ts), if it's a rival.
6. Run `npm run verify`: [`verify/characters.ts`](verify/characters.ts) checks that no DJ wins or loses almost always.

## Adding an Ability

1. Add the kind to `PowerKind` in [`src/game/types.ts`](src/game/types.ts) and its numbers to `POWER` in `constants.ts`.
2. Implement it in `usePower` in [`src/game/step.ts`](src/game/step.ts), and tell the AI when to use it in [`src/game/ai.ts`](src/game/ai.ts).
3. Draw its effect in [`src/render/draw.ts`](src/render/draw.ts), give it a sound in [`src/audio/synth.ts`](src/audio/synth.ts) and a name in [`src/ui/labels.ts`](src/ui/labels.ts).
4. Add a check to [`verify/powers.ts`](verify/powers.ts) proving it does what it says.

## Changing the Data Model

Losing progress is the one thing this app must never cause, so schema changes need extra care:

1. Add a new step to `MIGRATIONS` in [`src/lib/schemaSql.ts`](src/lib/schemaSql.ts). Never edit an existing step.
2. Update [`src/lib/schema.ts`](src/lib/schema.ts) (Drizzle), the row mapping in [`src/lib/rows.ts`](src/lib/rows.ts) and the types in [`src/types.ts`](src/types.ts).
3. The backup format only grows: add optional fields, never change or remove existing ones, so old backups still import.
4. Run `npm run verify`: [`verify/migration.ts`](verify/migration.ts) upgrades an old database and checks nothing is lost.

## Pull Requests

- Keep each PR focused on one change.
- Describe what changed and how you tested it. If it touches the game feel, the music or the UI, test it on a real phone with a **release** build: debug builds are much slower.
- Update the README if you change a feature, a DJ, an ability or the backup format.

By contributing, you agree that your code contributions will be licensed under the [MIT License](LICENSE).
