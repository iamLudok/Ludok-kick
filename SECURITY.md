# Security Policy

## Supported Versions

Ludok Kick is a personal project. Only the latest release receives security fixes.

| Version | Supported |
|---|---|
| Latest release / `main` | ✅ |
| Older releases | ❌ |

## Reporting a Vulnerability

**Please do not report security problems in a public issue.** Issues are visible to everyone, so
describing a vulnerability there would show anyone how to exploit it before a fix is available.

Report it privately through GitHub instead:

1. Go to the [Security tab](https://github.com/iamLudok/Ludok-kick/security) of this repository
2. Click **Report a vulnerability**
3. Describe the issue, how to reproduce it, and its possible impact

Only the maintainer can see the report. You can expect a first response within a week. Once the
issue is confirmed and fixed, the details are made public and you will be credited, unless you
prefer to stay anonymous.

## Scope

Ludok Kick has no network access, no accounts and no permissions beyond its own storage, so the
attack surface is small. In scope:

- Importing a crafted backup file that corrupts the database, crashes the app or writes outside
  the app's private storage
- Crafted `ludokkick://` links that crash the app or corrupt saved data
- Data stored outside the app's private storage without the user asking for it

Out of scope:

- Cheating your own progress (coins, unlocks): it's a single-player game and the easter egg already
  unlocks everything
- Vulnerabilities in Android, Expo, React Native or other third-party software (report those upstream)
- Problems that require root access or physical access to an unlocked phone
- APKs not downloaded from this repository's Releases page

## Keeping Your Data Safe

- **Install only from [Releases](https://github.com/iamLudok/Ludok-kick/releases).** Updates only install on top of an APK signed with the same key.
- **Only import backups you made yourself.** Importing replaces your current match history.
- **If you build your own APK, keep `release.jks` and `keystore.properties` out of the repo** (they're in `.gitignore`) and back them up: losing them means uninstalling to update, which deletes your progress.
