# Mobile EAS Bundle Repair

## Cause

`apps/mobile/package.json` declared `index.js` as its entry, but that file did not exist. Using Expo's stock `expo/AppEntry` was not suitable in this hoisted monorepo: Metro resolved its `../../App` import from the repository-level `node_modules`, outside `apps/mobile`. The app already has a root `App.tsx`, so a new app-local entry imports it and registers it with Expo. The existing Expo configuration and Metro workspace resolution required no changes.

## Files Changed

- `apps/mobile/index.js`: imports `./App` and calls `registerRootComponent`.
- `docs/development/mobile-eas-build-repair.md`: this report.

## Validation

- `npx expo config --type public --json`: passed.
- `npx expo export:embed --platform android --dev false --bundle-output <temp>/index.android.bundle --assets-dest <temp>/assets`: passed; Metro bundled `apps/mobile/index.js` and 611 modules.
- `npm run typecheck --workspace=apps/mobile`: passed.
- The Android bundle resolved application and shared-workspace imports. No EAS cloud build was started.