# Mobile Kotlin Build Repair

## Root Cause

The installed toolchain is Expo SDK `52.0.49`, React Native `0.76.5`, and `expo-modules-core` `2.2.3`. Expo SDK 52 recommends `expo-build-properties ~0.13.3`, which supports setting `android.kotlinVersion`.

React Native's Gradle version catalog pins Kotlin Gradle Plugin `1.9.24`. Expo Modules Core selects Compose Compiler `1.5.15` for Kotlin `1.9.25`. The generated app Gradle file used an unversioned Kotlin plugin classpath, allowing React Native's `1.9.24` selection to conflict with the `1.9.25` Kotlin property used by Expo Modules Core. This produced the reported Compose compatibility error.

The supported fix is the SDK-matched `expo-build-properties` plugin configured with Kotlin `1.9.25`. It writes `android.kotlinVersion=1.9.25` and pins the root Kotlin Gradle plugin classpath to that same value. No generated Android Gradle files are maintained or patched.

## Files Changed

- `apps/mobile/app.json`: configure `expo-build-properties` with Android Kotlin `1.9.25`.
- `apps/mobile/package.json`: add the SDK-compatible `expo-build-properties ~0.13.3` dependency; retain `main: index.js` and `eas-build-post-install`.
- `package-lock.json`: lock the plugin and its dependencies.
- `apps/mobile/eas.json`: set `NODE_ENV=production` for preview and production builds.
- `docs/development/mobile-kotlin-build-repair.md`: this report.

Expo recommends React Native `0.76.9` for this SDK, while this project currently uses `0.76.5`; no Expo, React Native, Gradle, Android Gradle Plugin, or Compose dependency upgrade was made.

## Validation

- `npx expo config --type public --json`: passed and resolved Kotlin `1.9.25`.
- `npx expo prebuild --platform android --no-install --clean`: passed. Generated `android/gradle.properties` contains `android.kotlinVersion=1.9.25`; generated root `build.gradle` uses `$kotlinVersion` for the Kotlin plugin classpath.
- Gradle root `buildEnvironment`: resolved `kotlin-gradle-plugin:1.9.24 -> 1.9.25`.
- `:expo-modules-core:compileReleaseKotlin`: passed locally with the corrected Kotlin version.
- Android JS bundle via `expo export:embed`: passed; Metro bundled `apps/mobile/index.js` and 611 modules.
- `npm run eas-build-post-install`: passed for all four shared workspace packages.
- Mobile `npm run typecheck`: passed.
- Repair-file `git diff --check`: passed. Repository-wide `git diff --check` still reports trailing blank lines in unrelated, pre-existing edits to database, types, and validators source files; those files were left untouched.

A full local `:app:assembleRelease` did not complete: Gradle's bundled Metro invocation resolved `./index.js` from the monorepo root instead of `apps/mobile/index.js`. This is separate from the Kotlin compiler failure; the exact previously failing Expo Modules Core Kotlin task passed. Therefore this report does not claim that a complete local release APK/AAB build passed.

## NODE_ENV Warning

The local environment initially had no `NODE_ENV`. Gradle's `createExpoConfig` task then warned that Expo would proceed without mode-specific `.env` loading; it continued and the warning disappeared when Gradle ran with `NODE_ENV=production`. Preview and production EAS profiles now set that value. This warning is separate from the fatal Kotlin/Compose version mismatch.

No EAS cloud build was started. The cloud build remains unverified until the next requested EAS run.
